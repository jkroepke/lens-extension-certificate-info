// @vitest-environment jsdom

import { cleanup, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it } from "vitest";
import { ErrorPage } from "./error-page";

afterEach(() => {
  cleanup();
});

describe("ErrorPage", () => {
  it("renders the error message", () => {
    render(<ErrorPage error={new Error("boom")} />);

    expect(screen.getByText("Error: boom")).toBeDefined();
  });

  it("renders children when there is no error", () => {
    render(
      <ErrorPage>
        <span>child content</span>
      </ErrorPage>,
    );

    expect(screen.getByText("child content")).toBeDefined();
  });
});
