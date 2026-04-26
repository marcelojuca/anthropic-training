# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Run

This project uses `uv`. The `USE_UV` env var controls how `main.py` spawns the bundled MCP server subprocess (`uv run mcp_server.py` vs `python mcp_server.py`); keep it consistent with how you run the CLI.

```bash
uv run main.py                          # start the chat CLI (uses bundled mcp_server.py)
uv run main.py path/to/other_server.py  # mount additional MCP servers (extra args are server scripts run via `uv run`)
uv run mcp_server.py                    # run the document MCP server alone (stdio); useful with the MCP Inspector
```

`.env` must define `ANTHROPIC_API_KEY` and `CLAUDE_MODEL` — `main.py` asserts both at startup.

There are no tests, lint, or type checks configured.

## Architecture

Three processes wired together over MCP stdio:

1. **`main.py`** — entry point. Loads env, constructs a `Claude` service, then opens an `AsyncExitStack` of `MCPClient` connections. The first client (`doc_client`) is always the bundled `mcp_server.py`; any extra positional args become additional MCP server subprocesses keyed as `client_<i>_<script>`. All clients are passed into `CliChat`.

2. **`mcp_client.py`** (`MCPClient`) — thin async wrapper around `mcp.ClientSession` over `stdio_client`. Used as an async context manager (`__aenter__` calls `connect()`). **Several methods are deliberately stubbed (`list_tools`, `call_tool`, `list_prompts`, `get_prompt`, `read_resource`)** — they return empty values until implemented. Most CLI features depend on these, so failures like "no completions" or "tool not found" trace back here.

3. **`mcp_server.py`** — the in-repo `FastMCP` server that exposes the in-memory `docs` dict via tools (`read_doc_contents`, `edit_doc_contents`), resources (`docs://documents`, `docs://documents/{doc_id}`), and prompts (`rewrite_doc_markdown`, `summarize_doc`). Add new docs by editing the `docs` dict.

### Chat flow (`core/`)

- `Chat` (`core/chat.py`) is the model loop: append user message → call Claude with tools aggregated from all clients → if `stop_reason == "tool_use"`, dispatch via `ToolManager` and append `tool_result` blocks → repeat until a non-tool stop. The conversation is a single `self.messages` list of Anthropic `MessageParam`s.
- `CliChat` (`core/cli_chat.py`) extends `Chat` with two CLI behaviors that bypass tool-use:
  - **`@doc_id` mentions** — `_extract_resources` resolves them via `doc_client.read_resource("docs://documents/...")` and inlines the content into the user prompt as `<document>` blocks, so the model doesn't need to call a tool to read them.
  - **`/command arg` slash commands** — `_process_command` calls `doc_client.get_prompt(name, {"doc_id": arg})` and appends the returned `PromptMessage`s directly to `self.messages` (converted via `convert_prompt_messages_to_message_params`). The model then responds without an extra user query.
- `ToolManager` (`core/tools.py`) aggregates tools across **all** clients and routes each `tool_use` request to the first client whose `list_tools()` contains that name. Adding a new MCP server via `main.py`'s CLI args is enough to expose its tools to the model — no registration needed.
- `CliApp` (`core/cli.py`) is the `prompt_toolkit` UI: `UnifiedCompleter` drives `@`/`/` autocomplete from `agent.list_docs_ids()` and `agent.list_prompts()` (both call into `doc_client`), refreshed at startup via `initialize()`.

### Key invariant

`doc_client` is privileged — it's the only client used for resources and prompts (slash commands, `@` mentions). Tools, by contrast, are looked up across every client. If you add features that should appear as commands or `@`-completable, they belong on `mcp_server.py`; if they're general capabilities the model invokes, they can live on any mounted server.
