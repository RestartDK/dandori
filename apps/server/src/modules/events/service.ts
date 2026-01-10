import { db } from "@dandori-ai/db";
import { calendar, event } from "@dandori-ai/db/schema";
import { and, eq, gt, inArray, isNull, lt, or } from "drizzle-orm";

import {
  createGoogleEvent,
  deleteGoogleEvent,
  getDefaultCalendarId,
  syncGoogleCalendarEvents,
  updateGoogleEvent,
} from "@/google-calendar";

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
   * Only returns events from visible calendars
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

    // Get visible calendar IDs for this user
    const visibleCalendars = await db
      .select({ googleCalendarId: calendar.googleCalendarId })
      .from(calendar)
      .where(and(eq(calendar.userId, userId), eq(calendar.isVisible, true)));

    const visibleCalendarIds = visibleCalendars.map((c) => c.googleCalendarId);

    // Fetch events that are either:
    // 1. From a visible calendar (googleCalendarId is in visibleCalendarIds)
    // 2. Local events (googleCalendarId is null)
    const events = await db
      .select()
      .from(event)
      .where(
        and(
          eq(event.userId, userId),
          lt(event.startTime, end),
          gt(event.endTime, start),
          or(
            isNull(event.googleCalendarId),
            visibleCalendarIds.length > 0
              ? inArray(event.googleCalendarId, visibleCalendarIds)
              : // If no visible calendars, only show local events
                isNull(event.googleCalendarId)
          )
        )
      );

    return events;
  }

  /**
   * Create a new event
   * Creates locally first, then syncs to Google Calendar
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

    if (!newEvent) {
      return null;
    }

    // Sync to Google Calendar
    try {
      const calendarId = await getDefaultCalendarId(input.userId);
      if (calendarId) {
        const googleEventId = await createGoogleEvent(
          input.userId,
          calendarId,
          {
            title: input.title,
            description: input.description,
            startTime: input.startTime,
            endTime: input.endTime,
            isAllDay: input.isAllDay,
          }
        );

        if (googleEventId) {
          // Update local event with Google IDs
          const [updatedEvent] = await db
            .update(event)
            .set({
              googleEventId,
              googleCalendarId: calendarId,
            })
            .where(eq(event.id, newEvent.id))
            .returning();

          return updatedEvent ?? newEvent;
        }
      }
    } catch (error) {
      console.error("[Google Sync Error] Failed to sync new event:", {
        eventId: newEvent.id,
        error: error instanceof Error ? error.message : error,
      });
      // Continue - local event was created successfully
    }

    return newEvent;
  }

  /**
   * Update an existing event
   * Updates locally first, then syncs to Google Calendar
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

    // Sync to Google Calendar if event has a Google ID
    if (existingEvent.googleEventId && existingEvent.googleCalendarId) {
      try {
        // Use existing event values as fallback for times (Google needs both start and end)
        const isAllDay = input.isAllDay ?? existingEvent.isAllDay;
        const startTime = input.startTime ?? existingEvent.startTime;
        const endTime = input.endTime ?? existingEvent.endTime;

        await updateGoogleEvent(
          userId,
          existingEvent.googleCalendarId,
          existingEvent.googleEventId,
          {
            title: input.title,
            description: input.description,
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

    return { found: true, event: updatedEvent ?? null };
  }

  /**
   * Delete an event
   * Deletes from Google Calendar first, then locally
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

    // Delete from Google Calendar first if event has a Google ID
    if (existingEvent.googleEventId && existingEvent.googleCalendarId) {
      try {
        await deleteGoogleEvent(
          userId,
          existingEvent.googleCalendarId,
          existingEvent.googleEventId
        );
      } catch (error) {
        console.error(
          "[Google Sync Error] Failed to delete event from Google:",
          {
            eventId,
            googleEventId: existingEvent.googleEventId,
            error: error instanceof Error ? error.message : error,
          }
        );
        // Continue - still delete locally
      }
    }

    await db
      .delete(event)
      .where(and(eq(event.id, eventId), eq(event.userId, userId)));

    return { found: true };
  }
}
