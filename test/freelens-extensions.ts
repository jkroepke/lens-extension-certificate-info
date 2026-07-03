// Minimal stub of the host-provided `@freelensapp/extensions` module.
//
// At runtime Freelens injects this module as the `global.LensExtensions`
// global, so it is never bundled (see `globalExternals` in
// `electron.vite.config.js`) and cannot be imported in a plain Node/vitest
// process - the real package pulls in Electron. Unit tests alias the import to
// this file instead (see the `alias` option in `vitest.config.ts`).
//
// Only the surface actually exercised by the tests is stubbed here. Extend it
// as your tests need more of the host API.

import React from "react";
import { vi } from "vitest";

class LensExtensionKubeObject {
  apiVersion?: string;
  kind?: string;
  metadata?: unknown;
  spec?: unknown;
  status?: unknown;

  constructor(data: Record<string, unknown> = {}) {
    Object.assign(this, data);
  }
}

export const Renderer = {
  Component: {
    DrawerTitle: ({ children }: React.PropsWithChildren<unknown>) => React.createElement("h3", {}, children),
    DrawerItem: ({ children, name }: React.PropsWithChildren<{ name: string }>) =>
      React.createElement("div", {}, React.createElement("dt", {}, name), React.createElement("dd", {}, children)),
  },
  K8sApi: {
    LensExtensionKubeObject,
    KubeApi: class KubeApi {},
    KubeObjectStore: class KubeObjectStore {},
  },
};

export const Common = {
  logger: {
    debug: vi.fn(),
    info: vi.fn(),
    warn: vi.fn(),
    error: vi.fn(),
  },
};
