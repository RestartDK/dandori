# AI Calendar Agent Implementation Plan

**Status:** Planning**Priority:** High**Created:** 2026-01-06

## Overview

Implement a chat-based AI calendar assistant using **Vercel AI SDK** with **Google Gemini**. The agent will have access to calendar tools with multi-step tool calling capabilities and stream responses via SSE through Elysia. This enables users to interact naturally with their calendar for scheduling, finding free time, and receiving insights.

## Architecture Diagram

```javascript
┌─────────────────────────────────────────────────────────────────┐
│                        Frontend (React)                         │
├─────────────────────────────────────────────────────────────────┤
│  ChatPanel (collapsible)                                        │
│  ├── useChat hook (AI SDK UI)                                   │
│  ├── Message rendering with tool parts                          │
│  ├── ToolCallCard (shows tool execution progress)               │
│  └── ProposalCard (Accept/Decline pending changes)              │
│                                                                 │
│  Calendar                                                       │
│  └── Shared pending changes state (via context)                 │
└──────────────────────────────┬──────────────────────────────────┘
                               │ SSE Stream
                               ▼
┌─────────────────────────────────────────────────────────────────┐
│                     Backend (Elysia)                            │
├─────────────────────────────────────────────────────────────────┤
│  POST /api/chat                                                 │
│  ├── streamText() with maxSteps: 10                             │
│  ├── toDataStreamResponse()                                     │
│  └── Tools:                                                     │
│      ├── createEvent (needsApproval: true)                      │
│      ├── readEvents                                             │
│      ├── updateEvent (needsApproval: true)                      │
│      ├── deleteEvent (needsApproval: true)                      │
│      ├── queryCalendar                                          │
│      └── getUserInfo                                            │
└─────────────────────────────────────────────────────────────────┘
```

## UI Component Diagrams

### Dashboard Layout (Calendar + Chat Panel)

**Expanded Chat Panel:**

```
┌──────────────────────────────────────────────────────────────────────────────────────────┐
│  Header                                                                    [User Menu]   │
├────────────────────────────────────────────────────────────────────┬─────────────────────┤
│                                                                    │  💬 AI Assistant  ◀ │
│                         CALENDAR                                   ├─────────────────────┤
│                                                                    │                     │
│  ┌─────────┬─────────┬─────────┬─────────┬─────────┬─────────┐    │  Hi! I can help you │
│  │   Mon   │   Tue   │   Wed   │   Thu   │   Fri   │   Sat   │    │  manage your        │
│  ├─────────┼─────────┼─────────┼─────────┼─────────┼─────────┤    │  calendar. Try:     │
│  │         │ ████████│         │         │         │         │    │                     │
│  │  9 AM   │ Standup │         │         │         │         │    │  • "Schedule a      │
│  │         │ ████████│         │         │         │         │    │    meeting"         │
│  ├─────────┼─────────┼─────────┼─────────┼─────────┼─────────┤    │  • "When am I free  │
│  │         │         │ ████████│         │         │         │    │    tomorrow?"       │
│  │ 10 AM   │         │ 1:1 Mtg │         │         │         │    │                     │
│  │         │         │ ████████│         │         │         │    ├─────────────────────┤
│  ├─────────┼─────────┼─────────┼─────────┼─────────┼─────────┤    │  ┌─────────────────┐ │
│  │         │         │         │         │         │         │    │  │ Type a message..│ │
│  │ 11 AM   │         │         │         │         │         │    │  └─────────────────┘ │
│  │         │         │         │         │         │         │    │              [Send]  │
│  └─────────┴─────────┴─────────┴─────────┴─────────┴─────────┘    │                     │
│                                                                    │                     │
│                          flex-1                                    │       w-96          │
└────────────────────────────────────────────────────────────────────┴─────────────────────┘
```

**Collapsed Chat Panel:**

