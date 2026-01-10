import { db } from "@dandori-ai/db";
import { event } from "@dandori-ai/db/schema";
import { and, eq } from "drizzle-orm";

import {
  createGoogleEvent,
  deleteGoogleEvent,
  getDefaultCalendarId,
  updateGoogleEvent,
} from "@/google-calendar";

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
   * Syncs changes with Google Calendar
   */
  static async executeToolCall(
    userId: string,
    toolName: string,
    args: Record<string, unknown>
  ): Promise<ExecuteResult> {
    switch (toolName) {
      case "createEvent": {
        const title = args.title as string;
        const description = (args.description as string | undefined) ?? null;
        const startTime = new Date(args.startTime as string);
        const endTime = new Date(args.endTime as string);
        const isAllDay = (args.isAllDay as boolean | undefined) ?? false;
        const color = (args.color as string | undefined) ?? "#3b82f6";

        const [newEvent] = await db
          .insert(event)
          .values({
            userId,
            title,
            description,
            startTime,
            endTime,
            isAllDay,
            color,
          })
          .returning();

        if (!newEvent) {
          return { success: false, message: "Failed to create event" };
        }

        // Sync to Google Calendar
        let finalEvent = newEvent;
        try {
          const calendarId = await getDefaultCalendarId(userId);
          if (calendarId) {
            const googleEventId = await createGoogleEvent(userId, calendarId, {
              title,
              description,
              startTime,
              endTime,
              isAllDay,
            });

            if (googleEventId) {
              const [updatedEvent] = await db
                .update(event)
                .set({
                  googleEventId,
                  googleCalendarId: calendarId,
                })
                .where(eq(event.id, newEvent.id))
                .returning();

              if (updatedEvent) {
                finalEvent = updatedEvent;
              }
            }
          }
        } catch (error) {
          console.error("[Google Sync Error] Failed to sync new event:", {
            eventId: newEvent.id,
            error: error instanceof Error ? error.message : error,
          });
          // Continue - local event was created successfully
        }

        return {
          success: true,
          event: {
            id: finalEvent.id,
            title: finalEvent.title,
            description: finalEvent.description,
            startTime: finalEvent.startTime.toISOString(),
            endTime: finalEvent.endTime.toISOString(),
            isAllDay: finalEvent.isAllDay,
            color: finalEvent.color,
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

        const updates: Partial<typeof event.$inferInsert> = {};
        // Only update fields that have actual values (not empty strings)
        if (args.title !== undefined && args.title !== "") {
          updates.title = args.title as string;
        }
        if (args.description !== undefined) {
          updates.description = args.description as string | null;
        }
        if (args.startTime !== undefined && args.startTime !== "") {
          updates.startTime = new Date(args.startTime as string);
        }
        if (args.endTime !== undefined && args.endTime !== "") {
          updates.endTime = new Date(args.endTime as string);
        }
        if (args.isAllDay !== undefined) {
          updates.isAllDay = args.isAllDay as boolean;
        }
        if (args.color !== undefined && args.color !== "") {
          updates.color = args.color as string;
        }

        const [updatedEvent] = await db
          .update(event)
          .set(updates)
          .where(and(eq(event.id, eventId), eq(event.userId, userId)))
          .returning();

        if (!updatedEvent) {
          return { success: false, message: "Failed to update event" };
        }

        // Sync to Google Calendar if event has a Google ID
        if (existingEvent.googleEventId && existingEvent.googleCalendarId) {
          try {
            // Use existing event values as fallback for times (Google needs both start and end)
            const isAllDay = updates.isAllDay ?? existingEvent.isAllDay;
            const startTime = updates.startTime ?? existingEvent.startTime;
            const endTime = updates.endTime ?? existingEvent.endTime;

            await updateGoogleEvent(
              userId,
              existingEvent.googleCalendarId,
              existingEvent.googleEventId,
              {
                title: updates.title,
                description: updates.description,
                startTime,
                endTime,
                isAllDay,
              }
            );
          } catch (error) {
            console.error("[Google Sync Error] Failed to sync event update:", {
              eventId,
              googleEventId: existingEvent.googleEventId,
              error: error instanceof Error ? error.message : error,
            });
            // Continue - local event was updated successfully
          }
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

        // Delete from Google Calendar first if event has a Google ID
        if (existingEvent.googleEventId && existingEvent.googleCalendarId) {
          try {
            await deleteGoogleEvent(
              userId,
              existingEvent.googleCalendarId,
              existingEvent.googleEventId
            );
          } catch (error) {
            console.error("[Google Sync Error] Failed to delete from Google:", {
              eventId,
              googleEventId: existingEvent.googleEventId,
              error: error instanceof Error ? error.message : error,
            });
            // Continue - still delete locally
          }
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
