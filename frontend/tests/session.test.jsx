import React from "react";
import { describe, it, expect, vi, afterEach } from "vitest";
import {
  render,
  screen,
  fireEvent,
  waitFor,
  cleanup,
} from "@testing-library/react";
const fake = vi.hoisted(() => ({ call: vi.fn() }));
vi.mock("../src/services/index.js", () => ({ service: fake, mode: "api" }));
import { AppProvider, useApp } from "../src/app/AppContext.jsx";
function Form() {
  const { user, sessionExpired, refreshSession } = useApp();
  return (
    <>
      <p>{user?.id || "anonymous"}</p>
      <span>{sessionExpired ? "expired" : "active"}</span>
      <input aria-label="Draft" defaultValue="" />
      <button onClick={() => refreshSession()}>Refresh</button>
    </>
  );
}
afterEach(() => {
  cleanup();
  fake.call.mockReset();
});
describe("session recovery", () => {
  it("keeps the mounted draft if reauthentication session validation fails", async () => {
    fake.call
      .mockResolvedValueOnce({ id: "buyer" })
      .mockResolvedValueOnce(null)
      .mockRejectedValueOnce(new Error("Network unavailable"));
    render(
      <AppProvider>
        <Form />
      </AppProvider>,
    );
    await screen.findByText("buyer");
    fireEvent.change(screen.getByLabelText("Draft"), {
      target: { value: "Keep me" },
    });
    window.dispatchEvent(new Event("utopia:unauthorized"));
    await screen.findByText("expired");
    fireEvent.click(screen.getByRole("button", { name: "Refresh" }));
    await waitFor(() => expect(fake.call).toHaveBeenCalledTimes(3));
    await waitFor(() => expect(screen.getByText("buyer")).toBeTruthy());
    expect(screen.getByText("expired")).toBeTruthy();
    expect(screen.getByLabelText("Draft").value).toBe("Keep me");
  });
  it("retains edits and rejects reauth as another account", async () => {
    fake.call
      .mockResolvedValueOnce({ id: "buyer" })
      .mockResolvedValueOnce(null)
      .mockResolvedValueOnce({ id: "other" });
    render(
      <AppProvider>
        <Form />
      </AppProvider>,
    );
    await screen.findByText("buyer");
    fireEvent.change(screen.getByLabelText("Draft"), {
      target: { value: "Keep me" },
    });
    window.dispatchEvent(new Event("utopia:unauthorized"));
    await screen.findByText("expired");
    expect(screen.getByLabelText("Draft").value).toBe("Keep me");
    fireEvent.click(screen.getByRole("button", { name: "Refresh" }));
    await waitFor(() => expect(fake.call).toHaveBeenCalledTimes(3));
    expect(screen.getByText("buyer")).toBeTruthy();
    expect(screen.getByText("expired")).toBeTruthy();
  });
});
