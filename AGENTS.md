# AGENTS.md

## Project Overview

This repository contains `lens-certificate-info`, a Freelens extension that adds certificate metadata to Kubernetes Secret detail views.

When a user opens a `Secret` in Freelens, the renderer extension scans the Secret data keys for base64-encoded PEM certificates, decodes them, parses each certificate with Node.js `crypto.X509Certificate`, and renders details such as subject, SANs, issuer, serial number, public key type, validity start, and expiry. Expired certificates are highlighted in red, and self-signed certificates are detected by verifying the certificate with its own public key.

The current implementation supports PEM certificate blocks stored in Secret data. The README notes that other formats, such as Java Keystore or PKCS#12, are not supported yet.

This project targets Freelens for current development. Older OpenLens/Lens compatibility may appear in repository history or package metadata, but do not assume current Lens compatibility. Freelens is a fork and is no longer API-compatible with Lens.

## Repository Layout

- `src/main/index.ts` defines the main-process extension class.
- `src/renderer/index.tsx` registers renderer-side extension contributions.
- `src/renderer/component/secret-details.tsx` contains the certificate extraction, parsing, formatting, and drawer rendering logic.
- `src/renderer/component/secret-details.test.tsx` unit-tests the renderer component with a fixture Secret.
- `test/freelens-extensions.ts` is a Vitest stub for the host-provided `@freelensapp/extensions` runtime API.
- `examples/test/secret.yaml` is the test fixture used by unit tests.
- `electron.vite.config.ts` builds the separate main and renderer extension bundles.
- `integration/` contains Playwright/Electron installation coverage for the extension package.

## Freelens Extension API

Freelens extensions are packaged Node/Electron modules. This package declares two compiled entrypoints in `package.json`:

- `main`: `out/main/index.js`
- `renderer`: `out/renderer/index.js`

The Freelens host loads these entrypoints and expects each one to export a class derived from the appropriate extension base class from `@freelensapp/extensions`.

There is no separate `extension.json` manifest. Extension metadata, entrypoints, compatible `engines.freelens`, compatible Node.js version, scripts, and dependencies are handled through `package.json`.

All package dependencies for this extension should be declared in `devDependencies`. Freelens extensions are built and bundled ahead of time and do not load their own `node_modules` at runtime. Modules externalized by the Vite config are provided by the Freelens application, must remain external, and should use versions compatible with the Freelens app.

### Main Extension

`src/main/index.ts` exports:

```ts
export default class CertificateInfoMainExtension extends Main.LensExtension {}
```

`Main.LensExtension` is the Freelens main-process extension base class. Use this side for Freelens host or Electron main-process behavior when needed. This extension currently has no main-process behavior, but the class is still present because the package exposes a `main` entrypoint.

### Renderer Extension

`src/renderer/index.tsx` exports a class extending `Renderer.LensExtension`.

Renderer extensions contribute UI to the Freelens renderer process. In this project, the extension contributes a Kubernetes object detail item:

```tsx
kubeObjectDetailItems = [
  {
    kind: "Secret",
    apiVersions: ["v1"],
    priority: 10,
    components: {
      Details: (props: Renderer.Component.KubeObjectDetailsProps<Renderer.K8sApi.Secret>) => (
        <SecretDetails {...props} />
      ),
    } as any,
  },
];
```

`kubeObjectDetailItems` tells Freelens to add custom content to Kubernetes object drawers. The important fields are:

- `kind`: the Kubernetes kind to target. This extension targets `Secret`.
- `apiVersions`: Kubernetes API versions to match. For core Secrets this is `v1`.
- `priority`: ordering relative to other detail item contributions.
- `components.Details`: a React component rendered in the object detail drawer.

The `Details` component receives `Renderer.Component.KubeObjectDetailsProps<T>`. Here `T` is `Renderer.K8sApi.Secret`, so `props.object` is the Secret object supplied by Freelens. The current component uses `object.data` for base64 Secret values and `object.getKeys()` to iterate Secret keys.

Use `Renderer.Component.DrawerTitle` and `Renderer.Component.DrawerItem` for content inside the object details drawer so the UI stays consistent with Freelens.

Renderer code runs in the Freelens renderer/browser context. Keep renderer modules browser-compatible and do not import Node-only modules such as `fs` or `os` there. This project currently imports `crypto.X509Certificate` in `src/renderer/component/secret-details.tsx`; preserve or change that carefully because it relies on Freelens/Electron renderer capabilities, and the extension build configuration.

Main-process code runs in the Node/Electron main context. Put main-process behavior in `src/main/` and keep JSX/UI imports out of main modules.

## Runtime Module Boundary

`@freelensapp/extensions` is provided by the Freelens host at runtime as `global.LensExtensions`; it is not bundled into the extension output. The Vite config uses `globalExternals` to preserve that boundary for both main and renderer bundles.

Do not replace this with a normal bundled import. Unit tests cannot import the real package because it pulls in Electron and host runtime assumptions, so `vitest.config.ts` aliases it to `test/freelens-extensions.ts`.

React, React DOM, MobX, and related renderer libraries are also treated as host-provided globals in the renderer bundle.

If new assets are needed by the extension, import them from TypeScript/TSX so Vite includes them in the built `out/main/index.js` or `out/renderer/index.js`. Do not rely on loading loose files from the installed package at runtime.

Prefer CSS Modules for new styles. If global CSS is unavoidable, use extension-specific class prefixes to avoid collisions with Freelens or other extensions. Do not add Windtail/Tailwind runtime styling to the extension.

## Build And Test Commands

Use pnpm. The package declares `pnpm@11.9.0` and Node `>=22.16.0`.

- `pnpm type:check`: run TypeScript type checking.
- `pnpm test:unit`: run Vitest unit tests.
- `pnpm lint:check`: run Biome checks.
- `pnpm build`: build the extension bundles.
- `pnpm build:production`: build with `VITE_PRESERVE_MODULES=false`.
- `pnpm knip:check`: check dependency usage.

For normal code changes, prefer at least:

```sh
pnpm type:check
pnpm test:unit
pnpm lint:check
```

## Development Notes For Agents

- Keep renderer UI additions inside `src/renderer/`; keep main-process behavior inside `src/main/`.
- Preserve CommonJS output for Freelens 1.x extension compatibility.
- Keep `@freelensapp/extensions` and other host-provided modules external.
- Do not use current Lens API documentation as a source for Freelens extension behavior. Prefer the Freelens extension wiki, the installed `@freelensapp/extensions` types/source, the Freelens example extension, and this repository's working code. If consulting old Lens API docs, treat them only as historical Lens 5.5.4 reference material where Freelens documentation explicitly points there.
- When adding new Extension API surface to tests, extend `test/freelens-extensions.ts` only with the minimal host API required by the test.
- Do not manually register new extension APIs or stores. Freelens discovers exported APIs and stores automatically.
- Secret values are base64-encoded Kubernetes data. Decode before parsing certificate content.
- Avoid logging Secret contents or decoded certificate payloads. Certificate metadata is acceptable, but Secret data may contain private keys or tokens.
- Existing formatting uses Biome with 2-space indentation, double quotes, semicolons, and 120-column line width.
- Do not modify generated build output unless the task specifically requires it.
- After enabling or installing the extension locally, check both the Freelens main-process terminal output and the renderer developer console for startup errors.
