# AGENTS.md

## Project Overview

This repository contains `lens-certificate-info`, a Freelens extension that adds certificate metadata to Kubernetes Secret detail views.

When a user opens a `Secret` in Freelens, the renderer extension scans the Secret data keys for base64-encoded PEM certificates, decodes them, and sends the certificate blocks over IPC to the main process. Main parses each certificate with Node.js `crypto.X509Certificate` and returns details such as subject, SANs, issuer, serial number, public key type, validity start, and expiry, which the renderer shows. Expired certificates are highlighted in red, and self-signed certificates are detected by verifying the certificate with its own public key.

The current implementation supports PEM certificate blocks stored in Secret data. The README notes that other formats, such as Java Keystore or PKCS#12, are not supported yet.

This project targets the Freelens v2 extension API, `engines.freelens: ^2.0.0`. Freelens v1 and Lens are not compatible with it: Freelens refuses an extension built for another major version at discovery. The reference for the build, tooling and CI of a v2 extension is [freelensapp/freelens-example-extension](https://github.com/freelensapp/freelens-example-extension); its `AGENTS.md` gives the reason for each setting. The shared config files stay 1:1 with that repository, so that an update is a plain copy: change them there, or sync them with `scripts/update-freelens-example-configs.mjs`, not by hand. That script also applies this repository's app token and auto-merge steps to the workflows. `test/freelens-extensions.ts` is the template's stub plus the members the tests here reach.

## Repository Layout

- `src/main/index.ts` defines the main-process extension class and the IPC handler.
- `src/main/certificate-parser.ts` parses a PEM certificate with `crypto.X509Certificate`.
- `src/common/certificate.ts` has the IPC channel and the `CertificateInfo` type that both processes share.
- `src/renderer/index.tsx` registers renderer-side extension contributions.
- `src/renderer/certificate-ipc.ts` is the renderer side of the IPC channel.
- `src/renderer/component/secret-details.tsx` extracts the PEM blocks and renders the drawer content.
- `src/renderer/component/error-boundary.tsx` and `error-page.tsx` keep an error of the panel inside the panel.
- `test/freelens-extensions.ts` is a Vitest stub for the host-provided `@freelensapp/extensions` runtime API.
- `examples/test/secret.yaml` is the test fixture used by unit and integration tests.
- `vite.config.mjs` builds the main and renderer bundles, one run per entry. The plugins are in `build/`.
- `environment-tests/` proves that each tsconfig has only the APIs of its runtime.
- `integration/` contains Playwright tests that attach to Freelens dev over CDP.

## Freelens Extension API

Freelens extensions are packaged Node/Electron modules. This package declares two compiled entrypoints in `package.json`:

- `main`: `dist/main.js`
- `renderer`: `dist/renderer.js`

The Freelens host loads these entrypoints and expects each one to export a class derived from the appropriate extension base class from `@freelensapp/extensions`. Both are ES modules.

There is no separate `extension.json` manifest. Extension metadata, entrypoints, compatible `engines.freelens`, compatible Node.js version, scripts, and dependencies are handled through `package.json`.

All package dependencies for this extension should be declared in `devDependencies`. Freelens extensions are built and bundled ahead of time and do not load their own `node_modules` at runtime. The host-provided modules are declared at the exact version the Freelens release uses.

### Main Extension

`src/main/index.ts` exports a class extending `Main.LensExtension`. Its `onActivate` creates the `Main.Ipc` singleton, whose constructor registers the handler of `parseCertificatesChannel`. The host resets the singleton and removes the handler when the extension is disabled, so there is no `onDeactivate`.

Main-process code runs in the Node/Electron main context. Put main-process behavior in `src/main/` and keep JSX/UI imports out of main modules.

### Renderer Extension

`src/renderer/index.tsx` exports a class extending `Renderer.LensExtension`. Its `onActivate` creates the `Renderer.Ipc` singleton, in each frame the extension loads in. The extension contributes a Kubernetes object detail item:

```tsx
kubeObjectDetailItems: Renderer.LensExtension["kubeObjectDetailItems"] = [
  Renderer.K8sApi.detailsFor(Renderer.K8sApi.Secret, { priority: 10, Details: SecretDetails }),
].map((registration) => withDetailsErrorBoundary(this, registration));
```

`Renderer.K8sApi.detailsFor` takes `kind` and `apiVersions` from the model class and types the props of `Details` from it, so a component written for another kind does not compile. `withDetailsErrorBoundary` keeps an error of the panel inside the panel: the host has no boundary around the details drawer of an extension, so the error would otherwise replace the whole cluster view.

The `Details` component receives `Renderer.Component.KubeObjectDetailsProps<Renderer.K8sApi.Secret>`, so `props.object` is the Secret object supplied by Freelens. The current component uses `object.data` for base64 Secret values and `object.getKeys()` to iterate Secret keys. The host passes a new object when the Secret changes, so the effect that parses the certificates is keyed on `object`. Create what its cleanup releases inside the effect: Freelens dev renders in `React.StrictMode`, which runs an effect, cleans it up and runs it again.

Use `Renderer.Component.DrawerTitle` and `Renderer.Component.DrawerItem` for content inside the object details drawer so the UI stays consistent with Freelens.

Renderer code gets no Node and no Electron, `require()` and `Buffer` included: they are `undefined`, or may become so in any release. `crypto.X509Certificate` has no web equivalent, so it stays in main, behind `Ipc`. The build fails on a Node import in the renderer, and `pnpm type:check` on a Node global.

## Runtime Module Boundary

The host publishes its API and the libraries it shares with extensions on `globalThis.FreelensExtensionApi`. `@freelensapp/extensions` is a thin shim that reads that global, so it is bundled. `build/vite-plugin-host-modules.mjs` rewrites the other shared libraries to the same global:

| Module id           | Global                                 | Published in   |
| ------------------- | -------------------------------------- | -------------- |
| `react`             | `FreelensExtensionApi.React`           | renderer       |
| `react-dom`         | `FreelensExtensionApi.ReactDom`        | renderer       |
| `react/jsx-runtime` | `FreelensExtensionApi.ReactJsxRuntime` | renderer       |
| `mobx`              | `FreelensExtensionApi.Mobx`            | renderer, main |
| `mobx-react`        | `FreelensExtensionApi.MobxReact`       | renderer       |
| `monaco-editor`     | `FreelensExtensionApi.MonacoEditor`    | renderer       |

Do not bundle a copy of these: a second React throws `invalid hook call`, and a second mobx throws nothing while its reactions do not fire.

Unit tests cannot import the real `@freelensapp/extensions` because it reads the global only the host sets, so `vitest.config.ts` aliases it to `test/freelens-extensions.ts`. The other host modules resolve to the devDependencies.

If new assets are needed by the extension, import them from TypeScript/TSX so Vite includes them in the bundle. Do not rely on loading loose files from the installed package at runtime.

Prefer CSS Modules for new styles. The build emits one stylesheet, `dist/renderer.css`, which the host links next to the renderer entry; any other name, or a second asset, leaves the extension unstyled. The `*.module.d.scss.ts` declarations are written by the build and committed. The host's Tailwind does not reach extensions.

## Build And Test Commands

Use pnpm. The package declares its `packageManager` and Node `>=24.0.0`; `.nvmrc` has the version of Freelens.

- `pnpm type:check`: run TypeScript type checking, one program per runtime environment.
- `pnpm test:unit`: run Vitest unit tests.
- `pnpm test:integration`: run the integration tests against a running Freelens dev.
- `pnpm lint:check`: run Biome checks.
- `pnpm build`: build the extension bundles into `dist/`.
- `pnpm dev`: rebuild on change. Freelens reloads an extension installed from a directory.
- `pnpm knip:check`: check dependency and file usage.

Neither `pnpm build` nor `pnpm dev` runs the type check.

For normal code changes, prefer at least:

```sh
pnpm type:check
pnpm test:unit
pnpm lint:check
```

Run from a worktree nested inside another checkout, Vitest and knip can pick up the outer checkout's `tsconfig.json` for files that the inner root config does not include, such as `test/`. Run them from a standalone clone when the outer checkout's config differs.

## Development Notes For Agents

- Keep renderer UI additions inside `src/renderer/`; keep main-process behavior inside `src/main/`; code both use goes in `src/common/`, which has neither Node nor the DOM.
- Keep both entries ESM: the host refuses to reload a CommonJS main.
- Keep the host-provided modules resolving to `globalThis.FreelensExtensionApi`.
- Do not use Lens or Freelens v1 API documentation as a source for extension behavior. Prefer Freelens's `docs/extensions/` (`api.md`, `migrating-from-v1.md`), the installed `@freelensapp/extensions` declaration, the Freelens example extension, and this repository's working code.
- When adding new Extension API surface to tests, extend `test/freelens-extensions.ts` only with the minimal host API required by the test.
- Do not manually register new extension APIs or stores. Freelens discovers exported APIs and stores automatically.
- Secret values are base64-encoded Kubernetes data. Decode before parsing certificate content.
- Send only `CERTIFICATE` PEM blocks over IPC, never a whole Secret value: it may hold a private key next to the certificate.
- Avoid logging Secret contents or decoded certificate payloads. Certificate metadata is acceptable, but Secret data may contain private keys or tokens.
- Existing formatting uses Biome with 2-space indentation, double quotes, semicolons, and 120-column line width.
- Do not modify generated build output unless the task specifically requires it.
- After enabling or installing the extension locally, check both the Freelens main-process terminal output and the renderer developer console for startup errors. The Extensions page shows "Failed to load" for an enabled extension whose code did not load.
