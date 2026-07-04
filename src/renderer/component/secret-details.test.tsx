// @vitest-environment jsdom

import { readFileSync } from "node:fs";
import { join } from "node:path";
import { cleanup, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it } from "vitest";
import { SecretDetails } from "./secret-details";

import type { Renderer } from "@freelensapp/extensions";

const fixtureSecret = readFileSync(join(process.cwd(), "examples/test/secret.yaml"), "utf8");
const fixtureCertificate = fixtureSecret.match(/tls\.crt: ([A-Za-z0-9+/=]+)/)?.[1];

if (!fixtureCertificate) {
  throw new Error("examples/test/secret.yaml does not contain tls.crt fixture data");
}

function createSecret(data: Record<string, string>) {
  return {
    data,
    getKeys: () => Object.keys(data),
  } as Renderer.K8sApi.Secret;
}

afterEach(() => {
  cleanup();
});

describe("SecretDetails", () => {
  it("renders certificate details from PEM data stored in a secret", () => {
    render(<SecretDetails object={createSecret({ "tls.crt": fixtureCertificate })} />);

    expect(screen.getByText("Certificate Info - tls.crt (1)")).toBeDefined();
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
    expect(screen.getByText(/\(Valid: \d+ days\)/)).toBeDefined();
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
  });

  it("does not render anything without a secret object", () => {
    const { container } = render(<SecretDetails object={undefined as unknown as Renderer.K8sApi.Secret} />);

    expect(container.textContent).toBe("");
  });

  it("does not infer self-signed status from matching common names alone", () => {
    const details = new SecretDetails({ object: createSecret({}) });
    const issuer = "CN=Example CA";

    const { container } = render(<>{details.formatIssuer(issuer, false)}</>);

    expect(container.textContent).toBe("Example CA");
  });
});
