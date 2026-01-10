---
name: Two-Way Google Calendar Sync
overview: Implement bidirectional synchronization with Google Calendar so that create, update, and delete operations from the app are pushed to Google Calendar. The OAuth scope already supports read/write access.
todos:
  - id: google-write-functions
    content: Add createGoogleEvent, updateGoogleEvent, deleteGoogleEvent, getDefaultCalendarId to google-calendar.ts
    status: completed
  - id: update-events-service
    content: Update EventsService create/update/delete to sync with Google Calendar
    status: completed
    dependencies:
      - google-write-functions
  - id: update-agent-tools
    content: Update agent calendar tools (createEvent, updateEvent, deleteEvent) to sync with Google
    status: completed
    dependencies:
      - google-write-functions
---

# Two-Way Google Calendar Sync

## Current State

The app currently has **one-way sync** (Google Calendar to local DB). When events are listed, `syncGoogleCalendarEvents` pulls events from Google and stores them locally. However, local changes (create/update/delete) do not sync back to Google.

```mermaid
flowchart LR
    subgraph current [Current: One-Way Sync]
        GoogleCalendar1[Google Calendar] -->|Pull| LocalDB1[Local DB]
    end
    subgraph target [Target: Two-Way Sync]
        GoogleCalendar2[Google Calendar] <-->|Pull/Push| LocalDB2[Local DB]
    end
```

## OAuth Scopes

The current scope `https://www.googleapis.com/auth/calendar.events` in [`packages/auth/src/index.ts`](packages/auth/src/index.ts) already provides **read-write access** to calendar events. No scope changes are needed.

## Implementation Plan

### 1. Add Google Calendar Write Functions

Extend [`apps/server/src/google-calendar.ts`](apps/server/src/google-calendar.ts) with:

- `createGoogleEvent(userId, calendarId, eventData)` - Insert event via Google API, return `googleEventId`
- `updateGoogleEvent(userId, calendarId, googleEventId, eventData)` - Patch event in Google
- `deleteGoogleEvent(userId, calendarId, googleEventId)` - Delete event from Google
- `getDefaultCalendarId(userId)` - Get the primary calendar ID for creating new events

### 2. Update Events Service

Modify [`apps/server/src/modules/events/service.ts`](apps/server/src/modules/events/service.ts):

- **Create**: After inserting locally, call `createGoogleEvent()` and save the returned `googleEventId`
- **Update**: If event has `googleEventId`, call `updateGoogleEvent()` to sync changes
- **Delete**: If event has `googleEventId`, call `deleteGoogleEvent()` before removing locally

### 3. Update Agent Calendar Tools

Modify [`apps/server/src/modules/chat/agent/tools.ts`](apps/server/src/modules/chat/agent/tools.ts):

Apply the same sync logic to `createEvent`, `updateEvent`, and `deleteEvent` tools so AI-initiated changes also sync to Google.

### 4. Error Handling Strategy

- Wrap Google API calls in try-catch to prevent local operations from failing if Google sync fails
- Log sync errors but still complete local operations
- Consider adding a `syncStatus` or `syncError` field to events (optional enhancement)

## Data Flow

```mermaid
sequenceDiagram
    participant User
    participant App
    participant LocalDB
    participant GoogleAPI

    User->>App: Create/Update/Delete Event
    App->>LocalDB: Save changes
    App->>GoogleAPI: Push changes to Google
    GoogleAPI-->>App: Return googleEventId
    App->>LocalDB: Update with googleEventId
    App-->>User: Confirm success
```
