import { Renderer } from "@freelensapp/extensions";
import { X509Certificate } from "crypto";
import React from "react";

export class SecretDetails extends React.Component<Renderer.Component.KubeObjectDetailsProps<Renderer.K8sApi.Secret>> {
  formatDate(dateString: string) {
    const date = new Date(dateString);
    const now = new Date();
    const color = now > date ? "red" : "";

    const diffInMs = date.getTime() - now.getTime();
    const diffInDays = Math.ceil(diffInMs / (1000 * 60 * 60 * 24));

    return (
      <span color={color}>
        {dateString} <i>(Valid: {diffInDays} days)</i>
      </span>
    );
  }

  formatSAN(subjectaltname: string | undefined) {
    return subjectaltname?.split(/, /).map((s) => (
      <React.Fragment>
        {s}
        <br />
      </React.Fragment>
    ));
  }

  private extractCN(distinguishedName: string): string | undefined {
    if (typoeof distinguishedName === "undefined") {
      return undefined
    }
    
    // Use regex for more efficient CN extraction
    const cnMatch = distinguishedName.match(/CN=([^,\n]+)/);
    return cnMatch ? cnMatch[1].trim() : distinguishedName;
  }

  formatIssuer(issuer: string, subject: string) {
    const issuerCN = this.extractCN(issuer);
    
    if (typoeof issuerCN === "undefined") {
      return (
        <React.Fragment>
          <i>No issuer</i>
        </React.Fragment>
      );
    }

    let selfSigned = issuer === subject;

    if (!selfSigned) {
      // More precise self-signed detection
      selfSigned = this.extractCN(subject) === issuerCN
    }
    
    if (selfSigned)
      return (
        <React.Fragment>
          {issuerCN} <i>(self-signed)</i>
        </React.Fragment>
      );
    }

    return <React.Fragment>{issuerCN}</React.Fragment>;
  }

  extractCertificatesFromPEM(pemString: string): string[] {
    const PEM_CERTIFICATE_HEADER = "-----BEGIN CERTIFICATE-----";
    const PEM_CERTIFICATE_FOOTER = "-----END CERTIFICATE-----";

    const certificates: string[] = [];
    let startIndex = 0;

    while (true) {
      const headerIndex = pemString.indexOf(PEM_CERTIFICATE_HEADER, startIndex);
      if (headerIndex === -1) break;

      const footerIndex = pemString.indexOf(PEM_CERTIFICATE_FOOTER, headerIndex);
      if (footerIndex === -1) break;

      const certificateString = pemString.substring(headerIndex, footerIndex + PEM_CERTIFICATE_FOOTER.length);

      certificates.push(certificateString);
      startIndex = footerIndex + PEM_CERTIFICATE_FOOTER.length;
    }

    return certificates;
  }

  private getKeyType(cert: X509Certificate): string {
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
      console.error("Error extracting key type:", error);
      return "Unknown";
    }
  }

  parseCertificate(certificateString: string) {
    try {
      const cert = new X509Certificate(certificateString);

      // Get SAN (Subject Alternative Names)
      const san = cert.subjectAltName;

      return {
        subject: cert.subject,
        issuer: cert.issuer,
        subjectaltname: san,
        serialNumber: cert.serialNumber,
        valid_from: cert.validFrom,
        valid_to: cert.validTo,
        keyType: this.getKeyType(cert),
      };
    } catch (error) {
      console.error("Error parsing certificate:", error);
      return null;
    }
  }

  render() {
    const { object } = this.props;

    if (!object || !object.data) {
      return;
    }

    const secretKeys = object.getKeys();
    const secretData = object.data;
    const certificates: any[] = [];

    for (const key of secretKeys) {
      if (!secretData[key] || !secretData[key].startsWith("LS0tLS1CRUdJTi")) {
        // The key does not contain a valid PEM certificate header
        continue;
      }

      const secretString = Buffer.from(secretData[key], "base64").toString("ascii");
      const certificateStrings = this.extractCertificatesFromPEM(secretString);

      certificateStrings.forEach((certificateString, i) => {
        const cert = this.parseCertificate(certificateString);

        if (cert) {
          certificates.push(
            <div key={`${key}-${i}`}>
              <Renderer.Component.DrawerTitle>
                Certificate Info - {key} ({i + 1})
              </Renderer.Component.DrawerTitle>
              <Renderer.Component.DrawerItem name="Subject">{cert.subject}</Renderer.Component.DrawerItem>
              <Renderer.Component.DrawerItem name="SAN">
                {this.formatSAN(cert.subjectaltname)}
              </Renderer.Component.DrawerItem>
              <Renderer.Component.DrawerItem name="Key Type">{cert.keyType}</Renderer.Component.DrawerItem>
              <Renderer.Component.DrawerItem name="Serial Number">{cert.serialNumber}</Renderer.Component.DrawerItem>
              <Renderer.Component.DrawerItem name="Issuer">
                {this.formatIssuer(cert.issuer, cert.subject)}
              </Renderer.Component.DrawerItem>
              <Renderer.Component.DrawerItem name="Not before">{cert.valid_from}</Renderer.Component.DrawerItem>
              <Renderer.Component.DrawerItem name="Expires">
                {this.formatDate(cert.valid_to)}
              </Renderer.Component.DrawerItem>
            </div>,
          );
        }
      });
    }

    return <div>{certificates}</div>;
  }
}
