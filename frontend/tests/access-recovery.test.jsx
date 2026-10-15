import React from "react";
import { afterEach, describe, expect, it, vi } from "vitest";
import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import { ErrorState } from "../src/app/ui.jsx";

afterEach(cleanup);

function show(error, context = "license-access", retry = vi.fn()) {
  render(
    <MemoryRouter>
      <ErrorState error={error} context={context} retry={retry} />
    </MemoryRouter>,
  );
  return retry;
}

describe("license access recovery", () => {
  it.each([
    { code: "FORBIDDEN" },
    { code: "NOT_FOUND" },
    { code: "HTTP_403" },
    { code: "HTTP_404" },
    { status: 403 },
    { details: { status: 404 } },
  ])("offers a useful exit for permanent access failure %j", (error) => {
    show({ ...error, message: "You do not hold this entitlement." });
    expect(screen.getByRole("alert").textContent).toContain(
      "This license is not available to this account.",
    );
    expect(screen.getByRole("alert").textContent).toContain(
      "same account you used to purchase",
    );
    expect(
      screen
        .getByRole("link", { name: "Back to library" })
        .getAttribute("href"),
    ).toBe("/library");
    expect(screen.queryByRole("button", { name: "Try again" })).toBeNull();
  });

  it("preserves a temporary service error and working retry", () => {
    const retry = show({ code: "NETWORK_ERROR", message: "Connection lost." });
    expect(screen.getByRole("alert").textContent).toContain("Connection lost.");
    fireEvent.click(screen.getByRole("button", { name: "Try again" }));
    expect(retry).toHaveBeenCalledOnce();
  });

  it("keeps unrelated errors unchanged without license context", () => {
    const retry = show(
      { code: "NOT_FOUND", message: "Project not found." },
      null,
    );
    expect(screen.getByRole("alert").textContent).toContain(
      "Project not found.",
    );
    expect(screen.queryByRole("link", { name: "Back to library" })).toBeNull();
    expect(screen.queryByText(/This license/)).toBeNull();
    fireEvent.click(screen.getByRole("button", { name: "Try again" }));
    expect(retry).toHaveBeenCalledOnce();
  });
});
