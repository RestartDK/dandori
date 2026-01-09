import { Elysia, t } from "elysia";

import { getSessionUser } from "@/lib/auth";
import { CreateEventBody, EventSchema, UpdateEventBody } from "./model";
import { EventsService } from "./service";

export const events = new Elysia({ prefix: "/api/events" })
  .get(
    "/",
    async ({ query, request, set }) => {
      const user = await getSessionUser(request);
      if (!user) {
        set.status = 401;
        return { message: "Unauthorized" };
      }

      const eventList = await EventsService.list(
        user.id,
        query.start,
        query.end
      );
      return eventList;
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
    "/",
    async ({ body, request, set }) => {
      const user = await getSessionUser(request);
      if (!user) {
        set.status = 401;
        return { message: "Unauthorized" };
      }

      const newEvent = await EventsService.create({
        userId: user.id,
        title: body.title,
        description: body.description ?? null,
        startTime: body.startTime,
        endTime: body.endTime,
        isAllDay: body.isAllDay ?? false,
        color: body.color ?? "#3b82f6",
      });

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
    "/:id",
    async ({ params, body, request, set }) => {
      const user = await getSessionUser(request);
      if (!user) {
        set.status = 401;
        return { message: "Unauthorized" };
      }

      const result = await EventsService.update(user.id, params.id, body);

      if (!result.found) {
        set.status = 404;
        return { message: "Event not found" };
      }

      if (!result.event) {
        set.status = 500;
        return { message: "Failed to update event" };
      }

      return result.event;
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
    "/:id",
    async ({ params, request, set }) => {
      const user = await getSessionUser(request);
      if (!user) {
        set.status = 401;
        return { message: "Unauthorized" };
      }

      const result = await EventsService.delete(user.id, params.id);

      if (!result.found) {
        set.status = 404;
        return { message: "Event not found" };
      }

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
  );
