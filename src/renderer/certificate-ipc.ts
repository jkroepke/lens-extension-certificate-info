import { Renderer } from "@freelensapp/extensions";
import { parseCertificatesChannel } from "../common/certificate";

import type { CertificateInfo } from "../common/certificate";

export class CertificateIpcRenderer extends Renderer.Ipc {}

// Parsing a certificate needs `crypto.X509Certificate`, which only main has.
export function parseCertificates(certificates: string[]): Promise<(CertificateInfo | null)[]> {
  return CertificateIpcRenderer.getInstance().invoke(parseCertificatesChannel, certificates);
}
