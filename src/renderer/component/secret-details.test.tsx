// @vitest-environment jsdom

import { readFileSync } from "node:fs";
import { join } from "node:path";
import { Common } from "@freelensapp/extensions";
import { cleanup, render, screen, waitFor } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { parseCertificate } from "../../main/certificate-parser";
import { parseCertificates } from "../certificate-ipc";
import { formatExpireDate, formatIssuer, formatNotBefore, formatSAN, SecretDetails } from "./secret-details";

import type { Renderer } from "@freelensapp/extensions";

// In place of the IPC round trip to main, which has no host to go through here.
vi.mock("../certificate-ipc", () => ({ parseCertificates: vi.fn() }));

const fixtureSecret = readFileSync(join(process.cwd(), "examples/test/secret.yaml"), "utf8");
const fixtureCertificate = fixtureSecret.match(/tls\.crt: ([A-Za-z0-9+/=]+)/)?.[1];

if (!fixtureCertificate) {
  throw new Error("examples/test/secret.yaml does not contain tls.crt fixture data");
}

const fixtureCertificatePem = Buffer.from(fixtureCertificate, "base64").toString("ascii");

function createSecret(data: Record<string, string>) {
  return {
    data,
    getKeys: () => Object.keys(data),
  } as unknown as Renderer.K8sApi.Secret;
}

beforeEach(() => {
  vi.mocked(parseCertificates).mockImplementation(async (certificates) =>
    certificates.map((certificate) => parseCertificate(certificate)),
  );
});

afterEach(() => {
  cleanup();
  vi.clearAllMocks();
});

