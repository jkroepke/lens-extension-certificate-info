import { readFileSync } from "node:fs";
import { join } from "node:path";
import { Common } from "@freelensapp/extensions";
import { afterEach, describe, expect, it, vi } from "vitest";
import { parseCertificate } from "./certificate-parser";

const fixtureSecret = readFileSync(join(process.cwd(), "examples/test/secret.yaml"), "utf8");
const fixtureCertificate = fixtureSecret.match(/tls\.crt: ([A-Za-z0-9+/=]+)/)?.[1];

if (!fixtureCertificate) {
  throw new Error("examples/test/secret.yaml does not contain tls.crt fixture data");
}

const fixtureCertificatePem = Buffer.from(fixtureCertificate, "base64").toString("ascii");

afterEach(() => {
  vi.clearAllMocks();
});

describe("parseCertificate", () => {
  it("reads the metadata of a certificate", () => {
    expect(parseCertificate(fixtureCertificatePem)).toMatchObject({
      keyType: "RSA4096",
      selfSigned: true,
      serialNumber: "4256758DDFF38243E3FB180234AB9CB98135A117",
      validFrom: "Aug  9 07:48:47 2025 GMT",
      validTo: "Aug  7 07:48:47 2035 GMT",
    });
  });

  it("returns null for a malformed certificate, and does not log its content", () => {
    const malformed = "-----BEGIN CERTIFICATE-----\nnot a certificate\n-----END CERTIFICATE-----\n";

    expect(parseCertificate(malformed)).toBeNull();
    expect(Common.logger.error).toHaveBeenCalledTimes(1);
    expect(vi.mocked(Common.logger.error).mock.calls[0][0]).not.toContain("not a certificate");
  });
});
