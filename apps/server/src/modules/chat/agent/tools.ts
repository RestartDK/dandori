import { db } from "@dandori-ai/db";
import { event } from "@dandori-ai/db/schema";
import type { ToolSet } from "ai";
import { tool } from "ai";
import { and, eq, gt, gte, lt, lte } from "drizzle-orm";
import { z } from "zod";

import {
  createGoogleEvent,
  deleteGoogleEvent,
  getDefaultCalendarId,
  updateGoogleEvent,
} from "@/google-calendar";

export interface AgentContext {
  userId: string;
  userName: string;
  userEmail: string;
  userTimezone: string;
}

function isDateOnly(input: string): boolean {
  return /^\d{4}-\d{2}-\d{2}$/.test(input);
}

function parseDateInput(input: string): Date {
  // Important: `new Date("YYYY-MM-DD")` parses as UTC midnight. For date-only inputs
  // we want local midnight so that "today" works as expected on the server.
  if (isDateOnly(input)) {
    return new Date(`${input}T00:00:00`);
  }
  return new Date(input);
}

function normalizeDateRange(
  startInput: string,
  endInput: string
): { rangeStart: Date; rangeEndExclusive: Date } {
  const rangeStart = parseDateInput(startInput);
  const rawEnd = parseDateInput(endInput);

  if (Number.isNaN(rangeStart.getTime())) {
    throw new Error(`Invalid startDate: ${startInput}`);
  }
  if (Number.isNaN(rawEnd.getTime())) {
    throw new Error(`Invalid endDate: ${endInput}`);
  }

  // Treat date-only end as inclusive-day input, convert to exclusive upper bound.
  const rangeEndExclusive = new Date(rawEnd);
  if (isDateOnly(endInput)) {
    rangeEndExclusive.setDate(rangeEndExclusive.getDate() + 1);
  }

  // If the range is empty (e.g. start === end), assume caller meant "that day".
  if (rangeEndExclusive.getTime() <= rangeStart.getTime()) {
    rangeEndExclusive.setTime(rangeStart.getTime());
    rangeEndExclusive.setDate(rangeEndExclusive.getDate() + 1);
  }

  return { rangeStart, rangeEndExclusive };
}

/**
 * Formats a Date in the user's timezone with offset
 * e.g., "2026-01-10T12:00:00+01:00" for Madrid
 */
function formatDateInTimezone(date: Date, timezone: string): string {
  const formatter = new Intl.DateTimeFormat("sv-SE", {
    timeZone: timezone,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
    hour12: false,
  });

  const parts = formatter.formatToParts(date);
  const get = (type: string) => parts.find((p) => p.type === type)?.value ?? "";

  const dateStr = `${get("year")}-${get("month")}-${get("day")}T${get("hour")}:${get("minute")}:${get("second")}`;

  // Get timezone offset
  const offsetFormatter = new Intl.DateTimeFormat("en-US", {
    timeZone: timezone,
    timeZoneName: "shortOffset",
  });
  const offsetParts = offsetFormatter.formatToParts(date);
  const offsetPart = offsetParts.find((p) => p.type === "timeZoneName");
  const offsetStr = offsetPart?.value ?? "GMT+0";
  const match = offsetStr.match(/GMT([+-])(\d{1,2})(?::(\d{2}))?/);
  let offset = "+00:00";
  if (match) {
    const sign = match[1];
    const hours = match[2]?.padStart(2, "0") ?? "00";
    const minutes = match[3] ?? "00";
    offset = `${sign}${hours}:${minutes}`;
  }

  return `${dateStr}${offset}`;
}

// Schema for event data returned from tools
const EventResultSchema = z.object({
  id: z.string(),
  title: z.string(),
  description: z.string().nullable(),
  startTime: z.string(),
  endTime: z.string(),
  isAllDay: z.boolean(),
  color: z.string(),
});

export type EventResult = z.infer<typeof EventResultSchema>;

// Schema for free time slots
const FreeTimeSlotSchema = z.object({
  start: z.string(),
  end: z.string(),
  durationMinutes: z.number(),
});