```
┌──────────────────────────────────────────────────────────────────────────────────────────┐
│  Header                                                                    [User Menu]   │
├──────────────────────────────────────────────────────────────────────────────────────┬───┤
│                                                                                      │   │
│                              CALENDAR                                                │ ▶ │
│                                                                                      │   │
│  ┌─────────┬─────────┬─────────┬─────────┬─────────┬─────────┬─────────┐            │ 💬│
│  │   Mon   │   Tue   │   Wed   │   Thu   │   Fri   │   Sat   │   Sun   │            │   │
│  ├─────────┼─────────┼─────────┼─────────┼─────────┼─────────┼─────────┤            │   │
│  │         │ ████████│         │         │         │         │         │            │   │
│  │  9 AM   │ Standup │         │         │         │         │         │            │   │
│  │         │ ████████│         │         │         │         │         │            │   │
│  ├─────────┼─────────┼─────────┼─────────┼─────────┼─────────┼─────────┤            │   │
│  │         │         │ ████████│         │         │         │         │            │   │
│  │ 10 AM   │         │ 1:1 Mtg │         │         │         │         │            │   │
│  │         │         │ ████████│         │         │         │         │            │   │
│  ├─────────┼─────────┼─────────┼─────────┼─────────┼─────────┼─────────┤            │   │
│  │         │         │         │         │         │         │         │            │   │
│  │ 11 AM   │         │         │         │         │         │         │            │   │
│  │         │         │         │         │         │         │         │            │   │
│  └─────────┴─────────┴─────────┴─────────┴─────────┴─────────┴─────────┘            │   │
│                                                                                      │   │
│                                     flex-1                                           │w12│
└──────────────────────────────────────────────────────────────────────────────────────┴───┘
```

**Chat Panel with Active Conversation:**

```
┌────────────────────────────────────────────────────────────────────┬─────────────────────┐
│                                                                    │  💬 AI Assistant  ◀ │
│                         CALENDAR                                   ├─────────────────────┤
│                                                                    │                     │
│  ┌─────────┬─────────┬─────────┬─────────┬─────────┬─────────┐    │  You: Schedule a    │
│  │   Mon   │   Tue   │   Wed   │   Thu   │   Fri   │   Sat   │    │  team meeting for   │
│  ├─────────┼─────────┼─────────┼─────────┼─────────┼─────────┤    │  tomorrow           │
│  │         │ ████████│         │         │         │         │    │                     │
│  │  9 AM   │ Standup │         │         │         │         │    ├─────────────────────┤
│  │         │ ████████│         │         │         │         │    │  🤖 Let me check    │
│  ├─────────┼─────────┼─────────┼─────────┼─────────┼─────────┤    │  your schedule...   │
│  │         │         │ ████████│ ░░░░░░░░│         │         │    │                     │
│  │ 10 AM   │         │ 1:1 Mtg │ pending │         │         │    │  ┌─────────────────┐│
│  │         │         │ ████████│ ░░░░░░░░│         │         │    │  │✅ Read events   ││
│  ├─────────┼─────────┼─────────┼─────────┼─────────┼─────────┤    │  │🔄 Query free... ││
│  │         │         │         │         │         │         │    │  │○ Create event   ││
│  │ 11 AM   │         │         │         │         │         │    │  └─────────────────┘│
│  │         │         │         │         │         │         │    │                     │
│  └─────────┴─────────┴─────────┴─────────┴─────────┴─────────┘    ├─────────────────────┤
│                                                                    │  ┌─────────────────┐│
│           ░░░░░░░░ = pending event (ghost preview)                 │  │ Type a message..││
│                                                                    │  └─────────────────┘│
└────────────────────────────────────────────────────────────────────┴─────────────────────┘
```

### Proposal Cards (Approval Required)

**Create Event Proposal:**

```javascript
┌─────────────────────────────────────────────────────────┐
│  📅  Create Event                                       │
├─────────────────────────────────────────────────────────┤
│                                                         │
│  Title:  Team Standup Meeting                           │
│  Date:   Jan 7, 2026                                    │
│  Time:   9:00 AM - 9:30 AM                              │
│  Color:  ● Blue                                         │
│                                                         │
│  ┌───────────────┐    ┌───────────────┐                 │
│  │    Accept     │    │    Decline    │                 │
│  └───────────────┘    └───────────────┘                 │
└─────────────────────────────────────────────────────────┘
```

**Update Event Proposal:**

