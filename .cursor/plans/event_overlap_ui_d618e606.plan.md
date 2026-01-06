---
name: Event Overlap UI
overview: Implement overlapping event layout with side-by-side positioning for exact same-time events, indented stacking for partial overlaps with click-to-focus behavior, and change interaction from single-click-edit to single-click-select with double-click-edit.
todos:
  - id: overlap-algorithm
    content: Implement overlap detection and layout calculation in time-grid.tsx
    status: pending
  - id: event-block-props
    content: Add selection state, opacity handling, and layout props to EventBlock
    status: pending
  - id: double-click-edit
    content: Change EventBlock to use double-click for edit, single-click for select
    status: pending
  - id: timegrid-selection
    content: Add selected event tracking and pass layout/selection props in TimeGrid
    status: pending
  - id: calendar-handlers
    content: Split event handlers and manage selection state in Calendar component
    status: pending
---

# Event Overlap UI/UX Implementation

## Key Files to Modify

- [`apps/web/src/components/calendar/time-grid.tsx`](apps/web/src/components/calendar/time-grid.tsx) - Add overlap detection algorithm and layout calculation
- [`apps/web/src/components/calendar/event-block.tsx`](apps/web/src/components/calendar/event-block.tsx) - Add selection state, opacity toggle, and double-click handling
- [`apps/web/src/components/calendar/calendar.tsx`](apps/web/src/components/calendar/calendar.tsx) - Manage selected event state across the calendar

---

## Implementation

### 1. Overlap Detection Algorithm (in `time-grid.tsx`)

Create a `calculateEventLayout` function that:

- Groups events that overlap (share any time)
- For **exact same start/end time**: Assigns each to a column (width = 100% / column count, left = column index * width)
- For **partial overlaps**: First event gets full width, subsequent events get progressively more left margin (e.g., 10% per level) and higher z-index
```typescript
interface EventLayout {
  width: string;      // e.g., "50%", "90%"
  left: string;       // e.g., "0%", "10%"
  zIndex: number;     // stacking order
}
```




### 2. Event Block Changes (`event-block.tsx`)

**New props:**

- `isSelected?: boolean` - Controls filled vs translucent state
- `onSelect?: (event: CalendarEvent) => void` - Single click handler
- `onEdit?: (event: CalendarEvent) => void` - Double click handler
- `layoutStyle?: { width: string; left: string; zIndex: number }` - Overlap positioning

**Behavior changes:**

- Default state: `opacity: 0.7` (translucent)
- Selected state: `opacity: 1` (filled) + elevated z-index to bring to front
- Single click (`onTap`): Calls `onSelect` to toggle selection
- Double click: Calls `onEdit` to open dialog

### 3. TimeGrid Changes (`time-grid.tsx`)

- Add `selectedEventId` state
- Run overlap calculation on `dayEvents` before rendering
- Pass layout props (`width`, `left`, `zIndex`) to each `EventBlock`
- When an event is selected, boost its z-index to bring it to front over overlapping events
- Handle `onSelect` to update `selectedEventId`

### 4. Calendar Component Changes (`calendar.tsx`)

- Split `handleEventClick` into two handlers:
- `handleEventSelect` - Sets visual focus (filled state)
- `handleEventEdit` - Opens dialog (double-click)
- Clear selection when clicking elsewhere

---

## Visual Behavior Summary

| Scenario | Layout |

|----------|--------|

| Same start AND end time | Side-by-side columns (equal width) |

| Partial overlap | Stacked with left indent, later events on top |

| Event clicked | Becomes opaque, z-index boosted to top |

| Event double-clicked | Opens edit dialog |