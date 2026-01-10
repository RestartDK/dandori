---
name: Multi-Calendar Support
overview: Add support for fetching all Google calendars (not just primary), store calendar metadata in the database, and create a left sidebar to toggle calendar visibility.
todos:
  - id: db-schema
    content: Create calendar table schema and run migration
    status: pending
  - id: google-sync
    content: Update google-calendar.ts to sync all calendars
    status: pending
    dependencies:
      - db-schema
  - id: calendars-api
    content: Create calendars API module (model, service, routes)
    status: pending
    dependencies:
      - db-schema
  - id: server-integrate
    content: Integrate calendars module into server index
    status: pending
    dependencies:
      - calendars-api
  - id: use-calendars
    content: Create useCalendars hook on frontend
    status: pending
    dependencies:
      - calendars-api
  - id: sidebar-component
    content: Create CalendarSidebar component
    status: pending
    dependencies:
      - use-calendars
  - id: layout-integration
    content: Update layout and header to include sidebar toggle
    status: pending
    dependencies:
      - sidebar-component
---

# Multi-Calendar Support with Sidebar

## Overview

Currently, events are fetched only from the user's primary Google calendar. This plan adds:

1. A new `calendar` table to store calendar metadata
2. Backend logic to sync all user calendars and filter events by visibility
3. A new calendars API module
4. A left sidebar component to toggle calendar visibility

## Architecture

```mermaid
flowchart TB
    subgraph frontend [Frontend]
        Sidebar[CalendarSidebar]
        Calendar[Calendar Component]
        useCalendars[useCalendars Hook]
        useEvents[useEvents Hook]
    end
    
    subgraph backend [Backend API]
        CalendarsModule[/api/calendars]
        EventsModule[/api/events]
        GoogleCalendarSync[syncGoogleCalendarEvents]
    end
    
    subgraph database [Database]
        CalendarTable[(calendar table)]
        EventTable[(event table)]
    end
    
    subgraph external [External]
        GoogleAPI[Google Calendar API]
    end
    
    Sidebar --> useCalendars
    Calendar --> useEvents
    useCalendars --> CalendarsModule
    useEvents --> EventsModule
    
    CalendarsModule --> CalendarTable
    EventsModule --> GoogleCalendarSync
    GoogleCalendarSync --> GoogleAPI
    GoogleCalendarSync --> CalendarTable
    GoogleCalendarSync --> EventTable
```

## Implementation

### Phase 1: Database Schema

**Create** [`packages/db/src/schema/calendars.ts`](packages/db/src/schema/calendars.ts)

- Add `calendar` table with fields: `id`, `userId`, `googleCalendarId`, `name`, `color`, `isVisible`, `isPrimary`
- Add unique constraint on `userId + googleCalendarId`

**Update** [`packages/db/src/schema/index.ts`](packages/db/src/schema/index.ts)

- Export the new calendar schema

**Run migration**: `bun db:generate` and `bun db:migrate`

### Phase 2: Backend - Google Calendar Integration

**Update** [`apps/server/src/google-calendar.ts`](apps/server/src/google-calendar.ts)

1. Add `syncGoogleCalendars(userId)` function:

   - Call `calendarList.list()` to fetch all calendars
   - Upsert each calendar into the `calendar` table

2. Modify `syncGoogleCalendarEvents()`:

   - Query visible calendars from DB
   - Iterate over each visible calendar and fetch its events
   - Use the calendar's color for new events

3. Update `parseGoogleEvent()`:

   - Accept `calendarColor` parameter to use the calendar's color

### Phase 3: Backend - Calendars API Module

**Create** [`apps/server/src/modules/calendars/`](apps/server/src/modules/calendars/)

Files to create:

- `model.ts` - TypeBox schemas (CalendarSchema, UpdateVisibilityBody)
- `service.ts` - CalendarsService with `list()` and `updateVisibility()` methods
- `index.ts` - Elysia routes: `GET /api/calendars`, `PATCH /api/calendars/:id`

**Update** [`apps/server/src/index.ts`](apps/server/src/index.ts)

- Import and use the new `calendars` module

### Phase 4: Frontend - Calendars Hook and Sidebar

**Create** [`apps/web/src/hooks/use-calendars.ts`](apps/web/src/hooks/use-calendars.ts)

- Fetch calendars from API
- Expose `calendars`, `toggleCalendar()`, and loading states

**Create** [`apps/web/src/components/calendar/calendar-sidebar.tsx`](apps/web/src/components/calendar/calendar-sidebar.tsx)

- Display list of calendars with checkboxes
- Show calendar color indicator next to each name
- Call `toggleCalendar()` on checkbox change

### Phase 5: Frontend - Layout Integration

**Update** [`apps/web/src/routes/index.tsx`](apps/web/src/routes/index.tsx)

- Add sidebar state (`isSidebarOpen`)
- Render `CalendarSidebar` conditionally
- Pass toggle handler to `Calendar` component

**Update** [`apps/web/src/components/calendar/calendar-header.tsx`](apps/web/src/components/calendar/calendar-header.tsx)

- Add a button to toggle the sidebar visibility

## Key Implementation Details

**Event filtering approach**: Server-side filtering based on `isVisible` flag in the calendar table. When calendars are toggled, the visibility is persisted to DB, and the next events fetch will automatically include/exclude events from that calendar.

**Color handling**: Each calendar's `backgroundColor` from Google API will be stored and used for events. This replaces the current hardcoded `#4285f4`.

**Unique constraint**: Events use `googleEventId + userId` as unique key. Calendar uses `googleCalendarId + userId` to prevent duplicates.

## Files Summary

| Action | File |

|--------|------|

| Create | `packages/db/src/schema/calendars.ts` |

| Update | `packages/db/src/schema/index.ts` |

| Update | `apps/server/src/google-calendar.ts` |

| Create | `apps/server/src/modules/calendars/model.ts` |

| Create | `apps/server/src/modules/calendars/service.ts` |

| Create | `apps/server/src/modules/calendars/index.ts` |

| Update | `apps/server/src/index.ts` |

| Create | `apps/web/src/hooks/use-calendars.ts` |

| Create | `apps/web/src/components/calendar/calendar-sidebar.tsx` |

| Update | `apps/web/src/routes/index.tsx` |

| Update | `apps/web/src/components/calendar/calendar-header.tsx` |