```javascript
┌─────────────────────────────────────────────────────────┐
│  ✏️  Update Event                                       │
├─────────────────────────────────────────────────────────┤
│                                                         │
│  Title:  Team Standup Meeting                           │
│                                                         │
│  ┌─────────────────────────────────────────────────┐    │
│  │  Before          →        After                 │    │
│  │  9:00 AM - 9:30 AM       10:00 AM - 10:30 AM    │    │
│  └─────────────────────────────────────────────────┘    │
│                                                         │
│  ┌───────────────┐    ┌───────────────┐                 │
│  │    Accept     │    │    Decline    │                 │
│  └───────────────┘    └───────────────┘                 │
└─────────────────────────────────────────────────────────┘
```

**Delete Event Proposal:**

```javascript
┌─────────────────────────────────────────────────────────┐
│  🗑️  Delete Event                                       │
├─────────────────────────────────────────────────────────┤
│                                                         │
│  Title:  Team Standup Meeting                           │
│  Date:   Jan 7, 2026                                    │
│  Time:   9:00 AM - 9:30 AM                              │
│                                                         │
│  ⚠️  This action cannot be undone                       │
│                                                         │
│  ┌───────────────┐    ┌───────────────┐                 │
│  │    Accept     │    │    Decline    │                 │
│  └───────────────┘    └───────────────┘                 │
└─────────────────────────────────────────────────────────┘
```

**Approved State (Success):**

```javascript
┌─────────────────────────────────────────────────────────┐
│  ✅  Event Created                          ● Success   │
├─────────────────────────────────────────────────────────┤
│                                                         │
│  Title:  Team Standup Meeting                           │
│  Date:   Jan 7, 2026                                    │
│  Time:   9:00 AM - 9:30 AM                              │
│                                                         │
└─────────────────────────────────────────────────────────┘
```

**Declined State:**

```javascript
┌─────────────────────────────────────────────────────────┐
│  ❌  Event Declined                         ● Declined  │
├─────────────────────────────────────────────────────────┤
│                                                         │
│  Title:  Team Standup Meeting                           │
│  Date:   Jan 7, 2026                                    │
│                                                         │
└─────────────────────────────────────────────────────────┘
```

### Tool Call Cards (Multi-Step Execution UI)

**Tool Call In Progress:**

```javascript
┌─────────────────────────────────────────────────────────┐
│  🔄  Reading Events...                                  │
├─────────────────────────────────────────────────────────┤
│                                                         │
│  Fetching events from Jan 6 - Jan 13, 2026              │
│                                                         │
│  ████████████░░░░░░░░░░░░░░░░░░░                        │
│                                                         │
└─────────────────────────────────────────────────────────┘
```

**Tool Call Completed:**

```javascript
┌─────────────────────────────────────────────────────────┐
│  ✅  Events Retrieved                       ● Complete  │
├─────────────────────────────────────────────────────────┤
│                                                         │
│  Found 5 events from Jan 6 - Jan 13, 2026               │
│                                                         │
│  • Team Standup (Jan 7, 9:00 AM)                        │
│  • Project Review (Jan 7, 2:00 PM)                      │
│  • 1:1 with Manager (Jan 8, 10:00 AM)                   │
│  • ... and 2 more                                       │
│                                                         │
└─────────────────────────────────────────────────────────┘
```

**Query Calendar Result:**

```javascript
┌─────────────────────────────────────────────────────────┐
│  📊  Calendar Analysis                      ● Complete  │
├─────────────────────────────────────────────────────────┤
│                                                         │
│  Free Time Slots (Jan 7, 2026):                         │
│                                                         │
│  ┌─────────────────────────────────────────────────┐    │
│  │  8:00 AM - 9:00 AM    (1 hour)                  │    │
│  │  11:30 AM - 1:00 PM   (1.5 hours)               │    │
│  │  3:00 PM - 5:00 PM    (2 hours)                 │    │
│  └─────────────────────────────────────────────────┘    │
│                                                         │
└─────────────────────────────────────────────────────────┘
```

**Multi-Step Tool Call Sequence:**

```javascript
┌─────────────────────────────────────────────────────────┐
│  🤖  Agent Actions                          Step 2/3   │
├─────────────────────────────────────────────────────────┤
│                                                         │
│  ✅ Step 1: Read existing events                        │
│     └── Found 5 events this week                        │
│                                                         │
│  🔄 Step 2: Query free time slots                       │
│     └── Analyzing schedule...                           │
│                                                         │
│  ○ Step 3: Create new event                             │
│     └── Pending                                         │
│                                                         │
└─────────────────────────────────────────────────────────┘
```