describe("SecretDetails", () => {
  it("renders certificate details from PEM data stored in a secret", async () => {
    render(<SecretDetails object={createSecret({ "tls.crt": fixtureCertificate })} />);

    expect(await screen.findByText("Certificate Info - tls.crt (1)")).toBeDefined();
    expect(screen.getByText("Subject")).toBeDefined();
    expect(screen.getByText(/CN=CommonNameOrHostname/)).toBeDefined();
    expect(screen.getByText("Key Type")).toBeDefined();
    expect(screen.getByText("RSA4096")).toBeDefined();
    expect(screen.getByText("Serial Number")).toBeDefined();
    expect(screen.getByText("4256758DDFF38243E3FB180234AB9CB98135A117")).toBeDefined();
    expect(screen.getByText("Issuer")).toBeDefined();
    expect(screen.getByText("CommonNameOrHostname")).toBeDefined();
    expect(screen.getByText("(self-signed)")).toBeDefined();
    expect(screen.getByText("Not before")).toBeDefined();
    expect(screen.getByText("Aug 9 07:48:47 2025 GMT")).toBeDefined();
    expect(screen.getByText("Expires")).toBeDefined();
    expect(screen.getByText(/Aug 7 07:48:47 2035 GMT/)).toBeDefined();
    expect(screen.getByText(/\(Expires in \d+ days\)/)).toBeDefined();
  });

  it("renders multiple certificate blocks from one secret key", async () => {
    const certificateChain = Buffer.from(`${fixtureCertificatePem}\n${fixtureCertificatePem}`, "ascii").toString(
      "base64",
    );

    render(<SecretDetails object={createSecret({ "tls.crt": certificateChain })} />);

    expect(await screen.findByText("Certificate Info - tls.crt (1)")).toBeDefined();
    expect(screen.getByText("Certificate Info - tls.crt (2)")).toBeDefined();
    expect(screen.getAllByText("RSA4096")).toHaveLength(2);
  });

  it("sends only the certificate blocks to main, never a private key in the same value", async () => {
    const privateKey = "-----BEGIN PRIVATE KEY-----\nc2VjcmV0\n-----END PRIVATE KEY-----\n";
    const bundle = Buffer.from(`${privateKey}${fixtureCertificatePem}`, "ascii").toString("base64");

    render(<SecretDetails object={createSecret({ "tls.pem": bundle })} />);

    expect(await screen.findByText("Certificate Info - tls.pem (1)")).toBeDefined();

    const [certificates] = vi.mocked(parseCertificates).mock.calls[0];

    expect(certificates).toEqual([fixtureCertificatePem.trim()]);
  });

  it("skips malformed PEM blocks without rendering certificate details", async () => {
    const malformedCertificate = Buffer.from(
      "-----BEGIN CERTIFICATE-----\nnot a certificate\n-----END CERTIFICATE-----\n",
      "ascii",
    ).toString("base64");

    const { container } = render(<SecretDetails object={createSecret({ "tls.crt": malformedCertificate })} />);

    await waitFor(() => expect(Common.logger.error).toHaveBeenCalled());

    expect(container.textContent).toBe("");
  });

  it("logs a failed IPC call without its payload and renders nothing", async () => {
    vi.mocked(parseCertificates).mockRejectedValue(new Error("no handler"));

    const { container } = render(<SecretDetails object={createSecret({ "tls.crt": fixtureCertificate })} />);

    await waitFor(() =>
      expect(Common.logger.error).toHaveBeenCalledWith(
        "[lens-certificate-info]: Error parsing certificates: Error: no handler",
      ),
    );

    expect(container.textContent).toBe("");
  });

  it("does not show the certificates of the previous secret for a new one", async () => {
    const { container, rerender } = render(<SecretDetails object={createSecret({ "tls.crt": fixtureCertificate })} />);

    expect(await screen.findByText("Certificate Info - tls.crt (1)")).toBeDefined();

    rerender(<SecretDetails object={createSecret({ token: "not-base64-certificate-data" })} />);

    expect(container.textContent).toBe("");
  });

  it("ignores the answer for a secret that is no longer shown", async () => {
    let answerFirst: (results: ReturnType<typeof parseCertificate>[]) => void = () => {};

    vi.mocked(parseCertificates).mockReturnValueOnce(new Promise((resolve) => (answerFirst = resolve)));

    const { container, rerender } = render(<SecretDetails object={createSecret({ "tls.crt": fixtureCertificate })} />);

    rerender(<SecretDetails object={createSecret({ "ca.crt": fixtureCertificate })} />);

    expect(await screen.findByText("Certificate Info - ca.crt (1)")).toBeDefined();

    answerFirst([parseCertificate(fixtureCertificatePem)]);
    await new Promise((resolve) => setTimeout(resolve));

    expect(container.textContent).not.toContain("tls.crt");
  });

  it("does not render anything when the secret does not contain certificate data", () => {
    const { container } = render(
      <SecretDetails
        object={createSecret({
          "tls.key": "LS0tLS1CRUdJTiBQUklWQVRFIEtFWS0tLS0t",
          token: "not-base64-certificate-data",
        })}
      />,
    );

    expect(container.textContent).toBe("");
    expect(parseCertificates).not.toHaveBeenCalled();
  });

  it("does not render anything without a secret object", () => {
    const { container } = render(<SecretDetails object={undefined as unknown as Renderer.K8sApi.Secret} />);

    expect(container.textContent).toBe("");
  });
});

describe("formatting", () => {
  it("formats multiple SAN entries on separate lines", () => {
    const { container } = render(<>{formatSAN("DNS:example.com, IP Address:127.0.0.1")}</>);

    expect(container.textContent).toContain("DNS:example.com");
    expect(container.textContent).toContain("IP Address:127.0.0.1");
    expect(container.querySelectorAll("br")).toHaveLength(2);
  });

  it("does not infer self-signed status from matching common names alone", () => {
    const { container } = render(<>{formatIssuer("CN=Example CA", false)}</>);

    expect(container.textContent).toBe("Example CA");
  });

  it("uses explicit validity labels for expired and future certificates", () => {
    const expired = new Date(Date.now() - 2 * 24 * 60 * 60 * 1000).toUTCString();
    const notBefore = new Date(Date.now() + 2 * 24 * 60 * 60 * 1000).toUTCString();

    const { rerender } = render(<>{formatExpireDate(expired)}</>);
    expect(screen.getByText(/\(Expired \d+ days ago\)/)).toBeDefined();

    rerender(<>{formatNotBefore(notBefore)}</>);
    expect(screen.getByText(/\(Not valid yet, starts in \d+ days\)/)).toBeDefined();
  });
});
