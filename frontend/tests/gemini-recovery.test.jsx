import React from "react";
import { afterEach, it, expect, vi } from "vitest";
import {
  cleanup,
  fireEvent,
  render,
  screen,
  act,
} from "@testing-library/react";
import { createMemoryRouter, RouterProvider } from "react-router-dom";
import { GeminiChat } from "../src/pages/gemini/index.jsx";

const state = vi.hoisted(() => ({ value: null }));
vi.mock("../src/app/AppContext.jsx", () => ({ useApp: () => state.value }));
afterEach(() => {
  cleanup();
  vi.useRealTimers();
});

it("status polling preserves edits to a reopened conversation", async () => {
  vi.useFakeTimers();
  let reads = 0;
  state.value = {
    mode: "api",
    service: {
      call: vi.fn(async (operation) => {
        if (operation === "gemini.get") {
          reads++;
          return {
            id: "c",
            title: "Pending chat",
            messages: [],
            plans: [],
            jobs: [],
            context: {
              sources: [{ projectId: "p", releaseId: "r" }],
              stack: "Python",
              instruction: "Initial",
            },
            pendingJobs: [{ id: "j", operation: "plan" }],
          };
        }
        if (operation === "gemini.sources")
          return {
            quota: 10000,
            sources: [
              { projectId: "p", releaseId: "r", title: "Source", version: "1" },
            ],
          };
      }),
    },
  };
  render(
    <RouterProvider
      router={createMemoryRouter(
        [{ path: "/:chatId", element: <GeminiChat /> }],
        { initialEntries: ["/c"] },
      )}
    />,
  );
  await act(async () => {});
  const stack = screen.getByLabelText("Target stack");
  fireEvent.change(stack, { target: { value: "Vue" } });
  fireEvent.change(screen.getByLabelText("What should this project do?"), {
    target: { value: "Keep my draft" },
  });
  await act(async () => {
    await vi.advanceTimersByTimeAsync(3000);
  });
  expect(reads).toBeGreaterThan(1);
  expect(screen.getByLabelText("Target stack").value).toBe("Vue");
  expect(screen.getByLabelText("What should this project do?").value).toBe(
    "Keep my draft",
  );
});
