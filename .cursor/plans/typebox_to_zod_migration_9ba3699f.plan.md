---
name: TypeBox to Zod Migration
overview: Migrate the entire backend from TypeBox to Zod for schema validation, leveraging Elysia's Standard Schema support and replacing drizzle-typebox with drizzle-zod to eliminate schema duplication.
todos:
  - id: deps
    content: "Update package.json: remove drizzle-typebox, add drizzle-zod"
    status: pending
  - id: events-model
    content: Convert events/model.ts from TypeBox to Zod with drizzle-zod
    status: pending
    dependencies:
      - deps
  - id: calendars-model
    content: Convert calendars/model.ts from TypeBox to Zod with drizzle-zod
    status: pending
    dependencies:
      - deps
  - id: chat-model
    content: Convert chat/model.ts to Zod, import shared EventSchema
    status: pending
    dependencies:
      - events-model
  - id: events-routes
    content: Update events/index.ts to use Zod instead of t.*
    status: pending
    dependencies:
      - events-model
  - id: calendars-routes
    content: Update calendars/index.ts to use Zod instead of t.*
    status: pending
    dependencies:
      - calendars-model
  - id: main-index
    content: Update src/index.ts to use Zod for health check response
    status: pending
    dependencies:
      - deps
  - id: verify
    content: Run type check and test the API endpoints
    status: pending
    dependencies:
      - events-routes
      - calendars-routes
      - chat-model
      - main-index
---

# TypeBox to Zod Migration

## Overview

Migrate all backend validation from TypeBox to Zod. Elysia's [Standard Schema support](https://elysiajs.com/essential/validation) allows Zod schemas to be used directly in route handlers without any conversion layer.

## Changes

### 1. Update Dependencies

In [`apps/server/package.json`](apps/server/package.json):

- Remove `drizzle-typebox`
- Add `drizzle-zod`

### 2. Migrate Model Files

**[`apps/server/src/modules/events/model.ts`](apps/server/src/modules/events/model.ts)**

Replace `drizzle-typebox` imports and TypeBox schemas with `drizzle-zod`:

```typescript
import { event } from "@dandori-ai/db/schema";
import { createInsertSchema, createSelectSchema } from "drizzle-zod";
import { z } from "zod";

export const EventSchema = createSelectSchema(event);

// Create schemas with date coercion for JSON input
const InsertEventSchema = createInsertSchema(event, {
  startTime: z.coerce.date(),
  endTime: z.coerce.date(),
});

const UpdateEventSchema = InsertEventSchema.partial();

// Omit server-managed fields
export const CreateEventBody = InsertEventSchema.omit({
  id: true,
  userId: true,
  googleEventId: true,
  googleCalendarId: true,
  createdAt: true,
  updatedAt: true,
});

export const UpdateEventBody = UpdateEventSchema.omit({
  id: true,
  userId: true,
  googleEventId: true,
  googleCalendarId: true,
  createdAt: true,
  updatedAt: true,
});
```

**[`apps/server/src/modules/calendars/model.ts`](apps/server/src/modules/calendars/model.ts)**

```typescript
import { calendar } from "@dandori-ai/db/schema";
import { createSelectSchema } from "drizzle-zod";
import { z } from "zod";

export const CalendarSchema = createSelectSchema(calendar);

export const UpdateVisibilityBody = z.object({
  isVisible: z.boolean(),
});
```

**[`apps/server/src/modules/chat/model.ts`](apps/server/src/modules/chat/model.ts)**

Convert all TypeBox schemas to Zod, and import `EventSchema` from the events module to avoid duplication:

```typescript
import { z } from "zod";
import { EventSchema } from "@/modules/events/model";

export const ChatMessageSchema = z.object({
  id: z.string(),
  role: z.enum(["user", "assistant", "system", "tool"]),
  content: z.any().optional(),
  parts: z.array(z.any()),
});

export const ChatRequestBody = z.object({
  messages: z.array(ChatMessageSchema),
  timezone: z.string().optional(),
});

export const ExecuteRequestBody = z.object({
  toolName: z.string(),
  args: z.record(z.string(), z.any()),
});

// Reuse EventSchema from events module - pick only the fields needed for response
const EventResponseSchema = EventSchema.pick({
  id: true,
  title: true,
  description: true,
  startTime: true,
  endTime: true,
  isAllDay: true,
  color: true,
});

export const ExecuteSuccessResponse = z.object({
  success: z.boolean(),
  event: EventResponseSchema.optional(),
  message: z.string().optional(),
});

export const ErrorResponse = z.object({
  success: z.boolean(),
  message: z.string(),
});

export const UnauthorizedResponse = z.object({
  message: z.string(),
});
```

### 3. Update Route Files

Replace `import { t } from "elysia"` with Zod and use `z.object()` for inline schemas.

**[`apps/server/src/modules/events/index.ts`](apps/server/src/modules/events/index.ts)**

```typescript
import { Elysia } from "elysia";
import { z } from "zod";
// ... rest of imports

export const events = new Elysia({ prefix: "/api/events" })
  .get(
    "/",
    async ({ query, request, set }) => { /* ... */ },
    {
      query: z.object({
        start: z.coerce.date(),
        end: z.coerce.date(),
      }),
      response: {
        200: z.array(EventSchema),
        401: z.object({ message: z.string() }),
      },
    }
  )
  // ... similar for other routes
```

**[`apps/server/src/modules/calendars/index.ts`](apps/server/src/modules/calendars/index.ts)**

Same pattern - replace `t.` with `z.` equivalents.

**[`apps/server/src/modules/chat/index.ts`](apps/server/src/modules/chat/index.ts)**

Already imports from model - just ensure the model file is updated.

**[`apps/server/src/index.ts`](apps/server/src/index.ts)**

```typescript
import { Elysia } from "elysia";
import { z } from "zod";
// ... rest

const app = new Elysia()
  // ...
  .get("/", () => ({ status: "ok", timestamp: Date.now() }), {
    response: z.object({
      status: z.string(),
      timestamp: z.number(),
    }),
  })
  // ...
```

### 4. No Changes Needed

- [`apps/server/src/modules/chat/agent/tools.ts`](apps/server/src/modules/chat/agent/tools.ts) - Already uses Zod

## TypeBox to Zod Mapping

| TypeBox | Zod |

|---------|-----|

| `t.String()` | `z.string()` |

| `t.Number()` | `z.number()` |

| `t.Boolean()` | `z.boolean()` |

| `t.Object({})` | `z.object({})` |

| `t.Array(T)` | `z.array(T)` |

| `t.Optional(T)` | `T.optional()` |

| `t.Nullable(T)` | `T.nullable()` |

| `t.Union([...])` | `z.union([...])` |

| `t.Literal("x")` | `z.literal("x")` |

| `t.Any()` | `z.any()` |

| `t.Record(K, V)` | `z.record(K, V)` |

| `t.Date()` | `z.coerce.date()` |

| `t.Omit(S, [...])`| `S.omit({...})` |

## Benefits

1. **Single validation library** - Zod everywhere (AI SDK, forms, API routes)
2. **No schema duplication** - Event schemas shared between modules
3. **Better ecosystem** - Zod has more utilities and community support
4. **Type inference** - `z.infer<typeof Schema>` works the same as TypeBox
