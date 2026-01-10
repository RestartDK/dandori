import { Elysia, t } from "elysia";

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
        200: t.Array(CalendarSchema),
        401: t.Object({ message: t.String() }),
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
      params: t.Object({ id: t.String() }),
      body: UpdateVisibilityBody,
      response: {
        200: CalendarSchema,
        401: t.Object({ message: t.String() }),
        404: t.Object({ message: t.String() }),
        500: t.Object({ message: t.String() }),
      },
    }
  );