export const createCalendarTools = (context: AgentContext): ToolSet => ({
  /**
   * Create a new calendar event
   * Requires user approval before execution
   * Syncs to Google Calendar after creating locally
   */
  createEvent: tool({
    description:
      "Create a new calendar event. Use this when the user wants to schedule something new. Always confirm the details with the user before calling this tool.",
    inputSchema: z.object({
      title: z.string().describe("The title of the event"),
      description: z
        .string()
        .optional()
        .describe("Optional description of the event"),
      startTime: z
        .string()
        .describe(
          "Start time in ISO 8601 format with timezone offset matching the user's timezone (e.g., 2026-01-07T09:00:00-08:00 for Pacific Time). Always include the timezone offset."
        ),
      endTime: z
        .string()
        .describe(
          "End time in ISO 8601 format with timezone offset matching the user's timezone (e.g., 2026-01-07T10:00:00-08:00 for Pacific Time). Always include the timezone offset."
        ),
      isAllDay: z
        .boolean()
        .optional()
        .default(false)
        .describe("Whether this is an all-day event"),
      color: z
        .string()
        .optional()
        .default("#3b82f6")
        .describe("Event color in hex format"),
    }),
    needsApproval: true,
    execute: async ({
      title,
      description,
      startTime,
      endTime,
      isAllDay,
      color,
    }) => {
      const startDate = new Date(startTime);
      const endDate = new Date(endTime);

      const [newEvent] = await db
        .insert(event)
        .values({
          userId: context.userId,
          title,
          description: description ?? null,
          startTime: startDate,
          endTime: endDate,
          isAllDay: isAllDay ?? false,
          color: color ?? "#3b82f6",
        })
        .returning();

      if (!newEvent) {
        return { success: false, error: "Failed to create event" };
      }

      // Sync to Google Calendar
      let finalEvent = newEvent;
      try {
        const calendarId = await getDefaultCalendarId(context.userId);
        if (calendarId) {
          const googleEventId = await createGoogleEvent(
            context.userId,
            calendarId,
            {
              title,
              description,
              startTime: startDate,
              endTime: endDate,
              isAllDay,
            }
          );

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
          startTime: formatDateInTimezone(
            finalEvent.startTime,
            context.userTimezone
          ),
          endTime: formatDateInTimezone(
            finalEvent.endTime,
            context.userTimezone
          ),
          isAllDay: finalEvent.isAllDay,
          color: finalEvent.color,
        },
      };
    },
  }),

  /**
   * Read events within a date range
   */
  readEvents: tool({
    description:
      "Read calendar events within a specified date range. Use this to check what events exist, find conflicts, or review the schedule.",
    inputSchema: z.object({
      startDate: z
        .string()
        .describe(
          "Start of date range in ISO 8601 format. Date-only (YYYY-MM-DD) is allowed."
        ),
      endDate: z
        .string()
        .describe(
          "End of date range in ISO 8601 format. Date-only (YYYY-MM-DD) is treated as inclusive of that day."
        ),
    }),
    execute: async ({ startDate, endDate }) => {
      const { rangeStart, rangeEndExclusive } = normalizeDateRange(
        startDate,
        endDate
      );

      // Overlap detection: event overlaps range if it starts before range end AND ends after range start
      const events = await db
        .select()
        .from(event)
        .where(
          and(
            eq(event.userId, context.userId),
            lt(event.startTime, rangeEndExclusive),
            gt(event.endTime, rangeStart)
          )
        );

      return {
        count: events.length,
        events: events.map((e) => ({
          id: e.id,
          title: e.title,
          description: e.description,
          startTime: formatDateInTimezone(e.startTime, context.userTimezone),
          endTime: formatDateInTimezone(e.endTime, context.userTimezone),
          isAllDay: e.isAllDay,
          color: e.color,
        })),
      };
    },
  }),

  /**
   * Update an existing calendar event
   * Requires user approval before execution
   * Syncs to Google Calendar after updating locally
   */
  updateEvent: tool({
    description:
      "Update an existing calendar event. Use this to modify event details like title, time, or description. Always show what will change before calling this tool.",
    inputSchema: z.object({
      eventId: z.string().describe("The ID of the event to update"),
      title: z.string().optional().describe("New title for the event"),
      description: z
        .string()
        .optional()
        .describe("New description for the event"),
      startTime: z
        .string()
        .optional()
        .describe(
          "New start time in ISO 8601 format with timezone offset matching the user's timezone (e.g., 2026-01-07T09:00:00-08:00). Always include the timezone offset."
        ),
      endTime: z
        .string()
        .optional()
        .describe(
          "New end time in ISO 8601 format with timezone offset matching the user's timezone (e.g., 2026-01-07T10:00:00-08:00). Always include the timezone offset."
        ),
      isAllDay: z
        .boolean()
        .optional()
        .describe("Whether this is an all-day event"),
      color: z.string().optional().describe("New event color in hex format"),
    }),
    needsApproval: true,
    execute: async (input) => {
      console.log("[Agent Update] Tool called with input:", {
        eventId: input.eventId,
        title: input.title,
        description: input.description,
        startTime: input.startTime,
        endTime: input.endTime,
        isAllDay: input.isAllDay,
        color: input.color,
      });

      const [existingEvent] = await db
        .select()
        .from(event)
        .where(
          and(eq(event.id, input.eventId), eq(event.userId, context.userId))
        );

      if (!existingEvent) {
        console.log("[Agent Update] Event not found:", input.eventId);
        return { success: false, error: "Event not found" };
      }

      console.log("[Agent Update] Found existing event:", {
        id: existingEvent.id,
        title: existingEvent.title,
        googleEventId: existingEvent.googleEventId,
        googleCalendarId: existingEvent.googleCalendarId,
        startTime: existingEvent.startTime.toISOString(),
        endTime: existingEvent.endTime.toISOString(),
        isAllDay: existingEvent.isAllDay,
      });

      // Only update fields that have actual values (not empty strings)
      const updateData: Partial<typeof event.$inferInsert> = {};
      if (input.title !== undefined && input.title !== "") {
        updateData.title = input.title;
      }
      if (input.description !== undefined) {
        updateData.description = input.description;
      }
      if (input.startTime !== undefined && input.startTime !== "") {
        updateData.startTime = new Date(input.startTime);
      }
      if (input.endTime !== undefined && input.endTime !== "") {
        updateData.endTime = new Date(input.endTime);
      }
      if (input.isAllDay !== undefined) {
        updateData.isAllDay = input.isAllDay;
      }
      if (input.color !== undefined && input.color !== "") {
        updateData.color = input.color;
      }

      console.log("[Agent Update] Built updateData:", {
        title: updateData.title,
        description: updateData.description,
        startTime: updateData.startTime?.toISOString(),
        endTime: updateData.endTime?.toISOString(),
        isAllDay: updateData.isAllDay,
        color: updateData.color,
        fieldsToUpdate: Object.keys(updateData),
      });

      const [updatedEvent] = await db
        .update(event)
        .set(updateData)
        .where(
          and(eq(event.id, input.eventId), eq(event.userId, context.userId))
        )
        .returning();

      if (!updatedEvent) {
        return { success: false, error: "Failed to update event" };
      }

      // Sync to Google Calendar if event has a Google ID
      console.log("[Agent Update] Checking Google sync conditions:", {
        hasGoogleEventId: !!existingEvent.googleEventId,
        hasGoogleCalendarId: !!existingEvent.googleCalendarId,
        googleEventId: existingEvent.googleEventId,
        googleCalendarId: existingEvent.googleCalendarId,
      });

      if (existingEvent.googleEventId && existingEvent.googleCalendarId) {
        try {
          // Use existing event values as fallback for times (Google needs both start and end)
          const isAllDay = updateData.isAllDay ?? existingEvent.isAllDay;
          const startTime = updateData.startTime ?? existingEvent.startTime;
          const endTime = updateData.endTime ?? existingEvent.endTime;

          console.log("[Agent Update] Syncing to Google Calendar:", {
            userId: context.userId,
            googleCalendarId: existingEvent.googleCalendarId,
            googleEventId: existingEvent.googleEventId,
            updateDataTitle: updateData.title,
            updateDataDescription: updateData.description,
            updateDataStartTime: updateData.startTime?.toISOString(),
            updateDataEndTime: updateData.endTime?.toISOString(),
            updateDataIsAllDay: updateData.isAllDay,
            resolvedStartTime: startTime.toISOString(),
            resolvedEndTime: endTime.toISOString(),
            resolvedIsAllDay: isAllDay,
          });

          const syncResult = await updateGoogleEvent(
            context.userId,
            existingEvent.googleCalendarId,
            existingEvent.googleEventId,
            {
              title: updateData.title,
              description: updateData.description,
              startTime,
              endTime,
              isAllDay,
            }
          );

          console.log("[Agent Update] Google sync result:", syncResult);
        } catch (error) {
          console.error("[Google Sync Error] Failed to sync event update:", {
            eventId: input.eventId,
            googleEventId: existingEvent.googleEventId,
            error: error instanceof Error ? error.message : error,
            stack: error instanceof Error ? error.stack : undefined,
          });
          // Continue - local event was updated successfully
        }
      } else {
        console.log("[Agent Update] Skipping Google sync - no Google IDs");
      }

      return {
        success: true,
        event: {
          id: updatedEvent.id,
          title: updatedEvent.title,
          description: updatedEvent.description,
          startTime: formatDateInTimezone(
            updatedEvent.startTime,
            context.userTimezone
          ),
          endTime: formatDateInTimezone(
            updatedEvent.endTime,
            context.userTimezone
          ),
          isAllDay: updatedEvent.isAllDay,
          color: updatedEvent.color,
        },
      };
    },
  }),

  /**
   * Delete a calendar event
   * Requires user approval before execution
   * Deletes from Google Calendar before removing locally
   */
  deleteEvent: tool({
    description:
      "Delete a calendar event. Use this when the user wants to remove an event from their calendar. Always confirm the event details before calling this tool.",
    inputSchema: z.object({
      eventId: z.string().describe("The ID of the event to delete"),
    }),
    needsApproval: true,
    execute: async ({ eventId }) => {
      const [existingEvent] = await db
        .select()
        .from(event)
        .where(and(eq(event.id, eventId), eq(event.userId, context.userId)));

      if (!existingEvent) {
        return { success: false, error: "Event not found" };
      }

      // Delete from Google Calendar first if event has a Google ID
      if (existingEvent.googleEventId && existingEvent.googleCalendarId) {
        try {
          await deleteGoogleEvent(
            context.userId,
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
        .where(and(eq(event.id, eventId), eq(event.userId, context.userId)));

      return {
        success: true,
        deletedEventId: eventId,
        deletedEventTitle: existingEvent.title,
      };
    },
  }),

  /**
   * Query calendar for insights (free time, conflicts, etc.)
   */
  queryCalendar: tool({
    description:
      "Query the calendar for insights like free time slots, busy times, conflicts, or events on a specific day. Use this to analyze the user's schedule.",
    inputSchema: z.object({
      queryType: z
        .enum(["free_time", "busy_times", "conflicts", "events_on_day"])
        .describe("Type of calendar query"),
      date: z
        .string()
        .describe(
          "The target date in ISO 8601 format (for events_on_day) or start of range"
        ),
      endDate: z
        .string()
        .optional()
        .describe("End of date range (optional, defaults to same day)"),
      durationMinutes: z
        .number()
        .optional()
        .describe("Minimum duration in minutes for free time slots"),
    }),
    execute: async ({
      queryType,
      date,
      endDate,
      durationMinutes = 30,
    }): Promise<{
      queryType: string;
      date: string;
      results:
        | EventResult[]
        | z.infer<typeof FreeTimeSlotSchema>[]
        | { message: string };
    }> => {
      const startOfDay = new Date(date);
      startOfDay.setHours(0, 0, 0, 0);

      const endOfDay = endDate ? new Date(endDate) : new Date(date);
      endOfDay.setHours(23, 59, 59, 999);

      // Use overlap detection: event overlaps range if it starts before range ends AND ends after range starts
      const events = await db
        .select()
        .from(event)
        .where(
          and(
            eq(event.userId, context.userId),
            lte(event.startTime, endOfDay),
            gte(event.endTime, startOfDay)
          )
        )
        .orderBy(event.startTime);

      const eventResults: EventResult[] = events.map((e) => ({
        id: e.id,
        title: e.title,
        description: e.description,
        startTime: formatDateInTimezone(e.startTime, context.userTimezone),
        endTime: formatDateInTimezone(e.endTime, context.userTimezone),
        isAllDay: e.isAllDay,
        color: e.color,
      }));

      switch (queryType) {
        case "events_on_day":
          return {
            queryType,
            date,
            results: eventResults,
          };

        case "busy_times":
          return {
            queryType,
            date,
            results: eventResults.filter((e) => !e.isAllDay),
          };

        case "conflicts": {
          const conflicts: EventResult[] = [];
          for (let i = 0; i < eventResults.length - 1; i++) {
            const current = eventResults[i];
            const next = eventResults[i + 1];
            if (
              current &&
              next &&
              new Date(current.endTime) > new Date(next.startTime)
            ) {
              if (!conflicts.includes(current)) {
                conflicts.push(current);
              }
              if (!conflicts.includes(next)) {
                conflicts.push(next);
              }
            }
          }
          return {
            queryType,
            date,
            results:
              conflicts.length > 0
                ? conflicts
                : { message: "No conflicts found" },
          };
        }

        case "free_time": {
          const freeSlots: z.infer<typeof FreeTimeSlotSchema>[] = [];
          const workDayStart = new Date(date);
          workDayStart.setHours(8, 0, 0, 0);
          const workDayEnd = new Date(date);
          workDayEnd.setHours(18, 0, 0, 0);

          // Sort events by start time
          const sortedEvents = eventResults
            .filter((e) => !e.isAllDay)
            .sort(
              (a, b) =>
                new Date(a.startTime).getTime() -
                new Date(b.startTime).getTime()
            );

          let currentTime = workDayStart;

          for (const evt of sortedEvents) {
            const eventStart = new Date(evt.startTime);
            const eventEnd = new Date(evt.endTime);

            if (eventStart > currentTime) {
              const gapMinutes = Math.floor(
                (eventStart.getTime() - currentTime.getTime()) / 60_000
              );
              if (gapMinutes >= durationMinutes) {
                freeSlots.push({
                  start: formatDateInTimezone(
                    currentTime,
                    context.userTimezone
                  ),
                  end: formatDateInTimezone(eventStart, context.userTimezone),
                  durationMinutes: gapMinutes,
                });
              }
            }
            if (eventEnd > currentTime) {
              currentTime = eventEnd;
            }
          }

          // Check for free time after last event
          if (currentTime < workDayEnd) {
            const gapMinutes = Math.floor(
              (workDayEnd.getTime() - currentTime.getTime()) / 60_000
            );
            if (gapMinutes >= durationMinutes) {
              freeSlots.push({
                start: formatDateInTimezone(currentTime, context.userTimezone),
                end: formatDateInTimezone(workDayEnd, context.userTimezone),
                durationMinutes: gapMinutes,
              });
            }
          }

          return {
            queryType,
            date,
            results:
              freeSlots.length > 0
                ? freeSlots
                : { message: "No free time slots found matching criteria" },
          };
        }

        default:
          return {
            queryType,
            date,
            results: { message: "Unknown query type" },
          };
      }
    },
  }),

  /**
   * Get current user information
   */
  getUserInfo: tool({
    description:
      "Get information about the current user. Use this to personalize responses or when you need the user's name or email.",
    inputSchema: z.object({}),
    execute: (): Promise<{
      name: string;
      email: string;
    }> => {
      return Promise.resolve({
        name: context.userName,
        email: context.userEmail,
      });
    },
  }),
});

export type CalendarTools = ReturnType<typeof createCalendarTools>;
