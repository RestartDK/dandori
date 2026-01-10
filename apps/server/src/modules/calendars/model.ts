import { calendar } from "@dandori-ai/db/schema";
import { createSelectSchema } from "drizzle-typebox";
import { t } from "elysia";

export const CalendarSchema = createSelectSchema(calendar);

export const UpdateVisibilityBody = t.Object({
  isVisible: t.Boolean(),
});
