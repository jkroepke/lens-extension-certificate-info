import { Renderer } from "@freelensapp/extensions";
import { SecretDetails } from "./secret-details";

export default class CertificateInfoExtension extends Renderer.LensExtension {
  kubeObjectDetailItems = [
    {
      kind: "Secret",
      apiVersions: ["v1"],
      priority: 10,
      components: {
        Details: (props: Renderer.Component.KubeObjectDetailsProps<Renderer.K8sApi.Secret>) => (
          <SecretDetails {...props} />
        )
      }
    }
  ];
}
