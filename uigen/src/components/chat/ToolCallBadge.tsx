import { Loader2 } from "lucide-react";
import type { ToolInvocation } from "ai";

interface ToolCallBadgeProps {
  tool: ToolInvocation;
}

function getLabel(toolName: string, args: Record<string, unknown>): string {
  const path = typeof args.path === "string" ? args.path : "";

  if (toolName === "str_replace_editor") {
    switch (args.command) {
      case "create":
        return `Creating ${path}`;
      case "str_replace":
      case "insert":
        return `Editing ${path}`;
      case "view":
        return `Reading ${path}`;
      case "undo_edit":
        return `Undoing edit in ${path}`;
    }
  }

  if (toolName === "file_manager") {
    switch (args.command) {
      case "rename": {
        const newPath = typeof args.new_path === "string" ? args.new_path : "";
        return `Renaming ${path} → ${newPath}`;
      }
      case "delete":
        return `Deleting ${path}`;
    }
  }

  return toolName;
}

export function ToolCallBadge({ tool }: ToolCallBadgeProps) {
  const label = getLabel(tool.toolName, (tool.args as Record<string, unknown>) ?? {});
  const done = tool.state === "result";

  return (
    <div className="inline-flex items-center gap-2 mt-2 px-3 py-1.5 bg-neutral-50 rounded-lg text-xs font-mono border border-neutral-200">
      {done ? (
        <div className="w-2 h-2 rounded-full bg-emerald-500" />
      ) : (
        <Loader2 className="w-3 h-3 animate-spin text-blue-600" />
      )}
      <span className="text-neutral-700">{label}</span>
    </div>
  );
}
