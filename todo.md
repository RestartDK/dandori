# Todo List

- [x] First deploy to Dokploy both backend and frontend

## To keep in mind for next plans

- Make the plans always include harness where it will run db:push to test the schema changes (make sure plan defines exactly the same schema to avoid conflicts with parallel agents)
- Include the fact that drizzle is source of truth, don't make new types throughout, using typebox with elysia and a plugin to convert drizzle to typebox

## Calendar View

- [x] Sync with Google Calendar (read and write)
- [x] Support recurring events
- [x] CRUD events on the calendar
- [x] Drag events to reschedule
- [x] Expand/shrink events by dragging edges
- [x] Click event to edit via popup
- [x] Add event button with popup

Problems:

- [x] Remove the bar on top of the page with old better auth ui elements
- [x] There is no login page, need to use the one from shadcn as a default one
- [x] There should be a header, but there should just be the profile picture with a dropdown with settings and log out
- [x] fix the ui to use the shadcn defaults for consistent styling

- [x] When dragging every event it will have the popup menu come up when you finish dragging, should not have a popup
- [x] Need to add localstorage settings for setting the specific view you have like month or week so it persists on reload
- [x] The text on the calendar should not be centered but be aligned at the top
- [x] The calendar grid is not scrollable at the moment, must be scrollable
- [x] Don't allow for a hover over every event to change colour on calendar grid, users should double tap to add a new event
- [x] Fix dragging to be better visually
- [x] Make sure to show ui of calendar grid first, then load events don't block ui

- [x] fix ui of dropdown menu with spacing of elements, maybe need to check agin dropdown menu defaults
- [x] add `env.ts` to make sure env variables are handled properly

## Chat Interface

- [ ] Collapsible panel
- [ ] Streaming text responses
- [ ] SSE for tool calls with the following tools:
  - [ ] Create event
  - [ ] Read events
  - [ ] Update event
  - [ ] Delete event
  - [ ] Query calendar (free time, what's on a given day, etc.)
  - [ ] Get user information
- [ ] Calendar change preview (user confirms before changes apply)
- [ ] Context: sliding window of past 2 responses + relevant calendar data

## Background Agent

- [ ] Cron job triggers proactive planning workflow per user
- [ ] Checks for:
  - [ ] Upcoming deadlines needing prep time
  - [ ] Recurring event patterns worth adjusting
- [ ] Surfaces suggestions via sonner-style notification stack (bottom right)
- [ ] Accept → event created
- [ ] Decline → nothing happens, no learning
- [ ] Multiple suggestions batched into one notification component
- [ ] Only shows when app is open, no push notifications

## Indexing

- [ ] Store calendar events per user
- [ ] Support date range queries and full-text search
- [ ] Embeddings for semantic search (e.g., "that coffee thing" finds "Coffee with Sam")

## Authentication

- [ ] Better Auth with username/password and Google OAuth
- [ ] Google OAuth also enables Google Calendar sync

## Responsive Design

- [ ] Mobile responsive web app
- [ ] No native mobile app

## Calendar Change Preview

### Two way sync

- [ ] This allows the users events to also sync with their google calendar as well

### MVP: Inline diff in chat

- [ ] A distinct message type for change proposals (separate from regular text messages)
- [ ] Proposal card component that renders: change type icon (edit, add, delete), event title, before/after times for moves, just times for new events
- [ ] Pending state stored until user accepts or declines
- [ ] Accept triggers the actual calendar API calls
- [ ] Decline clears the pending state

### If time allows: Ghost events on calendar

- [ ] Calendar component accepts a list of "pending events" separate from real events
- [ ] Pending events rendered with distinct styling: dashed borders, reduced opacity, different color
- [ ] For moves: original event shown faded with strikethrough, new position shown as ghost
- [ ] For additions: ghost event at proposed time
- [ ] For deletions: existing event shown faded with strikethrough
- [ ] Floating action bar appears when pending changes exist
- [ ] Calendar auto-scrolls to show affected time ranges
- [ ] Shared pending state between chat and calendar components
