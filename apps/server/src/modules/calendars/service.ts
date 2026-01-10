import { db } from "@dandori-ai/db";
import { calendar } from "@dandori-ai/db/schema";
import { and, asc, eq } from "drizzle-orm";

import { syncGoogleCalendars } from "@/google-calendar";

/**
 * Calendars service - handles all calendar-related database operations
 */
export abstract class CalendarsService {
  /**
   * List calendars for a user
   * Also syncs Google Calendars before fetching
   */
  static async list(userId: string) {
    // Sync Google Calendars before fetching local calendars
    try {
      await syncGoogleCalendars(userId);
    } catch (error) {
      // Continue - fetch local calendars even if sync fails
    }

    const calendars = await db
      .select()
      .from(calendar)
      .where(eq(calendar.userId, userId))
      .orderBy(asc(calendar.createdAt));

    return calendars;
  }

  /**
   * Update calendar visibility
   */
  static async updateVisibility(
    userId: string,
    calendarId: string,
    isVisible: boolean
  ) {
    // Check if calendar exists and belongs to user
    const [existingCalendar] = await db
      .select()
      .from(calendar)
      .where(and(eq(calendar.id, calendarId), eq(calendar.userId, userId)));

    if (!existingCalendar) {
      return { found: false, calendar: null };
    }

    const [updatedCalendar] = await db
      .update(calendar)
      .set({ isVisible })
      .where(and(eq(calendar.id, calendarId), eq(calendar.userId, userId)))
      .returning();

    return { found: true, calendar: updatedCalendar ?? null };
  }
}
