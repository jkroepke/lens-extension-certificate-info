import { Common, Renderer } from "@freelensapp/extensions";
import React from "react";
import { parseCertificates } from "../certificate-ipc";

import type { CertificateInfo } from "../../common/certificate";

type SecretDetailsProps = Renderer.Component.KubeObjectDetailsProps<Renderer.K8sApi.Secret>;

type CertificateBlock = {
  key: string;
  index: number;
  pem: string;
};

type ParsedCertificate = {
  key: string;
  index: number;
  info: CertificateInfo;
};

function daysBetween(date: Date, now = new Date()): number {
  return Math.ceil((date.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));
}

export function formatExpireDate(dateString: string) {
  const date = new Date(dateString);
  const now = new Date();
  const color = now > date ? "red" : undefined;
  const diffInDays = daysBetween(date, now);
  const validityText = diffInDays < 0 ? `Expired ${Math.abs(diffInDays)} days ago` : `Expires in ${diffInDays} days`;

  return (
    <span style={{ color }}>
      {dateString} <i>({validityText})</i>
    </span>
  );
}

export function formatNotBefore(dateString: string) {
  const date = new Date(dateString);
  const now = new Date();
  const diffInDays = daysBetween(date, now);

  if (diffInDays <= 0) {
    return dateString;
  }

  return (
    <span style={{ color: "red" }}>
      {dateString} <i>(Not valid yet, starts in {diffInDays} days)</i>
    </span>
  );
}

export function formatSAN(subjectAltName: string | undefined) {
  return subjectAltName?.split(/, /).map((s, i) => (
    <React.Fragment key={`${s}-${i}`}>
      {s}
      <br />
    </React.Fragment>
  ));
}

function extractCN(distinguishedName: string): string | undefined {
  if (typeof distinguishedName === "undefined") {
    return undefined;
  }

  // Use regex for more efficient CN extraction
  const cnMatch = distinguishedName.match(/CN=([^,\n]+)/);
  return cnMatch ? cnMatch[1].trim() : distinguishedName;
}

export function formatIssuer(issuer: string, selfSigned: boolean) {
  const issuerCN = extractCN(issuer);

  if (typeof issuerCN === "undefined") {
    return (
      <React.Fragment>
        <i>No issuer</i>
      </React.Fragment>
    );
  }

  if (selfSigned) {
    return (
      <React.Fragment>
        {issuerCN} <i>(self-signed)</i>
      </React.Fragment>
    );
  }

  return <React.Fragment>{issuerCN}</React.Fragment>;
}

function extractCertificatesFromPEM(pemString: string): string[] {
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

// Only the certificate blocks leave the renderer: a Secret value may hold a
// private key next to its certificate.
function extractCertificateBlocks(secret: Renderer.K8sApi.Secret): CertificateBlock[] {
  const secretData = secret.data;
  const blocks: CertificateBlock[] = [];

  for (const key of secret.getKeys()) {
    if (!secretData[key] || !secretData[key].startsWith("LS0tLS1CRUdJTi")) {
      // The key does not contain a valid PEM certificate header
      continue;
    }

    extractCertificatesFromPEM(atob(secretData[key])).forEach((pem, index) => {
      blocks.push({ key, index, pem });
    });
  }

  return blocks;
}

export function SecretDetails({ object }: SecretDetailsProps) {
  const [parsed, setParsed] = React.useState<{ object: Renderer.K8sApi.Secret; certificates: ParsedCertificate[] }>();

  React.useEffect(() => {
    if (!object || !object.data) {
      return;
    }

    const blocks = extractCertificateBlocks(object);

    if (blocks.length === 0) {
      return;
    }

    let stale = false;

    parseCertificates(blocks.map(({ pem }) => pem))
      .then((results) => {
        if (stale) {
          return;
        }

        const certificates = blocks.flatMap(({ key, index }, i) => {
          const info = results[i];

          return info ? [{ key, index, info }] : [];
        });

        setParsed({ object, certificates });
      })
      .catch((error) => {
        Common.logger.error(`[lens-certificate-info]: Error parsing certificates: ${error}`);
      });

    return () => {
      stale = true;
    };
  }, [object]);

  // The host passes a new object when it changes or another Secret is opened.
  if (!parsed || parsed.object !== object) {
    return null;
  }

  return (
    <div>
      {parsed.certificates.map(({ key, index, info: cert }) => (
        <div key={`${key}-${index}`}>
          <Renderer.Component.DrawerTitle>
            Certificate Info - {key} ({index + 1})
          </Renderer.Component.DrawerTitle>
          <Renderer.Component.DrawerItem name="Subject">{cert.subject}</Renderer.Component.DrawerItem>
          <Renderer.Component.DrawerItem name="SAN">{formatSAN(cert.subjectAltName)}</Renderer.Component.DrawerItem>
          <Renderer.Component.DrawerItem name="Key Type">{cert.keyType}</Renderer.Component.DrawerItem>
          <Renderer.Component.DrawerItem name="Serial Number">{cert.serialNumber}</Renderer.Component.DrawerItem>
          <Renderer.Component.DrawerItem name="Issuer">
            {formatIssuer(cert.issuer, cert.selfSigned)}
          </Renderer.Component.DrawerItem>
          <Renderer.Component.DrawerItem name="Not before">
            {formatNotBefore(cert.validFrom)}
          </Renderer.Component.DrawerItem>
          <Renderer.Component.DrawerItem name="Expires">{formatExpireDate(cert.validTo)}</Renderer.Component.DrawerItem>
        </div>
      ))}
    </div>
  );
}
