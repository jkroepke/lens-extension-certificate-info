import { fileURLToPath } from "node:url";
import react from "@vitejs/plugin-react";
import { defineConfig } from "vitest/config";

export default defineConfig({
  // `@vitejs/plugin-react` transforms JSX/TSX the same way the build does, so
  // component tests (e.g. `error-page.test.tsx`) render correctly.
  plugins: [react()],
  test: {
    // Default to a Node environment. Tests that render React components opt into
    // jsdom per-file with a `// @vitest-environment jsdom` comment at the top.
    environment: "node",
    exclude: ["integration/**", "node_modules/**", "out/**"],
    include: ["src/**/*.{test,spec}.{ts,tsx}"],
    passWithNoTests: true,
    alias: {
      // `@freelensapp/extensions`, mobx, react, etc. are provided by the
      // Freelens host as globals at runtime and are not bundled. The real
      // extensions package cannot be imported in tests (it requires Electron),
      // so swap it for a small stub - see `test/freelens-extensions.ts`.
      "@freelensapp/extensions": fileURLToPath(new URL("./test/freelens-extensions.ts", import.meta.url)),
    },
  },
});
