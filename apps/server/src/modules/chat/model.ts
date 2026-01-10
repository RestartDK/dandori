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
// Transform Date fields to strings for JSON serialization
const EventResponseSchema = EventSchema.pick({
  id: true,
  title: true,
  description: true,
  startTime: true,
  endTime: true,
  isAllDay: true,
  color: true,
}).extend({
  startTime: z.string(),
  endTime: z.string(),
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
