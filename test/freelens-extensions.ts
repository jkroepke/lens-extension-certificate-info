// Minimal stub of `@freelensapp/extensions` for unit tests.
//
// The published package is a shim that reads `Common`, `Main` and `Renderer`
// off `globalThis.FreelensExtensionApi`, which the Freelens host sets before it
// loads an extension. A Vitest process has no host, so importing the real
// package throws. `vitest.config.ts` aliases the import to this file instead.
// The package ships no mocks of its own to use in its place.
//
// Only the surface the tests exercise is stubbed here, and only at runtime: the
// tests are type-checked against the real declaration of the package. Extend it
// as your tests need more of the host API.
import React from "react";
import { vi } from "vitest";

class LensExtensionKubeObject {
  apiVersion?: string;
  kind?: string;
  metadata?: { name?: string; namespace?: string };
  spec?: unknown;
  status?: unknown;

  constructor(data: Record<string, unknown> = {}) {
    Object.assign(this, data);
  }

  // As the host's, from the metadata.
  getName() {
    return this.metadata?.name ?? "";
  }

  // An empty namespace is undefined, as the host's.
  getNs() {
    return this.metadata?.namespace || undefined;
  }

  // The host returns the store it registered for one of the class's
  // `crd.apiVersions`, and throws when there is none. Without a host there is
  // never one; a test that needs a store spies on `getStore` of its class.
  static getStore(): never {
    throw new Error(`Store for ${this.name} is not registered. Extension won't work correctly.`);
  }
}

// The host's store loads the saved model with `fromStore()` and saves it
// whenever `toJSON()` changes, through a `reaction`. The stub keeps nothing; a
// test that needs that behaviour sets up the reaction itself.
class ExtensionStore<M extends object> {
  constructor(_params: { configName: string; defaults: M }) {}
}

interface KubeObjectListLayoutProps {
  store: { items: unknown[] };
  renderTableContents: (item: unknown) => React.ReactNode[];
}

// Only the part of the host's list layout where it calls back into the
// extension: it calls `renderTableContents` for every item of the store from
// its own render, a child of the page, and renders the cells.
function KubeObjectListLayout({ store, renderTableContents }: KubeObjectListLayoutProps) {
  return React.createElement(
    "div",
    null,
    store.items.map((item, index) => React.createElement("div", { key: index }, ...renderTableContents(item))),
  );
}

export const Renderer = {
  Component: {
    DrawerTitle: ({ children }: React.PropsWithChildren<unknown>) => React.createElement("h3", {}, children),
    DrawerItem: ({ children, name }: React.PropsWithChildren<{ name: string }>) =>
      React.createElement("div", {}, React.createElement("dt", {}, name), React.createElement("dd", {}, children)),
    KubeObjectListLayout,
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
  Store: {
    ExtensionStore,
  },
};
