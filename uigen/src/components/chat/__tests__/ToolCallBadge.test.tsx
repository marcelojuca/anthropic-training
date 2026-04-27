import { test, expect, afterEach } from "vitest";
import { render, screen, cleanup } from "@testing-library/react";
import { ToolCallBadge } from "../ToolCallBadge";
import type { ToolInvocation } from "ai";

afterEach(() => {
  cleanup();
});

function makeInvocation(
  toolName: string,
  args: Record<string, unknown>,
  state: ToolInvocation["state"] = "result"
): ToolInvocation {
  if (state === "result") {
    return { toolCallId: "1", toolName, args, state, result: "ok" };
  }
  return { toolCallId: "1", toolName, args, state } as ToolInvocation;
}

// str_replace_editor labels
test("shows 'Creating' label for str_replace_editor create command", () => {
  render(
    <ToolCallBadge
      tool={makeInvocation("str_replace_editor", {
        command: "create",
        path: "/components/Button.tsx",
      })}
    />
  );
  expect(screen.getByText("Creating /components/Button.tsx")).toBeDefined();
});

test("shows 'Editing' label for str_replace_editor str_replace command", () => {
  render(
    <ToolCallBadge
      tool={makeInvocation("str_replace_editor", {
        command: "str_replace",
        path: "/components/Card.tsx",
      })}
    />
  );
  expect(screen.getByText("Editing /components/Card.tsx")).toBeDefined();
});

test("shows 'Editing' label for str_replace_editor insert command", () => {
  render(
    <ToolCallBadge
      tool={makeInvocation("str_replace_editor", {
        command: "insert",
        path: "/App.tsx",
      })}
    />
  );
  expect(screen.getByText("Editing /App.tsx")).toBeDefined();
});

test("shows 'Reading' label for str_replace_editor view command", () => {
  render(
    <ToolCallBadge
      tool={makeInvocation("str_replace_editor", {
        command: "view",
        path: "/lib/utils.ts",
      })}
    />
  );
  expect(screen.getByText("Reading /lib/utils.ts")).toBeDefined();
});

test("shows 'Undoing edit' label for str_replace_editor undo_edit command", () => {
  render(
    <ToolCallBadge
      tool={makeInvocation("str_replace_editor", {
        command: "undo_edit",
        path: "/App.tsx",
      })}
    />
  );
  expect(screen.getByText("Undoing edit in /App.tsx")).toBeDefined();
});

// file_manager labels
test("shows 'Renaming' label for file_manager rename command", () => {
  render(
    <ToolCallBadge
      tool={makeInvocation("file_manager", {
        command: "rename",
        path: "/old/Path.tsx",
        new_path: "/new/Path.tsx",
      })}
    />
  );
  expect(
    screen.getByText("Renaming /old/Path.tsx → /new/Path.tsx")
  ).toBeDefined();
});

test("shows 'Deleting' label for file_manager delete command", () => {
  render(
    <ToolCallBadge
      tool={makeInvocation("file_manager", {
        command: "delete",
        path: "/components/Old.tsx",
      })}
    />
  );
  expect(screen.getByText("Deleting /components/Old.tsx")).toBeDefined();
});

// Unknown tool fallback
test("falls back to tool name for unknown tools", () => {
  render(
    <ToolCallBadge
      tool={makeInvocation("some_unknown_tool", { command: "do_thing" })}
    />
  );
  expect(screen.getByText("some_unknown_tool")).toBeDefined();
});

// State-based indicator
test("shows green dot when tool state is result", () => {
  const { container } = render(
    <ToolCallBadge
      tool={makeInvocation("str_replace_editor", {
        command: "create",
        path: "/App.tsx",
      })}
    />
  );
  expect(container.querySelector(".bg-emerald-500")).toBeDefined();
});

test("shows spinner when tool state is call", () => {
  const { container } = render(
    <ToolCallBadge
      tool={makeInvocation(
        "str_replace_editor",
        { command: "create", path: "/App.tsx" },
        "call"
      )}
    />
  );
  expect(container.querySelector(".animate-spin")).toBeDefined();
});

test("shows spinner when tool state is partial-call", () => {
  const { container } = render(
    <ToolCallBadge
      tool={makeInvocation(
        "str_replace_editor",
        { command: "create", path: "/App.tsx" },
        "partial-call"
      )}
    />
  );
  expect(container.querySelector(".animate-spin")).toBeDefined();
});
