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

export const Renderer = {
  Component: {
    DrawerTitle: ({ children }: React.PropsWithChildren<unknown>) => React.createElement("h3", {}, children),
    DrawerItem: ({ children, name }: React.PropsWithChildren<{ name: string }>) =>
      React.createElement("div", {}, React.createElement("dt", {}, name), React.createElement("dd", {}, children)),
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
