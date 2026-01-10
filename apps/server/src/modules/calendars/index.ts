import { Elysia } from "elysia";
import { z } from "zod";

import { getSessionUser } from "@/lib/auth";
import { CalendarSchema, UpdateVisibilityBody } from "./model";
import { CalendarsService } from "./service";

export const calendars = new Elysia({ prefix: "/api/calendars" })
  .get(
    "/",
    async ({ request, set }) => {
      const user = await getSessionUser(request);
      if (!user) {
        set.status = 401;
        return { message: "Unauthorized" };
      }

      const calendarList = await CalendarsService.list(user.id);
      return calendarList;
    },
    {
      response: {
        200: z.array(CalendarSchema),
        401: z.object({ message: z.string() }),
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

      const result = await CalendarsService.updateVisibility(
        user.id,
        params.id,
        body.isVisible
      );

      if (!result.found) {
        set.status = 404;
        return { message: "Calendar not found" };
      }

      if (!result.calendar) {
        set.status = 500;
        return { message: "Failed to update calendar" };
      }

      return result.calendar;
    },
    {
      params: z.object({ id: z.string() }),
      body: UpdateVisibilityBody,
      response: {
        200: CalendarSchema,
        401: z.object({ message: z.string() }),
        404: z.object({ message: z.string() }),
        500: z.object({ message: z.string() }),
      },
    }
  );
