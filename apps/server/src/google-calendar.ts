import { db } from "@dandori-ai/db";
import { account, calendar, event } from "@dandori-ai/db/schema";
import { env } from "@dandori-ai/env";
import { and, eq } from "drizzle-orm";
import { google } from "googleapis";

interface GoogleCalendarEvent {
  id?: string | null;
  summary?: string | null;
  description?: string | null;
  start?: {
    dateTime?: string | null;
    date?: string | null;
  } | null;
  end?: {
    dateTime?: string | null;
    date?: string | null;
  } | null;
}

/**
 * Creates an OAuth2 client for a user with their stored Google tokens
 */
async function getGoogleOAuth2Client(userId: string) {
  const [googleAccount] = await db
    .select()
    .from(account)
    .where(and(eq(account.userId, userId), eq(account.providerId, "google")));

  if (!googleAccount) {
    console.warn("[Google Sync] No Google account linked for user:", userId);
    return null;
  }

  if (!googleAccount.accessToken) {
    console.warn("[Google Sync] No access token for user:", userId);
    return null;
  }

  if (!googleAccount.refreshToken) {
    console.warn("[Google Sync] No refresh token for user:", userId);
    return null;
  }

  const oauth2Client = new google.auth.OAuth2(
    env.GOOGLE_CLIENT_ID,
    env.GOOGLE_CLIENT_SECRET
  );

  oauth2Client.setCredentials({
    access_token: googleAccount.accessToken,
    refresh_token: googleAccount.refreshToken,
    expiry_date: googleAccount.accessTokenExpiresAt?.getTime(),
  });

  // Handle token refresh - update stored tokens when refreshed
  oauth2Client.on("tokens", async (tokens) => {
    console.log("[Google Sync] Token refreshed for user:", userId);
    await db
      .update(account)
      .set({
        accessToken: tokens.access_token ?? googleAccount.accessToken,
        accessTokenExpiresAt: tokens.expiry_date
          ? new Date(tokens.expiry_date)
          : googleAccount.accessTokenExpiresAt,
      })
      .where(eq(account.id, googleAccount.id));
  });

  return oauth2Client;
}

/**
 * Syncs Google Calendar list to the local database
 */
export async function syncGoogleCalendars(userId: string): Promise<void> {
  const oauth2Client = await getGoogleOAuth2Client(userId);

  if (!oauth2Client) {
    return;
  }

  console.log("[Google Sync] Syncing calendars for user:", userId);

  const calendarApi = google.calendar({ version: "v3", auth: oauth2Client });
  const response = await calendarApi.calendarList.list();
  const googleCalendars = response.data.items ?? [];

  console.log(
    "[Google Sync] Fetched",
    googleCalendars.length,
    "calendars from Google"
  );

  for (const gCal of googleCalendars) {
    if (!gCal.id) {
      continue;
    }

    const calendarData = {
      userId,
      googleCalendarId: gCal.id,
      name: gCal.summary ?? "Untitled Calendar",
      color: gCal.backgroundColor ?? "#3b82f6",
      isPrimary: gCal.primary === true,
    };

    // Check if calendar already exists
    const [existingCalendar] = await db
      .select()
      .from(calendar)
      .where(
        and(eq(calendar.userId, userId), eq(calendar.googleCalendarId, gCal.id))
      );

    if (existingCalendar) {
      // Update existing calendar (don't override isVisible)
      await db
        .update(calendar)
        .set({
          name: calendarData.name,
          color: calendarData.color,
          isPrimary: calendarData.isPrimary,
        })
        .where(eq(calendar.id, existingCalendar.id));
    } else {
      // Insert new calendar
      await db.insert(calendar).values(calendarData);
    }
  }
}

/**
 * Syncs Google Calendar events to the local database for a date range
 */
