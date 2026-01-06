import { auth } from "@dandori-ai/auth";
import { db } from "@dandori-ai/db";
import { event } from "@dandori-ai/db/schema";
import { env } from "@dandori-ai/env";
import { cors } from "@elysiajs/cors";
import { and, eq, gt, lt } from "drizzle-orm";
import {
  createInsertSchema,
  createSelectSchema,
  createUpdateSchema,
} from "drizzle-typebox";
import { Elysia, t } from "elysia";

import { syncGoogleCalendarEvents } from "./google-calendar";

const EventSchema = createSelectSchema(event);

// Transform ISO date strings from JSON to Date objects
const DateFromString = t
  .Transform(t.String({ format: "date-time" }))
  .Decode((value) => new Date(value))
  .Encode((value) => value.toISOString());

// Create schemas with date field overrides (to handle JSON string → Date conversion)
const _InsertEventSchema = createInsertSchema(event, {
  startTime: DateFromString,
  endTime: DateFromString,
});

const _UpdateEventSchema = createUpdateSchema(event, {
  startTime: DateFromString,
  endTime: DateFromString,
});

// Omit server-managed fields from body schemas
const CreateEventBody = t.Omit(_InsertEventSchema, [
  "id",
  "userId",
  "googleEventId",
  "googleCalendarId",
  "createdAt",
  "updatedAt",
]);

const UpdateEventBody = t.Omit(_UpdateEventSchema, [
  "id",
  "userId",
  "googleEventId",
  "googleCalendarId",
  "createdAt",
  "updatedAt",
]);

async function getSessionUser(request: Request) {
  const session = await auth.api.getSession({ headers: request.headers });
  if (!session?.user) {
    return null;
  }
  return session.user;
}

const app = new Elysia()
  .use(
    cors({
      origin: env.CORS_ORIGIN,
      methods: ["GET", "POST", "PATCH", "DELETE", "OPTIONS"],
      allowedHeaders: ["Content-Type", "Authorization"],
      credentials: true,
    })
  )
  .mount(auth.handler)
  .get("/", () => ({ status: "ok", timestamp: Date.now() }), {
    response: t.Object({
      status: t.String(),
      timestamp: t.Number(),
    }),
  })
  .get(
    "/api/events",
    async ({ query, request, set }) => {
      const user = await getSessionUser(request);
      if (!user) {
        set.status = 401;
        return { message: "Unauthorized" };
      }

      // Sync Google Calendar events before fetching local events
      try {
        await syncGoogleCalendarEvents(user.id, query.start, query.end);
      } catch {
        // Silently fail sync - user can still see local events
      }

      const events = await db
        .select()
        .from(event)
        .where(
          and(
            eq(event.userId, user.id),
            lt(event.startTime, query.end),
            gt(event.endTime, query.start)
          )
        );

      return events;
    },
    {
      query: t.Object({
        start: t.Date(),
        end: t.Date(),
      }),
      response: {
        200: t.Array(EventSchema),
        401: t.Object({ message: t.String() }),
      },
    }
  )
  .post(
    "/api/events",
    async ({ body, request, set }) => {
      const user = await getSessionUser(request);
      if (!user) {
        set.status = 401;
        return { message: "Unauthorized" };
      }

      const [newEvent] = await db
        .insert(event)
        .values({
          userId: user.id,
          title: body.title,
          description: body.description ?? null,
          startTime: body.startTime,
          endTime: body.endTime,
          isAllDay: body.isAllDay ?? false,
          color: body.color ?? "#3b82f6",
        })
        .returning();

      if (!newEvent) {
        set.status = 500;
        return { message: "Failed to create event" };
      }

      return newEvent;
    },
    {
      body: CreateEventBody,
      response: {
        200: EventSchema,
        401: t.Object({ message: t.String() }),
        500: t.Object({ message: t.String() }),
      },
    }
  )
  .patch(
    "/api/events/:id",
    async ({ params, body, request, set }) => {
      const user = await getSessionUser(request);
      if (!user) {
        set.status = 401;
        return { message: "Unauthorized" };
      }

      const [existingEvent] = await db
        .select()
        .from(event)
        .where(and(eq(event.id, params.id), eq(event.userId, user.id)));

      if (!existingEvent) {
        set.status = 404;
        return { message: "Event not found" };
      }

      const [updatedEvent] = await db
        .update(event)
        .set(body)
        .where(and(eq(event.id, params.id), eq(event.userId, user.id)))
        .returning();

      if (!updatedEvent) {
        set.status = 500;
        return { message: "Failed to update event" };
      }

      return updatedEvent;
    },
    {
      params: t.Object({ id: t.String() }),
      body: UpdateEventBody,
      response: {
        200: EventSchema,
        401: t.Object({ message: t.String() }),
        404: t.Object({ message: t.String() }),
        500: t.Object({ message: t.String() }),
      },
    }
  )
  .delete(
    "/api/events/:id",
    async ({ params, request, set }) => {
      const user = await getSessionUser(request);
      if (!user) {
        set.status = 401;
        return { message: "Unauthorized" };
      }

      const [existingEvent] = await db
        .select()
        .from(event)
        .where(and(eq(event.id, params.id), eq(event.userId, user.id)));

      if (!existingEvent) {
        set.status = 404;
        return { message: "Event not found" };
      }

      await db
        .delete(event)
        .where(and(eq(event.id, params.id), eq(event.userId, user.id)));

      return { success: true };
    },
    {
      params: t.Object({ id: t.String() }),
      response: {
        200: t.Object({ success: t.Boolean() }),
        401: t.Object({ message: t.String() }),
        404: t.Object({ message: t.String() }),
      },
    }
  )
  .listen(env.PORT, () => {
    console.log(`Server is running on http://localhost:${env.PORT}`);
  });

export type App = typeof app;
