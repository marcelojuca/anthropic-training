# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Commands

```bash
npm run setup      # first-time setup: install deps, generate Prisma client, run migrations
npm run dev        # dev server on http://localhost:3000 (Turbopack)
npm run build      # production build
npm start          # production server
npm test           # Vitest (jsdom)
npm run lint       # Next.js ESLint
npm run db:reset   # wipe and re-migrate SQLite database
```

## Environment Variables

- `ANTHROPIC_API_KEY` — if absent, a `MockLanguageModel` returns hardcoded demos instead of calling Claude.
- `JWT_SECRET` — falls back to `"development-secret-key"` in development.

## Architecture

UIGen is a Next.js 15 (App Router) app where users describe UI in a chat and Claude generates JSX/TSX into an in-memory virtual file system. A sandboxed iframe renders those files live.

### Request / render flow

```
User prompt
  → ChatProvider (Vercel AI SDK useAIChat)
  → POST /api/chat
      · Sends serialized VirtualFileSystem in request body
      · Server reconstructs VFS, calls streamText() with str_replace_editor + file_manager tools
      · Streams response; on finish, persists messages + FS to DB (if authenticated)
  → onToolCall fires in browser
      · FileSystemContext.handleToolCall() mutates in-memory VirtualFileSystem
      · Increments refreshTrigger
  → PreviewFrame detects change
      · Babel-transforms .jsx/.tsx → blob: URLs, builds ES import map
      · Writes <iframe srcdoc> with React 19 from esm.sh
```

### Key files

| Path | Role |
|---|---|
| `src/app/api/chat/route.ts` | Only AI route. Tool registration, streaming, DB persistence. |
| `src/lib/file-system.ts` | `VirtualFileSystem` — Map-based in-memory tree, serialize/deserialize. |
| `src/lib/contexts/file-system-context.tsx` | React context bridging AI tool calls to VFS mutations. |
| `src/lib/contexts/chat-context.tsx` | Wraps `useAIChat`; injects `fileSystem.serialize()` into every request. |
| `src/lib/transform/jsx-transformer.ts` | Client-side Babel pipeline: blob URLs, import map, CSS collection, iframe HTML. |
| `src/components/preview/PreviewFrame.tsx` | Sandboxed `<iframe srcdoc>` that watches `refreshTrigger`. |
| `src/lib/tools/str-replace.ts` | Zod-validated AI tool: view/create/str_replace/insert on VFS. |
| `src/lib/tools/file-manager.ts` | Zod-validated AI tool: rename and delete on VFS. |
| `src/lib/prompts/generation.tsx` | System prompt (cached via Anthropic ephemeral cache control). |
| `src/lib/provider.ts` | Returns real `anthropic("claude-haiku-4-5")` or `MockLanguageModel`. |
| `src/actions/index.ts` | Server Actions for auth (sign-up, sign-in, sign-out, getUser). |
| `src/lib/auth.ts` | Server-only JWT helpers using `jose`. |
| `src/app/main-content.tsx` | Root UI: resizable 35/65 split (Chat | Preview+Code). |

### Non-obvious conventions

- **VFS is ephemeral on the server.** The browser serializes the full VFS into every AI request body; the server reconstructs it fresh each time and discards it after streaming. The browser is the source of truth.
- **`@/` alias in generated code maps to the VFS root `/`, not `src/`.** The import map builder translates `@/components/Foo` → blob URL for `/components/Foo.jsx`. This differs from the host Next.js app's own `@/` → `src/` alias.
- **Third-party imports auto-resolve to `esm.sh`.** Any non-relative, non-`@/` import inside generated files is mapped to `https://esm.sh/<package>` at preview time — no config needed.
- **`node-compat.cjs` shim is required at startup.** All `dev`/`build`/`start` scripts pass `--require ./node-compat.cjs` via `NODE_OPTIONS` to delete `globalThis.localStorage/sessionStorage`, which Node 25's experimental Web Storage API would otherwise expose and break SSR guards.
- **Mock provider mimics the multi-step tool-call loop.** `MockLanguageModel` in `src/lib/provider.ts` counts `tool` messages in history to advance its step sequence, emulating the agentic flow without an API key. `maxSteps` is 4 for mock, 40 for real.
- **Babel transform errors render inside the iframe.** Syntax errors appear as styled HTML in the preview panel, not in the host app UI.
- **Anonymous work is preserved on sign-up.** `anon-work-tracker.ts` saves messages + FS to `sessionStorage`; `use-auth.ts` reads it on sign-up/sign-in and creates a project from it before navigating.

### Database (Prisma / SQLite)

- `User`: id (cuid), email (unique), bcrypt password.
- `Project`: id (cuid), name, optional `userId` (null = anonymous), `messages` (JSON), `data` (serialized VFS JSON).
- Prisma client is generated into `src/generated/prisma/` (non-standard path set in `prisma/schema.prisma`).

### Routing

- `/` — anonymous landing or redirect to user's most recent project.
- `/[projectId]` — loads project from DB, passes serialized messages + VFS to `MainContent`.
- `src/middleware.ts` — protects `/api/projects` and `/api/filesystem` routes with JWT verification.