export async function syncGoogleCalendarEvents(
  userId: string,
  timeMin: Date,
  timeMax: Date
): Promise<void> {
  const oauth2Client = await getGoogleOAuth2Client(userId);

  if (!oauth2Client) {
    // User doesn't have a linked Google account, skip sync
    return;
  }

  // Sync calendars first
  await syncGoogleCalendars(userId);

  // Get visible calendars from DB
  const visibleCalendars = await db
    .select()
    .from(calendar)
    .where(and(eq(calendar.userId, userId), eq(calendar.isVisible, true)));

  if (visibleCalendars.length === 0) {
    console.log("[Google Sync] No visible calendars for user:", userId);
    return;
  }

  console.log("[Google Sync] Starting sync for user:", userId, {
    timeMin: timeMin.toISOString(),
    timeMax: timeMax.toISOString(),
    calendars: visibleCalendars.length,
  });

  const calendarApi = google.calendar({ version: "v3", auth: oauth2Client });

  for (const cal of visibleCalendars) {
    const response = await calendarApi.events.list({
      calendarId: cal.googleCalendarId,
      timeMin: timeMin.toISOString(),
      timeMax: timeMax.toISOString(),
      singleEvents: true,
      orderBy: "startTime",
      maxResults: 2500,
    });

    const googleEvents = response.data.items ?? [];
    console.log("[Google Sync] Calendar:", cal.name, {
      googleCalendarId: cal.googleCalendarId,
      color: cal.color,
      eventCount: googleEvents.length,
      events: googleEvents.map((e) => ({
        id: e.id,
        title: e.summary,
        start: e.start?.dateTime ?? e.start?.date,
        end: e.end?.dateTime ?? e.end?.date,
        isAllDay: !e.start?.dateTime,
      })),
    });

    for (const gEvent of googleEvents) {
      if (!(gEvent.id && gEvent.start)) {
        continue;
      }

      const eventData = parseGoogleEvent(
        gEvent,
        userId,
        cal.googleCalendarId,
        cal.color
      );

      // Check if event already exists
      const [existingEvent] = await db
        .select()
        .from(event)
        .where(
          and(eq(event.userId, userId), eq(event.googleEventId, gEvent.id))
        );

      if (existingEvent) {
        // Update existing event
        await db
          .update(event)
          .set({
            title: eventData.title,
            description: eventData.description,
            startTime: eventData.startTime,
            endTime: eventData.endTime,
            isAllDay: eventData.isAllDay,
            color: eventData.color,
            googleCalendarId: eventData.googleCalendarId,
          })
          .where(eq(event.id, existingEvent.id));
      } else {
        // Insert new event
        await db.insert(event).values(eventData);
      }
    }
  }
}

/**
 * Parses a Google Calendar event into our event schema format
 */
function parseGoogleEvent(
  gEvent: GoogleCalendarEvent,
  userId: string,
  googleCalendarId: string,
  calendarColor: string
): {
  userId: string;
  title: string;
  description: string | null;
  startTime: Date;
  endTime: Date;
  isAllDay: boolean;
  color: string;
  googleEventId: string;
  googleCalendarId: string;
} {
  const isAllDay = !gEvent.start?.dateTime;

  let startTime: Date;
  let endTime: Date;

  if (isAllDay) {
    // All-day events use date strings (YYYY-MM-DD)
    // Parse as local dates to avoid UTC/local timezone mismatch
    // (new Date("YYYY-MM-DD") parses as UTC midnight, causing wrong day in non-UTC timezones)
    const startDateStr = gEvent.start?.date ?? "";
    const endDateStr = gEvent.end?.date ?? "";

    const startParts = startDateStr.split("-").map(Number);
    const endParts = endDateStr.split("-").map(Number);

    const startYear = startParts[0] ?? 0;
    const startMonth = startParts[1] ?? 1;
    const startDay = startParts[2] ?? 1;
    const endYear = endParts[0] ?? 0;
    const endMonth = endParts[1] ?? 1;
    const endDay = endParts[2] ?? 1;

    // Create start time as local midnight
    startTime = new Date(startYear, startMonth - 1, startDay, 0, 0, 0, 0);

    // Create end time in local time, then subtract 1 day (Google's end date is exclusive)
    endTime = new Date(endYear, endMonth - 1, endDay, 0, 0, 0, 0);
    endTime.setDate(endTime.getDate() - 1);
    // Set to end of day
    endTime.setHours(23, 59, 59, 999);
  } else {
    startTime = new Date(gEvent.start?.dateTime ?? "");
    endTime = new Date(gEvent.end?.dateTime ?? "");
  }

  return {
    userId,
    title: gEvent.summary ?? "Untitled Event",
    description: gEvent.description ?? null,
    startTime,
    endTime,
    isAllDay,
    color: calendarColor,
    googleEventId: gEvent.id ?? "",
    googleCalendarId,
  };
}

