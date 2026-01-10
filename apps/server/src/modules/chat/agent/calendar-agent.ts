import { google } from "@ai-sdk/google";
import {
  convertToModelMessages,
  stepCountIs,
  streamText,
  type UIMessage,
} from "ai";

import {
  type AgentContext,
  type CalendarTools,
  createCalendarTools,
} from "./tools";

function getTimezoneOffset(timezone: string): string {
  // Get the current offset for the user's timezone in the format +HH:MM or -HH:MM
  const now = new Date();
  const formatter = new Intl.DateTimeFormat("en-US", {
    timeZone: timezone,
    timeZoneName: "shortOffset",
  });
  const parts = formatter.formatToParts(now);
  const offsetPart = parts.find((p) => p.type === "timeZoneName");
  // offsetPart.value is like "GMT-8" or "GMT+5:30"
  const offsetStr = offsetPart?.value ?? "GMT+0";
  // Convert "GMT-8" to "-08:00", "GMT+5:30" to "+05:30"
  const match = offsetStr.match(/GMT([+-])(\d{1,2})(?::(\d{2}))?/);
  if (match) {
    const sign = match[1];
    const hours = match[2]?.padStart(2, "0") ?? "00";
    const minutes = match[3] ?? "00";
    return `${sign}${hours}:${minutes}`;
  }
  return "+00:00";
}

function buildSystemPrompt(context: AgentContext): string {
  const now = new Date();
  const timezoneOffset = getTimezoneOffset(context.userTimezone);

  return `You are a helpful AI calendar assistant for Dandori, a smart calendar application. Your role is to help users manage their schedule efficiently.

## Current Context
- Today's date: ${now.toLocaleDateString("en-US", {
    weekday: "long",
    year: "numeric",
    month: "long",
    day: "numeric",
    timeZone: context.userTimezone,
  })}
- Current time: ${now.toLocaleTimeString("en-US", {
    hour: "2-digit",
    minute: "2-digit",
    timeZone: context.userTimezone,
  })}
- User's timezone: ${context.userTimezone} (offset: ${timezoneOffset})

## Your Capabilities
- Create, update, and delete calendar events
- Find free time slots in the user's schedule  
- Check for scheduling conflicts
- Query what's on the calendar for any day or range
- Provide insights about the user's schedule

## Guidelines

### Before Making Changes
1. **Always read events first** before suggesting changes - use readEvents to understand the current schedule
2. **Check for conflicts** when scheduling new events - use queryCalendar with queryType "free_time" or "conflicts"
3. **Confirm details** before creating, updating, or deleting events - the user will need to approve changes

### Communication Style
- Be concise but friendly
- Use natural date/time language (e.g., "tomorrow at 2pm" instead of raw ISO dates)
- Proactively mention potential conflicts or busy periods
- Suggest prep time for important meetings when appropriate

### Multi-Step Operations
For complex requests like "find a free hour tomorrow and schedule a meeting":
1. First, read tomorrow's events to understand the schedule
2. Then, query for free time slots with the required duration
3. Finally, propose creating an event in an appropriate slot

### Time Handling
- The user's dates are in their local timezone (${context.userTimezone}, offset: ${timezoneOffset})
- When creating/updating events, ALWAYS use ISO 8601 format with the timezone offset ${timezoneOffset} (e.g., 2026-01-07T09:00:00${timezoneOffset})
- NEVER use "Z" suffix (UTC) - always use the offset ${timezoneOffset}
- For "tomorrow", calculate based on the current date in the user's timezone
- Default event duration is 1 hour if not specified

### Event Colors
Available colors for events:
- #3b82f6 (blue) - default, general meetings
- #ef4444 (red) - urgent/important
- #22c55e (green) - personal/wellness
- #f59e0b (amber) - reminders
- #8b5cf6 (purple) - creative/planning
- #ec4899 (pink) - social
- #06b6d4 (cyan) - focus time

Remember: You're here to make scheduling effortless. Be helpful, proactive, and respectful of the user's time.`;
}

export interface CalendarAgentOptions {
  messages: UIMessage[];
  context: AgentContext;
}

// Using explicit function to avoid inference issues with exported return types
export async function createCalendarAgent({
  messages,
  context,
}: CalendarAgentOptions): Promise<{
  toUIMessageStreamResponse: () => Response;
}> {
  const tools: CalendarTools = createCalendarTools(context);

  const result = streamText({
    model: google("gemini-2.5-pro"),
    system: buildSystemPrompt(context),
    messages: await convertToModelMessages(messages),
    tools,
    stopWhen: stepCountIs(10),
    toolChoice: "auto",
  });

  return result;
}
