# Todo List

- [ ] First deploy to Dokploy both backend and frontend

## Calendar View

- [ ] Sync with Google Calendar (read and write)
- [ ] Support recurring events
- [ ] CRUD events on the calendar
- [ ] Drag events to reschedule
- [ ] Expand/shrink events by dragging edges
- [ ] Click event to edit via popup
- [ ] Add event button with popup

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
