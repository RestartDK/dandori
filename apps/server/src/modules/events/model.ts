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