/**
 * Checks if a user has a linked Google account
 */
export async function hasGoogleAccount(userId: string): Promise<boolean> {
  const [googleAccount] = await db
    .select({ id: account.id })
    .from(account)
    .where(and(eq(account.userId, userId), eq(account.providerId, "google")));

  return !!googleAccount;
}

/**
 * Gets the primary calendar ID for a user
 */
export async function getDefaultCalendarId(
  userId: string
): Promise<string | null> {
  // First check if we have a primary calendar in the DB
  const [primaryCalendar] = await db
    .select({ googleCalendarId: calendar.googleCalendarId })
    .from(calendar)
    .where(and(eq(calendar.userId, userId), eq(calendar.isPrimary, true)));

  if (primaryCalendar) {
    return primaryCalendar.googleCalendarId;
  }

  // Fallback: use "primary" which is a special Google Calendar ID
  return "primary";
}

interface CreateGoogleEventInput {
  title: string;
  description?: string | null;
  startTime: Date;
  endTime: Date;
  isAllDay?: boolean;
}

/**
 * Creates an event in Google Calendar
 * Returns the Google Event ID if successful, null otherwise
 */
export async function createGoogleEvent(
  userId: string,
  calendarId: string,
  eventData: CreateGoogleEventInput
): Promise<string | null> {
  const oauth2Client = await getGoogleOAuth2Client(userId);

  if (!oauth2Client) {
    console.warn(
      "[Google Sync] Cannot create event - no OAuth client for user:",
      userId
    );
    return null;
  }

  const calendarApi = google.calendar({ version: "v3", auth: oauth2Client });

  const eventBody: {
    summary: string;
    description?: string;
    start: { dateTime?: string; date?: string; timeZone?: string };
    end: { dateTime?: string; date?: string; timeZone?: string };
  } = {
    summary: eventData.title,
    description: eventData.description ?? undefined,
    start: {},
    end: {},
  };

  if (eventData.isAllDay) {
    // All-day events use date strings (YYYY-MM-DD)
    eventBody.start.date = eventData.startTime.toISOString().split("T")[0];
    // Google all-day events use exclusive end date (add 1 day)
    const endDate = new Date(eventData.endTime);
    endDate.setDate(endDate.getDate() + 1);
    eventBody.end.date = endDate.toISOString().split("T")[0];
  } else {
    eventBody.start.dateTime = eventData.startTime.toISOString();
    eventBody.end.dateTime = eventData.endTime.toISOString();
  }

  try {
    const response = await calendarApi.events.insert({
      calendarId,
      requestBody: eventBody,
    });

    console.log("[Google Sync] Created event:", {
      googleEventId: response.data.id,
      title: eventData.title,
    });

    return response.data.id ?? null;
  } catch (error) {
    console.error("[Google Sync] Failed to create event:", {
      error: error instanceof Error ? error.message : error,
      calendarId,
      eventData,
    });
    return null;
  }
}

interface UpdateGoogleEventInput {
  title?: string;
  description?: string | null;
  startTime?: Date;
  endTime?: Date;
  isAllDay?: boolean;
}

/**
 * Updates an event in Google Calendar
 * Returns true if successful, false otherwise
 */
