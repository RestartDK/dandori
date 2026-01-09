import { db } from "@dandori-ai/db";
import { event } from "@dandori-ai/db/schema";
import { and, eq } from "drizzle-orm";

interface EventResponse {
  id: string;
  title: string;
  description: string | null;
  startTime: string;
  endTime: string;
  isAllDay: boolean;
  color: string;
}

type ExecuteResult =
  | { success: true; event: EventResponse }
  | { success: true }
  | { success: false; message: string; notFound?: boolean };

/**
 * Chat service - handles tool execution for the chat agent
 */
export abstract class ChatService {
  /**
   * Execute a tool call approved by the user
   */
  static async executeToolCall(
    userId: string,
    toolName: string,
    args: Record<string, unknown>
  ): Promise<ExecuteResult> {
    switch (toolName) {
      case "createEvent": {
        const [newEvent] = await db
          .insert(event)
          .values({
            userId,
            title: args.title as string,
            description: (args.description as string | undefined) ?? null,
            startTime: new Date(args.startTime as string),
            endTime: new Date(args.endTime as string),
            isAllDay: (args.isAllDay as boolean | undefined) ?? false,
            color: (args.color as string | undefined) ?? "#3b82f6",
          })
          .returning();

        if (!newEvent) {
          return { success: false, message: "Failed to create event" };
        }

        return {
          success: true,
          event: {
            id: newEvent.id,
            title: newEvent.title,
            description: newEvent.description,
            startTime: newEvent.startTime.toISOString(),
            endTime: newEvent.endTime.toISOString(),
            isAllDay: newEvent.isAllDay,
            color: newEvent.color,
          },
        };
      }

      case "updateEvent": {
        const eventId = args.eventId as string;

        const [existingEvent] = await db
          .select()
          .from(event)
          .where(and(eq(event.id, eventId), eq(event.userId, userId)));

        if (!existingEvent) {
          return { success: false, message: "Event not found", notFound: true };
        }

        const updates: Record<string, unknown> = {};
        // Only update fields that have actual values (not empty strings)
        if (args.title !== undefined && args.title !== "") {
          updates.title = args.title;
        }
        if (args.description !== undefined) {
          updates.description = args.description;
        }
        if (args.startTime !== undefined && args.startTime !== "") {
          updates.startTime = new Date(args.startTime as string);
        }
        if (args.endTime !== undefined && args.endTime !== "") {
          updates.endTime = new Date(args.endTime as string);
        }
        if (args.isAllDay !== undefined) {
          updates.isAllDay = args.isAllDay;
        }
        if (args.color !== undefined && args.color !== "") {
          updates.color = args.color;
        }

        const [updatedEvent] = await db
          .update(event)
          .set(updates)
          .where(and(eq(event.id, eventId), eq(event.userId, userId)))
          .returning();

        if (!updatedEvent) {
          return { success: false, message: "Failed to update event" };
        }

        return {
          success: true,
          event: {
            id: updatedEvent.id,
            title: updatedEvent.title,
            description: updatedEvent.description,
            startTime: updatedEvent.startTime.toISOString(),
            endTime: updatedEvent.endTime.toISOString(),
            isAllDay: updatedEvent.isAllDay,
            color: updatedEvent.color,
          },
        };
      }

      case "deleteEvent": {
        const eventId = args.eventId as string;

        const [existingEvent] = await db
          .select()
          .from(event)
          .where(and(eq(event.id, eventId), eq(event.userId, userId)));

        if (!existingEvent) {
          return { success: false, message: "Event not found", notFound: true };
        }

        await db
          .delete(event)
          .where(and(eq(event.id, eventId), eq(event.userId, userId)));

        return { success: true };
      }

      default:
        return { success: false, message: "Unknown tool" };
    }
  }
}
