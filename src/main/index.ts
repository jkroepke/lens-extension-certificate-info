import { Main } from "@freelensapp/extensions";
import { parseCertificatesChannel } from "../common/certificate";
import { parseCertificate } from "./certificate-parser";

class CertificateIpcMain extends Main.Ipc {
  constructor(extension: Main.LensExtension) {
    super(extension);
    this.handle(parseCertificatesChannel, (_event, certificates: string[]) =>
      certificates.map((certificate) => parseCertificate(certificate)),
    );
  }
}

export default class CertificateInfoMainExtension extends Main.LensExtension {
  async onActivate() {
    CertificateIpcMain.createInstance(this);
  }
}
