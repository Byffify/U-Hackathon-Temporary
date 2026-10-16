import React from "react";
import { afterEach, expect, it, vi } from "vitest";
import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import { createMemoryRouter, RouterProvider } from "react-router-dom";

const state = vi.hoisted(() => ({ current: null }));
vi.mock("../src/app/AppContext.jsx", () => ({
  useApp: () => state.current,
}));

import { ConnectPage } from "../src/pages/commerce/index.jsx";

afterEach(() => {
  cleanup();
  delete window.ethereum;
  state.current = null;
});

it("finishes wallet login and returns to the requested page after reauthentication", async () => {
  const address = "0x1111111111111111111111111111111111111111";
  const signature = `0x${"ab".repeat(65)}`;
  const calls = [];
  window.ethereum = {
    request: async ({ method }) => {
      if (method === "eth_requestAccounts") return [address];
      if (method === "eth_chainId") return "0xa869";
      if (method === "personal_sign") return signature;
      if (method === "eth_accounts") return [address];
      throw new Error(`Unexpected wallet method: ${method}`);
    },
  };
  state.current = {
    mode: "api",
    user: { id: "user-1", address },
    sessionExpired: true,
    service: {
      call: async (operation) => {
        calls.push(operation);
        return operation === "auth.challenge"
          ? { id: "challenge-1", message: "Sign in" }
          : { id: "user-1", address };
      },
    },
    refreshSession: async () => ({ id: "user-1", address }),
  };
  const router = createMemoryRouter(
    [
      { path: "/connect", element: <ConnectPage /> },
      { path: "/library", element: <p>Library reached</p> },
    ],
    { initialEntries: ["/connect?returnTo=/library"] },
  );
  render(<RouterProvider router={router} />);
  fireEvent.click(screen.getByRole("button", { name: "Connect and sign in" }));
  await screen.findByText("Library reached");
  expect(calls).toEqual(["auth.challenge", "auth.verify"]);
});
