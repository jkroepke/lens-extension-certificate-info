import { X509Certificate } from "node:crypto";
import { Common } from "@freelensapp/extensions";

import type { CertificateInfo } from "../common/certificate";

function getKeyType(cert: X509Certificate): string {
  try {
    const publicKey = cert.publicKey;
    const keyDetails = publicKey.asymmetricKeyDetails;

    if (publicKey.asymmetricKeyType === "rsa") {
      const keySize = keyDetails?.modulusLength || "unknown";
      return `RSA${keySize}`;
    } else if (publicKey.asymmetricKeyType === "ec") {
      const namedCurve = keyDetails?.namedCurve || "unknown";
      return `EC (${namedCurve})`;
    } else if (publicKey.asymmetricKeyType === "ed25519") {
      return "Ed25519";
    } else if (publicKey.asymmetricKeyType === "ed448") {
      return "Ed448";
    } else {
      return publicKey.asymmetricKeyType || "Unknown";
    }
  } catch (error) {
    Common.logger.error(`[lens-certificate-info]: Error extracting key type: ${error}`);
    return "Unknown";
  }
}

function isSelfSigned(cert: X509Certificate): boolean {
  if (cert.issuer !== cert.subject) {
    return false;
  }

  try {
    return cert.verify(cert.publicKey);
  } catch (error) {
    Common.logger.error(`[lens-certificate-info]: Error verifying certificate signature: ${error}`);
    return false;
  }
}

export function parseCertificate(certificateString: string): CertificateInfo | null {
  try {
    const cert = new X509Certificate(certificateString);

    // Get SAN (Subject Alternative Names)
    const san = cert.subjectAltName;

    return {
      subject: cert.subject,
      issuer: cert.issuer,
      subjectAltName: san,
      serialNumber: cert.serialNumber,
      validFrom: cert.validFrom,
      validTo: cert.validTo,
      keyType: getKeyType(cert),
      selfSigned: isSelfSigned(cert),
    };
  } catch (error) {
    Common.logger.error(`[lens-certificate-info]: Error parsing certificate: ${error}`);
    return null;
  }
}
