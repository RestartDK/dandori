import type { UIMessage } from "ai";
import { Elysia } from "elysia";

import { getSessionUser } from "@/lib/auth";
import { createCalendarAgent } from "./agent/calendar-agent";
import {
  ChatRequestBody,
  ErrorResponse,
  ExecuteRequestBody,
  ExecuteSuccessResponse,
  UnauthorizedResponse,
} from "./model";
import { ChatService } from "./service";

export const chat = new Elysia({ prefix: "/api/chat" })
  // AI Chat endpoint - streams responses via SSE
  .post(
    "/",
    async ({ body, request, set }) => {
      const user = await getSessionUser(request);
      if (!user) {
        set.status = 401;
        return new Response(JSON.stringify({ message: "Unauthorized" }), {
          status: 401,
          headers: { "Content-Type": "application/json" },
        });
      }

      // Cast body.messages to UIMessage[] - useChat sends proper UIMessage format
      const messages = body.messages as unknown as UIMessage[];

      // Get timezone from request body, default to UTC if not provided
      const timezone = body.timezone ?? "UTC";

      // Create agent with user context
      const result = await createCalendarAgent({
        messages,
        context: {
          userId: user.id,
          userName: user.name,
          userEmail: user.email,
          userTimezone: timezone,
        },
      });

      // Return SSE stream
      return result.toUIMessageStreamResponse();
    },
    {
      body: ChatRequestBody,
    }
  )
  // Execute approved tool calls (create/update/delete events)
  .post(
    "/execute",
    async ({ body, request, set }) => {
      const user = await getSessionUser(request);
      if (!user) {
        set.status = 401;
        return { message: "Unauthorized" };
      }

      const result = await ChatService.executeToolCall(
        user.id,
        body.toolName,
        body.args
      );

      if (!result.success) {
        if ("notFound" in result && result.notFound) {
          set.status = 404;
        } else if (result.message === "Unknown tool") {
          set.status = 400;
        } else {
          set.status = 500;
        }
        return { success: false, message: result.message };
      }

      if ("event" in result) {
        return { success: true, event: result.event };
      }

      return { success: true };
    },
    {
      body: ExecuteRequestBody,
      response: {
        200: ExecuteSuccessResponse,
        400: ErrorResponse,
        401: UnauthorizedResponse,
        404: ErrorResponse,
        500: ErrorResponse,
      },
    }
  );