export async function updateGoogleEvent(
  userId: string,
  calendarId: string,
  googleEventId: string,
  eventData: UpdateGoogleEventInput
): Promise<boolean> {
  console.log("[Google Sync] updateGoogleEvent called with:", {
    userId,
    calendarId,
    googleEventId,
    eventData: {
      title: eventData.title,
      description: eventData.description,
      startTime: eventData.startTime?.toISOString(),
      endTime: eventData.endTime?.toISOString(),
      isAllDay: eventData.isAllDay,
    },
  });

  const oauth2Client = await getGoogleOAuth2Client(userId);

  if (!oauth2Client) {
    console.warn(
      "[Google Sync] Cannot update event - no OAuth client for user:",
      userId
    );
    return false;
  }

  console.log("[Google Sync] Got OAuth client, building event body...");

  const calendarApi = google.calendar({ version: "v3", auth: oauth2Client });

  const eventBody: {
    summary?: string;
    description?: string;
    start?: { dateTime?: string; date?: string; timeZone?: string };
    end?: { dateTime?: string; date?: string; timeZone?: string };
  } = {};

  if (eventData.title !== undefined) {
    eventBody.summary = eventData.title;
    console.log("[Google Sync] Adding title to update:", eventData.title);
  }

  if (eventData.description !== undefined) {
    eventBody.description = eventData.description ?? undefined;
    console.log(
      "[Google Sync] Adding description to update:",
      eventData.description
    );
  }

  // Google API requires both start and end to be sent together when updating times
  // Only update times if both are provided
  console.log("[Google Sync] Checking time update conditions:", {
    hasStartTime: eventData.startTime !== undefined,
    hasEndTime: eventData.endTime !== undefined,
    isAllDay: eventData.isAllDay,
  });

  if (eventData.startTime !== undefined && eventData.endTime !== undefined) {
    if (eventData.isAllDay) {
      eventBody.start = {
        date: eventData.startTime.toISOString().split("T")[0],
      };
      // Google all-day events use exclusive end date (add 1 day)
      const endDate = new Date(eventData.endTime);
      endDate.setDate(endDate.getDate() + 1);
      eventBody.end = {
        date: endDate.toISOString().split("T")[0],
      };
      console.log("[Google Sync] Adding all-day times:", {
        start: eventBody.start,
        end: eventBody.end,
      });
    } else {
      eventBody.start = {
        dateTime: eventData.startTime.toISOString(),
      };
      eventBody.end = {
        dateTime: eventData.endTime.toISOString(),
      };
      console.log("[Google Sync] Adding dateTime times:", {
        start: eventBody.start,
        end: eventBody.end,
      });
    }
  } else {
    console.log(
      "[Google Sync] Skipping time update - missing start or end time"
    );
  }

  console.log(
    "[Google Sync] Final eventBody to send:",
    JSON.stringify(eventBody, null, 2)
  );

  if (Object.keys(eventBody).length === 0) {
    console.warn("[Google Sync] No fields to update, skipping API call");
    return true;
  }

  try {
    console.log("[Google Sync] Calling Google Calendar API patch...");
    const response = await calendarApi.events.patch({
      calendarId,
      eventId: googleEventId,
      requestBody: eventBody,
    });

    console.log("[Google Sync] Updated event successfully:", {
      googleEventId,
      updates: Object.keys(eventBody),
      responseStatus: response.status,
      responseEventId: response.data.id,
    });

    return true;
  } catch (error) {
    console.error("[Google Sync] Failed to update event:", {
      error: error instanceof Error ? error.message : error,
      errorName: error instanceof Error ? error.name : undefined,
      calendarId,
      googleEventId,
      eventBody: JSON.stringify(eventBody),
    });
    return false;
  }
}

/**
 * Deletes an event from Google Calendar
 * Returns true if successful, false otherwise
 */
export async function deleteGoogleEvent(
  userId: string,
  calendarId: string,
  googleEventId: string
): Promise<boolean> {
  const oauth2Client = await getGoogleOAuth2Client(userId);

  if (!oauth2Client) {
    console.warn(
      "[Google Sync] Cannot delete event - no OAuth client for user:",
      userId
    );
    return false;
  }

  const calendarApi = google.calendar({ version: "v3", auth: oauth2Client });

  try {
    await calendarApi.events.delete({
      calendarId,
      eventId: googleEventId,
    });

    console.log("[Google Sync] Deleted event:", { googleEventId });

    return true;
  } catch (error) {
    console.error("[Google Sync] Failed to delete event:", {
      error: error instanceof Error ? error.message : error,
      calendarId,
      googleEventId,
    });
    return false;
  }
}
