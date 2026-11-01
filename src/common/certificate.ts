// The IPC channel the renderer parses certificates over: it sends PEM certificate
// blocks, and main answers with one `CertificateInfo`, or `null`, for each block.
export const parseCertificatesChannel = "parse-certificates";

export type CertificateInfo = {
  subject: string;
  issuer: string;
  subjectAltName: string | undefined;
  serialNumber: string;
  validFrom: string;
  validTo: string;
  keyType: string;
  selfSigned: boolean;
};
