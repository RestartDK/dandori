import { db } from "@dandori-ai/db";
import { event } from "@dandori-ai/db/schema";
import { and, eq, gt, lt } from "drizzle-orm";

import { syncGoogleCalendarEvents } from "@/google-calendar";

interface CreateEventInput {
  userId: string;
  title: string;
  description?: string | null;
  startTime: Date;
  endTime: Date;
  isAllDay?: boolean;
  color?: string;
}

interface UpdateEventInput {
  title?: string;
  description?: string | null;
  startTime?: Date;
  endTime?: Date;
  isAllDay?: boolean;
  color?: string;
}

/**
 * Events service - handles all event-related database operations
 */
export abstract class EventsService {
  /**
   * List events for a user within a date range
   * Also syncs Google Calendar events before fetching
   */
  static async list(userId: string, start: Date, end: Date) {
    // Sync Google Calendar events before fetching local events
    try {
      await syncGoogleCalendarEvents(userId, start, end);
    } catch (error) {
      console.error("[Google Sync Error]", {
        userId,
        error: error instanceof Error ? error.message : error,
        stack: error instanceof Error ? error.stack : undefined,
      });
    }

    const events = await db
      .select()
      .from(event)
      .where(
        and(
          eq(event.userId, userId),
          lt(event.startTime, end),
          gt(event.endTime, start)
        )
      );

    return events;
  }

  /**
   * Create a new event
   */
  static async create(input: CreateEventInput) {
    const [newEvent] = await db
      .insert(event)
      .values({
        userId: input.userId,
        title: input.title,
        description: input.description ?? null,
        startTime: input.startTime,
        endTime: input.endTime,
        isAllDay: input.isAllDay ?? false,
        color: input.color ?? "#3b82f6",
      })
      .returning();

    return newEvent ?? null;
  }

  /**
   * Update an existing event
   */
  static async update(
    userId: string,
    eventId: string,
    input: UpdateEventInput
  ) {
    // Check if event exists and belongs to user
    const [existingEvent] = await db
      .select()
      .from(event)
      .where(and(eq(event.id, eventId), eq(event.userId, userId)));

    if (!existingEvent) {
      return { found: false, event: null };
    }

    const [updatedEvent] = await db
      .update(event)
      .set(input)
      .where(and(eq(event.id, eventId), eq(event.userId, userId)))
      .returning();

    return { found: true, event: updatedEvent ?? null };
  }

  /**
   * Delete an event
   */
  static async delete(userId: string, eventId: string) {
    // Check if event exists and belongs to user
    const [existingEvent] = await db
      .select()
      .from(event)
      .where(and(eq(event.id, eventId), eq(event.userId, userId)));

    if (!existingEvent) {
      return { found: false };
    }

    await db
      .delete(event)
      .where(and(eq(event.id, eventId), eq(event.userId, userId)));

    return { found: true };
  }
}
