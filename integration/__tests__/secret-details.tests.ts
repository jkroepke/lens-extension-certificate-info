// Applies the test Secret to the kind cluster and opens its details in the
// Secrets page of the host, which goes through the renderer and the IPC handler
// in main. The session disconnects the kind cluster around its run and does not
// depend on another test file having run.

import { afterAll, beforeAll, describe, expect, it } from "vitest";
import {
  appReady,
  connectApp,
  disconnectKindCluster,
  drawerItemValue,
  installExtension,
  openCertificateDetails,
  openKindCluster,
  openSecretRow,
  setUpCluster,
  tearDownCluster,
} from "./extension-helpers";

import type { Frame } from "playwright";

import type { AppSession } from "./extension-helpers";

describe.skipIf(!(await appReady({ cluster: true })))("Secret details", () => {
  let session: AppSession | undefined;
  let frame: Frame;

  beforeAll(
    async () => {
      session = await connectApp();
      await disconnectKindCluster(session);
      setUpCluster();
      await installExtension(session);
      frame = await openKindCluster(session);
    },
    10 * 60 * 1000,
  );

  afterAll(
    async () => {
      let errors: string[] = [];

      try {
        // The errors first: the app refreshes the cluster while it disconnects,
        // and logs errors of its own when the refresh loses the race.
        errors = (await session?.stopCollecting()) ?? [];

        if (session) {
          await disconnectKindCluster(session);
        }

        await session?.close();
      } finally {
        tearDownCluster();
      }

      expect(errors).toEqual([]);
    },
    10 * 60 * 1000,
  );

  it("shows the metadata of the certificate in the Secret", async () => {
    const row = await openSecretRow(frame);
    const details = await openCertificateDetails(frame, row);

    expect(await drawerItemValue(frame, details, "Key Type")).toBe("RSA4096");
    expect(await drawerItemValue(frame, details, "Serial Number")).toBe("4256758DDFF38243E3FB180234AB9CB98135A117");
    expect(await drawerItemValue(frame, details, "Issuer")).toContain("(self-signed)");
  });
});