**Error State:**

```javascript
┌─────────────────────────────────────────────────────────┐
│  ❌  Tool Error                              ● Failed   │
├─────────────────────────────────────────────────────────┤
│                                                         │
│  Failed to read events                                  │
│                                                         │
│  Error: Database connection timeout                     │
│                                                         │
│  ┌───────────────┐                                      │
│  │     Retry     │                                      │
│  └───────────────┘                                      │
└─────────────────────────────────────────────────────────┘
```

## Requirements Checklist

- [ ] Collapsible panel
- [ ] Streaming text responses
- [ ] SSE for tool calls with:
- [ ] Create event
- [ ] Read events
- [ ] Update event
- [ ] Delete event
- [ ] Query calendar (free time, what's on a given day, etc.)
- [ ] Get user information
- [ ] Calendar change preview (user confirms before changes apply)
- [ ] Context: sliding window of past 2 responses + relevant calendar data
- [ ] Multi-step tool calling (agent can chain multiple tools per request)
- [ ] Tool call progress UI (show each step as it executes)

## Implementation Phases

### Phase 1: Backend - AI Agent Setup

#### 1.1 Add GOOGLE_GENERATIVE_AI_API_KEY to env

**File:** `packages/env/src/index.ts`Add to env exports:

```typescript
export const env = {
  // ... existing
  GOOGLE_GENERATIVE_AI_API_KEY: required("GOOGLE_GENERATIVE_AI_API_KEY"),
} as const;
```

#### 1.2 Create calendar tools

**File:** `apps/server/src/agent/tools.ts`Define 6 tools using Zod schemas:| Tool | Description | Needs Approval | Has Execute ||------|-------------|----------------|-------------|| `createEvent` | Create a new calendar event | Yes | No || `readEvents` | Read events in a date range | No | Yes || `updateEvent` | Update an existing event | Yes | No || `deleteEvent` | Delete an event | Yes | No || `queryCalendar` | Query free time, conflicts, etc. | No | Yes || `getUserInfo` | Get current user info | No | Yes |**Tool Definitions:**

1. **createEvent**

- Input: title, description (opt), startTime, endTime, isAllDay (opt), color (opt)
- needsApproval: true
- No execute (user approval triggers creation)

2. **readEvents**

- Input: startDate, endDate (ISO 8601 strings)
- Returns: Array of events with id, title, startTime, endTime, description
- Execute: Query database for events in range

3. **updateEvent**

- Input: eventId, title (opt), description (opt), startTime (opt), endTime (opt), isAllDay (opt), color (opt)
- needsApproval: true
- No execute

4. **deleteEvent**

- Input: eventId
- needsApproval: true
- No execute

5. **queryCalendar**

- Input: query type (free_time | busy_times | conflicts | events_on_day), date/range, duration (opt)
- Returns: Summary of calendar state matching query
- Execute: Analyze events and return insights

6. **getUserInfo**

- Input: (none)
- Returns: { name, email }
- Execute: Return current user info

#### 1.3 Create the calendar agent with multi-step tool calling

**File:** `apps/server/src/agent/calendar-agent.ts`Create agent using `streamText` with Google Gemini and multi-step tool execution:

```typescript
import { streamText } from "ai";
import { google } from "@ai-sdk/google";
import { calendarTools } from "./tools";

export const createCalendarAgent = (context: AgentContext) => {
  return streamText({
    model: google("gemini-2.0-flash"),
    system: CALENDAR_SYSTEM_PROMPT,
    messages: context.messages,
    tools: calendarTools,
    maxSteps: 10, // Enable multi-step tool calling
    toolChoice: "auto",
  });
};
```

**Multi-Step Tool Calling Flow:**

```javascript
User: "Schedule a 1-hour meeting tomorrow when I'm free"
                    │
                    ▼
┌─────────────────────────────────────────────────────────────┐
│  Step 1: Agent calls readEvents(tomorrow)                   │
│          └── Returns: [9am meeting, 2pm meeting]            │
├─────────────────────────────────────────────────────────────┤
│  Step 2: Agent calls queryCalendar(free_time, tomorrow)     │
│          └── Returns: [10am-12pm free, 3pm-5pm free]        │
├─────────────────────────────────────────────────────────────┤
│  Step 3: Agent calls createEvent(title, 10am-11am)          │
│          └── Returns: approval-requested (waits for user)   │
└─────────────────────────────────────────────────────────────┘
                    │
                    ▼
            ProposalCard shown to user
```

System prompt should guide the agent to:

- Always confirm details before making changes
- Check for conflicts by reading existing events first
- Suggest prep time for events
- Be proactive with insights
- Chain multiple tools when needed (e.g., read → analyze → propose)

#### 1.4 Create chat endpoint

**File:** `apps/server/src/index.ts` (add new route)Route: `POST /api/chat`Handler:

- Extract user from session
- Extract messages from body
- Build context window (last 2 assistant responses)
- Get upcoming events for context (next 7 days)
- Call createCalendarAgent() with context
- Return result.toDataStreamResponse()

Context window logic: Keep last 2 assistant responses + all user messages between themTool context to inject:

- userId
- userName
- userEmail

#### 1.5 Implement tool execute functions

**File:** `apps/server/src/agent/tools.ts`For tools with execute:**readEvents:** Query database using drizzle-orm

```typescript
const events = await db
  .select()
  .from(event)
  .where(
    and(
      eq(event.userId, userId),
      gte(event.startTime, new Date(startDate)),
      lte(event.endTime, new Date(endDate))
    )
  );
```

**queryCalendar:** Analyze events based on query type

- free_time: Find gaps in schedule matching duration
- busy_times: Return busy blocks
- conflicts: Find overlapping events
- events_on_day: Return all events for a specific day

**getUserInfo:** Return { name, email } from context

### Phase 2: Frontend - Chat Panel Component

#### 2.1 Create pending changes context

**File:** `apps/web/src/context/pending-changes-context.tsx`Context provides:

- pendingChanges: Array of changes awaiting approval
- addPendingChange: Add a change to pending state
- removePendingChange: Remove by ID
- clearPendingChanges: Clear all

Each pending change:

- id: unique identifier
- type: "create" | "update" | "delete"
- eventData: event details
- originalEvent: for updates, the original event
- toolCallId: for linking to tool invocation

#### 2.2 Create ChatPanel component (collapsible)

**File:** `apps/web/src/components/chat/chat-panel.tsx`Features:

- Collapsible with ChevronLeft/ChevronRight toggle icon
- When collapsed: only show icon button (-left-3 position)
- When expanded: w-96, show full chat UI
- Smooth transition animation
- useChat hook with DefaultChatTransport
- API: /api/chat
- sendAutomaticallyWhen: lastAssistantMessageIsCompleteWithApprovalResponses

Layout:

- Header: Collapse toggle
- ScrollArea: Messages
- Input form with Send button
- Disabled state when status !== "ready"

#### 2.3 Create ChatMessage component

**File:** `apps/web/src/components/chat/chat-message.tsx`Render UIMessage parts:

- text: Simple paragraph
- tool-createEvent: ProposalCard with type="create"
- tool-updateEvent: ProposalCard with type="update"
- tool-deleteEvent: ProposalCard with type="delete"
- tool-readEvents: Show result when output-available
- tool-queryCalendar: Show result when output-available
- tool-getUserInfo: Show result when output-available

For tools requiring approval, show different states:

- approval-requested: Show proposal with Accept/Decline buttons
- output-available: Show success card with checkmark
- output-error: Show error message

#### 2.4 Create ProposalCard component

**File:** `apps/web/src/components/chat/proposal-card.tsx`Card features:

- Icon for change type (Calendar for create, Edit for update, Trash for delete)
- Event title and time range
- Before/after times for updates
- Accept and Decline buttons
- Color-coded success state (green border, green checkmark)

States:

- approval-requested: Show buttons
- output-available: Show success badge
- output-error: Show error message

#### 2.5 Create ToolCallCard component

**File:** `apps/web/src/components/chat/tool-call-card.tsx`Card for displaying tool execution progress in multi-step flows:Features:

- Show tool name and current status (pending, in_progress, complete, error)
- Display tool arguments summary
- Show result preview when complete
- Animate progress for in_progress state
- Collapsible details section

### Phase 3: Integration

#### 3.1 Update dashboard layout

**File:** `apps/web/src/routes/index.tsx`Wrap with PendingChangesProvider:

- Left side: Calendar (flex-1)
- Right side: ChatPanel (w-96 when expanded, w-12 when collapsed)
- Use flexbox layout

### Phase 4: Testing & Refinement

#### 4.1 Manual testing checklist

- [ ] Chat panel opens and closes smoothly
- [ ] Messages stream in real-time
- [ ] Tool calls show approval cards
- [ ] Accept/Decline buttons work
- [ ] Calendar events are created/updated/deleted
- [ ] Free time queries return correct results
- [ ] Multiple tool calls in sequence work
- [ ] Context window maintains conversation history
- [ ] Error handling for invalid inputs

#### 4.2 Edge cases to handle

- User closes chat mid-stream
- User approves/declines after message completes
- Multiple pending changes simultaneously
- Tool execution failures
- Network errors during stream

### Phase 5: Validation & Final Checks

#### 5.1 Run type checking

```bash
bun check-types
```

Ensure all TypeScript types are correct with no errors. Pay special attention to:

- Tool function signatures
- AI SDK types for streamText and useChat
- Treaty client types from server
- React component props

#### 5.2 Run linting and formatting

```bash
bun check
```

This will run Biome to lint and format all code according to the Ultracite style guide. Fix any violations.

#### 5.3 Database schema changes

If any database schema changes were made (e.g., new columns, tables):

```bash
bun db:push
```

This will push schema changes to the database. **Note:** Only run this if schema modifications were made to `packages/db/src/schema/`.

For this implementation, schema changes are **not expected** since we're using existing event tables.

## File Structure

```javascript
apps/server/src/
├── agent/
│   ├── calendar-agent.ts    # streamText with Gemini (NEW)
│   └── tools.ts             # Tool definitions (NEW)
├── google-calendar.ts       # (existing)
└── index.ts                 # Add /api/chat endpoint

apps/web/src/
├── components/
│   ├── chat/                # (NEW)
│   │   ├── chat-panel.tsx      
│   │   ├── chat-message.tsx    
│   │   ├── proposal-card.tsx
│   │   └── tool-call-card.tsx   
│   └── calendar/            # (existing)
├── context/                 # (NEW)
│   └── pending-changes-context.tsx
├── hooks/
│   └── use-events.ts        # (existing)
└── routes/
    └── index.tsx            # Updated with ChatPanel

packages/env/src/
└── index.ts                 # Add GOOGLE_GENERATIVE_AI_API_KEY
```

## Key Design Decisions

1. **Model**: Google Gemini 2.0 Flash via @ai-sdk/google - Fast, capable, and cost-effective for calendar logic
2. **Multi-Step Tool Calling**: Using `maxSteps: 10` to enable agent to chain multiple tools per request
3. **Tool Approval**: Tools requiring state changes (create/update/delete) use needsApproval: true
4. **Context Window**: Last 2 assistant responses preserves conversation context while limiting token usage
5. **Collapsible UI**: Right-side panel doesn't obstruct calendar; toggle for focus
6. **Streaming**: SSE via toDataStreamResponse() provides real-time text + tool updates
7. **Calendar Integration**: Shared context for pending changes between chat and calendar

## Success Criteria

- Chat messages stream in real-time
- Tool calls show as approval cards
- Multi-step tool calling works (agent can chain read → analyze → propose)
- User can accept/decline calendar changes
- Changes apply to calendar immediately after approval
- No TypeScript errors
- All 6 tools function correctly
- Conversation context preserved across turns
- UI responsive on various screen sizes

## Implementation Notes

- Follow existing code patterns (const default, arrow functions, explicit types)
- Use `@dandori-ai/env` for all environment variables
- Maintain existing calendar component structure
- Don't modify shadcn components directly
- Use React Query invalidation after tool execution
- Implement proper error handling and user feedback
- Test SSE connection with network throttling

**packages/env/src/index.ts:**

- Environment variable: `GOOGLE_GENERATIVE_AI_API_KEY`

## References

- AI SDK Docs: https://ai-sdk.dev/docs
- Google Gemini Provider: https://ai-sdk.dev/providers/ai-sdk-providers/google-generative-ai
- Multi-Step Tool Calls: https://ai-sdk.dev/docs/ai-sdk-core/tools-and-tool-calling#multi-step-calls