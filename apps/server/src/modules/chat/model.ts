import { t } from "elysia";

export const ChatMessageSchema = t.Object({
  id: t.String(),
  role: t.Union([
    t.Literal("user"),
    t.Literal("assistant"),
    t.Literal("system"),
    t.Literal("tool"),
  ]),
  content: t.Optional(t.Any()),
  parts: t.Array(t.Any()),
});

export const ChatRequestBody = t.Object({
  messages: t.Array(ChatMessageSchema),
  timezone: t.Optional(t.String()),
});

export const ExecuteRequestBody = t.Object({
  toolName: t.String(),
  args: t.Record(t.String(), t.Any()),
});

export const ExecuteSuccessResponse = t.Object({
  success: t.Boolean(),
  event: t.Optional(
    t.Object({
      id: t.String(),
      title: t.String(),
      description: t.Nullable(t.String()),
      startTime: t.String(),
      endTime: t.String(),
      isAllDay: t.Boolean(),
      color: t.String(),
    })
  ),
  message: t.Optional(t.String()),
});

export const ErrorResponse = t.Object({
  success: t.Boolean(),
  message: t.String(),
});

export const UnauthorizedResponse = t.Object({
  message: t.String(),
});
