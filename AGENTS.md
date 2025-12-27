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

## Deployment
Uses **Railpack** for builds and **Dokploy** for deployment. Web and server are deployed as separate applications. Database is also hosted on Dokploy.
