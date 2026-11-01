import { Renderer } from "@freelensapp/extensions";
import { CertificateIpcRenderer } from "./certificate-ipc";
import { withDetailsErrorBoundary } from "./component/error-boundary";
import { SecretDetails } from "./component/secret-details";

export default class CertificateInfoExtensionRenderer extends Renderer.LensExtension {
  async onActivate() {
    CertificateIpcRenderer.createInstance(this);
  }

  kubeObjectDetailItems: Renderer.LensExtension["kubeObjectDetailItems"] = [
    Renderer.K8sApi.detailsFor(Renderer.K8sApi.Secret, { priority: 10, Details: SecretDetails }),
  ].map((registration) => withDetailsErrorBoundary(this, registration));
}
