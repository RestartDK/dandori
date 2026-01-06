import { db } from "@dandori-ai/db";
import { account, event } from "@dandori-ai/db/schema";
import { env } from "@dandori-ai/env";
import { and, eq } from "drizzle-orm";
import { google } from "googleapis";

const GOOGLE_CALENDAR_COLOR = "#4285f4";

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

  if (!(googleAccount?.accessToken && googleAccount.refreshToken)) {
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

  const calendar = google.calendar({ version: "v3", auth: oauth2Client });

  const response = await calendar.events.list({
    calendarId: "primary",
    timeMin: timeMin.toISOString(),
    timeMax: timeMax.toISOString(),
    singleEvents: true,
    orderBy: "startTime",
    maxResults: 2500,
  });

  const googleEvents = response.data.items ?? [];

  for (const gEvent of googleEvents) {
    if (!(gEvent.id && gEvent.start)) {
      continue;
    }

    const eventData = parseGoogleEvent(gEvent, userId);

    // Check if event already exists
    const [existingEvent] = await db
      .select()
      .from(event)
      .where(and(eq(event.userId, userId), eq(event.googleEventId, gEvent.id)));

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
        })
        .where(eq(event.id, existingEvent.id));
    } else {
      // Insert new event
      await db.insert(event).values(eventData);
    }
  }
}

/**
 * Parses a Google Calendar event into our event schema format
 */
function parseGoogleEvent(
  gEvent: GoogleCalendarEvent,
  userId: string
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
    color: GOOGLE_CALENDAR_COLOR,
    googleEventId: gEvent.id ?? "",
    googleCalendarId: "primary",
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
