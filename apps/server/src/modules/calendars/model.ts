import { calendar } from "@dandori-ai/db/schema";
import { createSelectSchema } from "drizzle-zod";
import { z } from "zod";

export const CalendarSchema = createSelectSchema(calendar);

export const UpdateVisibilityBody = z.object({
  isVisible: z.boolean(),
});
