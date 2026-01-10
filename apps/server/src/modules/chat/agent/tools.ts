import { db } from "@dandori-ai/db";
import { event } from "@dandori-ai/db/schema";
import type { ToolSet } from "ai";
import { tool } from "ai";
import { and, eq, gt, gte, lt, lte } from "drizzle-orm";
import { z } from "zod";

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
        .describe("Start time in ISO 8601 format (e.g., 2026-01-07T09:00:00)"),
      endTime: z
        .string()
        .describe("End time in ISO 8601 format (e.g., 2026-01-07T10:00:00)"),
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
      const [newEvent] = await db
        .insert(event)
        .values({
          userId: context.userId,
          title,
          description: description ?? null,
          startTime: new Date(startTime),
          endTime: new Date(endTime),
          isAllDay: isAllDay ?? false,
          color: color ?? "#3b82f6",
        })
        .returning();

      if (!newEvent) {
        return { success: false, error: "Failed to create event" };
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
          startTime: e.startTime.toISOString(),
          endTime: e.endTime.toISOString(),
          isAllDay: e.isAllDay,
          color: e.color,
        })),
      };
    },
  }),

  /**
   * Update an existing calendar event
   * Requires user approval before execution
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
        .describe("New start time in ISO 8601 format"),
      endTime: z
        .string()
        .optional()
        .describe("New end time in ISO 8601 format"),
      isAllDay: z
        .boolean()
        .optional()
        .describe("Whether this is an all-day event"),
      color: z.string().optional().describe("New event color in hex format"),
    }),
    needsApproval: true,
    execute: async (input) => {
      const [existingEvent] = await db
        .select()
        .from(event)
        .where(
          and(eq(event.id, input.eventId), eq(event.userId, context.userId))
        );

      if (!existingEvent) {
        return { success: false, error: "Event not found" };
      }

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
    },
  }),

  /**
   * Delete a calendar event
   * Requires user approval before execution
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
        startTime: e.startTime.toISOString(),
        endTime: e.endTime.toISOString(),
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
                  start: currentTime.toISOString(),
                  end: eventStart.toISOString(),
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
                start: currentTime.toISOString(),
                end: workDayEnd.toISOString(),
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
