import React from "react";
import { describe, it, expect } from "vitest";
import { fireEvent, render, screen } from "@testing-library/react";
import { createMemoryRouter, RouterProvider } from "react-router-dom";
import { safeReturnTo } from "../src/app/navigation.js";
import { Notice, PageTitle, ProjectVisual } from "../src/app/ui.jsx";

describe("navigation boundaries", () => {
  it("keeps authentication returns inside the application", () => {
    expect(safeReturnTo("/library?tab=updates")).toBe("/library?tab=updates");
    for (const value of [
      "https://evil.test",
      "//evil.test",
      "/\\evil.test",
      "/connect?next=/connect",
      undefined,
    ]) {
      expect(safeReturnTo(value)).toBe("/library");
    }
  });
  it("announces errors and supplies one page heading", () => {
    render(
      <RouterProvider
        router={createMemoryRouter([
          {
            path: "/",
            element: (
              <>
                <PageTitle title="My library" />
                <Notice tone="error">Try again</Notice>
              </>
            ),
          },
        ])}
      />,
    );
    expect(screen.getByRole("heading", { level: 1 }).textContent).toBe(
      "My library",
    );
    expect(screen.getByRole("alert").textContent).toBe("Try again");
  });
  it("tries the next screenshot and shows a placeholder if every file is missing", () => {
    render(
      <ProjectVisual
        project={{
          id: "project-1",
          title: "Portfolio",
          stack: "React",
          screenshots: [
            "https://example.test/old.png",
            "https://example.test/new.png",
          ],
        }}
      />,
    );
    fireEvent.error(screen.getByRole("img"));
    expect(screen.getByRole("img").getAttribute("src")).toBe(
      "https://example.test/new.png",
    );
    fireEvent.error(screen.getByRole("img"));
    expect(screen.queryByRole("img")).toBeNull();
    expect(screen.getByText("Portfolio")).toBeTruthy();
  });
});
