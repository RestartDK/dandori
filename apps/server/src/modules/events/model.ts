import { event } from "@dandori-ai/db/schema";
import {
  createInsertSchema,
  createSelectSchema,
  createUpdateSchema,
} from "drizzle-typebox";
import { t } from "elysia";

export const EventSchema = createSelectSchema(event);

// Transform ISO date strings from JSON to Date objects
export const DateFromString = t
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
export const CreateEventBody = t.Omit(_InsertEventSchema, [
  "id",
  "userId",
  "googleEventId",
  "googleCalendarId",
  "createdAt",
  "updatedAt",
]);

export const UpdateEventBody = t.Omit(_UpdateEventSchema, [
  "id",
  "userId",
  "googleEventId",
  "googleCalendarId",
  "createdAt",
  "updatedAt",
]);
