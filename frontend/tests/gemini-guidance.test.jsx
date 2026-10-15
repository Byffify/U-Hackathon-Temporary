import React from "react";
import { afterEach, it, expect, vi } from "vitest";
import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import { createMemoryRouter, RouterProvider } from "react-router-dom";
import { GeminiChat } from "../src/pages/gemini/index.jsx";
const context = vi.hoisted(() => ({ value: null }));
vi.mock("../src/app/AppContext.jsx", () => ({ useApp: () => context.value }));
afterEach(cleanup);
function guidance(button) {
  return document.getElementById(button.getAttribute("aria-describedby"))
    ?.textContent;
}
it("updates nearby accessible guidance as prerequisites are completed and while busy", async () => {
  context.value = {
    mode: "live",
    service: {
      call: vi.fn(async (name) => {
        if (name === "gemini.get")
          return { title: "Chat", messages: [], plans: [], jobs: [] };
        if (name === "gemini.sources")
          return {
            quota: 10,
            sources: [
              { projectId: "p", releaseId: "r", title: "Source", version: "1" },
            ],
          };
        return new Promise(() => {});
      }),
    },
  };
  render(
    <RouterProvider
      router={createMemoryRouter(
        [{ path: "/:chatId", element: <GeminiChat /> }],
        { initialEntries: ["/chat"] },
      )}
    />,
  );
  const quote = await screen.findByRole("button", {
    name: "Check analysis quota",
  });
  const send = screen.getByRole("button", { name: "Send message" });
  expect(guidance(quote)).toContain(
    "select a source release; enter a target stack; describe what this project should do",
  );
  expect(guidance(send)).toContain("write a message");
  fireEvent.click(screen.getByRole("checkbox"));
  expect(guidance(quote)).not.toContain("select a source");
  fireEvent.change(screen.getByLabelText("Target stack"), {
    target: { value: "React" },
  });
  fireEvent.change(screen.getByLabelText("What should this project do?"), {
    target: { value: "Build search" },
  });
  expect(guidance(quote)).toBe("Ready to check analysis quota.");
  expect(guidance(send)).toBe("Before sending: write a message.");
  fireEvent.change(screen.getByLabelText("Ask or explain"), {
    target: { value: "Explain search" },
  });
  expect(guidance(send)).toBe("Ready to send your message.");
  fireEvent.click(send);
  expect(guidance(send)).toContain("operation is in progress");
  expect(guidance(quote)).toContain("operation is in progress");
});
it("describes stale plans, unsent messages, existing jobs and insufficient quota", async () => {
  context.value = {
    mode: "live",
    service: {
      call: vi.fn(async (name) => {
        if (name === "gemini.get")
          return {
            title: "Chat",
            messages: [],
            plans: [
              {
                id: "plan",
                revision: 1,
                messageRevision: 0,
                cost: 5,
                steps: ["Build search"],
                input: {
                  sources: [{ projectId: "p", releaseId: "r" }],
                  stack: "React",
                  instruction: "Build search",
                },
              },
            ],
            jobs: [{ id: "job", planId: "plan", status: "simulated" }],
          };
        if (name === "gemini.sources")
          return {
            quota: 2,
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
        { initialEntries: ["/chat"] },
      )}
    />,
  );
  const confirm = await screen.findByRole("button", {
    name: "Confirm plan and generate ZIP",
  });
  expect(guidance(confirm)).toContain(
    "Generation already exists for this plan",
  );
  expect(guidance(confirm)).toContain("Insufficient trial quota");
  fireEvent.change(screen.getByLabelText("Ask or explain"), {
    target: { value: "One more change" },
  });
  expect(guidance(confirm)).toContain("Send or clear your unsent message");
  fireEvent.change(screen.getByLabelText("Ask or explain"), {
    target: { value: "" },
  });
  fireEvent.change(screen.getByLabelText("Target stack"), {
    target: { value: "Vue" },
  });
  expect(guidance(confirm)).toContain(
    "review a new plan for your current context",
  );
});
