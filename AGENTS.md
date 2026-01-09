# Agent Guidelines

## Build & Dev Commands

- **Package manager**: `bun` (v1.3.4)
- **Dev**: `bun dev` (all), `bun dev:web`, `bun dev:server`
- **Build**: `bun build`
- **Type check**: `bun check-types`
- **Lint/Format**: `bun check` (auto-fix), `bun lint` (check only)
- **Database**: `bun db:start`, `bun db:migrate`, `bun db:generate`, `bun db:studio`

## Code Style (Ultracite/Biome)

- Use `const` by default, `let` when needed, never `var`
- Arrow functions for callbacks; `for...of` over `.forEach()`
- Explicit types for function params/returns; prefer `unknown` over `any`
- Use optional chaining (`?.`) and nullish coalescing (`??`)
- Template literals over string concatenation; use destructuring
- React: function components, hooks at top level, proper `key` props
- Async: always `await` promises, use try-catch, no floating promises
- No `console.log`/`debugger` in production; throw `Error` objects, not strings
- Early returns over nested conditionals; keep functions focused
- Security: `rel="noopener"` with `target="_blank"`, avoid `dangerouslySetInnerHTML`

## Project Structure

Monorepo with Turborepo: `apps/` (web, server) and `packages/` (auth, db, config).
TypeScript strict mode with `noUncheckedIndexedAccess`, `noUnusedLocals/Parameters`.

### Server Architecture (Feature-Based Modules)

The server follows a feature-based module structure:

```
apps/server/src/
  index.ts              # Entrypoint - composes modules
  lib/
    auth.ts             # Shared utilities (getSessionUser)
  modules/
    events/              # Events feature module
      index.ts          # Elysia controller (routes)
      service.ts        # Business logic (DB operations)
      model.ts          # TypeBox schemas
    chat/                # Chat feature module
      index.ts          # Elysia controller (routes)
      service.ts        # Business logic (tool execution)
      model.ts          # TypeBox schemas
      agent/            # Agent implementation
        calendar-agent.ts
        tools.ts
```

**Key principles:**

- **Use path aliases**: Always use `@/*` imports instead of relative paths (`../`)
- **Separation of concerns**: Controllers handle HTTP, services handle business logic
- **Shared utilities**: Common code (like auth) goes in `lib/`
- **Module composition**: `index.ts` composes modules via `.use()`

## UI Components

**NEVER** edit files in `apps/web/src/components/ui/` unless specifically requested. These are atomic shadcn components and should remain untouched. Apply styling overrides via `className` props when using these components.

## Type Management

Types flow from **Drizzle schema → TypeBox → Elysia → Treaty**. This ensures a single source of truth.

### Drizzle + TypeBox

Use `drizzle-typebox` to generate TypeBox schemas directly from Drizzle table definitions:

- `createSelectSchema(table)` for response types
- `createInsertSchema(table)` for create request bodies
- `createUpdateSchema(table)` for update request bodies
- Use `t.Omit()` to exclude server-managed fields (id, userId, timestamps)

### Elysia Treaty as Source of Truth

- Server exports `export type App = typeof app;`
- Web imports this and creates a typed client: `treaty<App>(...)`
- **NEVER** create separate TypeScript interfaces/types for API requests or responses
- Frontend types are automatically inferred from the Elysia route definitions
- If you need a type on the frontend, extract it from the Treaty client

## Environment Variables

Type-safe env is handled by `@dandori-ai/env` with two exports:

- **`@dandori-ai/env`** → Server-side (uses `process.env`)
- **`@dandori-ai/env/client`** → Client-side for Vite (uses `import.meta.env`)

```typescript
// Server (packages/auth, packages/db, apps/server)
import { env } from "@dandori-ai/env";
env.DATABASE_URL  // required - throws if missing
env.PORT          // optional - defaults to "3000"

// Client (apps/web)
import { env } from "@dandori-ai/env/client";
env.VITE_SERVER_URL  // required - throws if missing
```

**Never** use raw `process.env` or `import.meta.env` directly. Always use the typed `env` object.

### Turborepo Configuration

**ALWAYS** add new environment variables to `turbo.json` when adding them to the codebase. Environment variables used at runtime must be declared in the relevant task's `env` array (e.g., `server#start`, `web#build`) so Turborepo knows they're required dependencies. This ensures proper caching and deployment configuration.

## Deployment

Uses **Railpack** for builds and **Dokploy** for deployment. Web and server are deployed as separate applications. Database is also hosted on Dokploy.
