import { LensRendererExtension, Component, K8sApi } from "@k8slens/extensions";
import { SecretDetails } from "./src/secret-details"
import React from "react"

export default class CertificateInfoExtension extends LensRendererExtension {
  kubeObjectDetailItems = [
    {
      kind: "Secret",
      apiVersions: ["v1"],
      priority: 10,
      components: {
        Details: (props: Component.KubeObjectDetailsProps<K8sApi.Secret>) => <SecretDetails {...props} />
      }
    }
  ]

  async onActivate() {

  }
}
