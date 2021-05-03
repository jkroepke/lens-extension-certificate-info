import { LensMainExtension } from "@k8slens/extensions";

export default class ExampleExtensionMain extends LensMainExtension {
  onActivate() {
    console.log('helloworld-sample activated');
  }

  onDeactivate() {
    console.log('helloworld-sample de-activated');
  }
}
