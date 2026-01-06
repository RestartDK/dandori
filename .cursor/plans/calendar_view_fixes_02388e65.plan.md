---
name: Calendar View Fixes
overview: "Fix five calendar view issues: prevent popup on drag end, persist view preference to localStorage, top-align event text, enable grid scrolling, and change slot interaction from hover/click to double-click."
todos:
  - id: fix-drag-popup
    content: Track drag state in event-block.tsx to prevent onClick after drag
    status: pending
  - id: persist-view
    content: Add localStorage read/write for calendar view preference
    status: pending
  - id: top-align-text
    content: Update event-block.tsx to top-align text content
    status: pending
  - id: fix-scroll
    content: Fix ScrollArea in time-grid.tsx to enable vertical scrolling
    status: pending
  - id: double-click-slots
    content: Change time slots from hover/click to double-click interaction
    status: pending
---

# Calendar View Bug Fixes

## 1. Prevent Popup Dialog After Dragging Events

**Problem**: When dragging an event, the `onClick` handler fires after `onDragEnd`, opening the event dialog.**Solution**: Track drag state in [`event-block.tsx`](apps/web/src/components/calendar/event-block.tsx) and skip the `onClick` if a drag just occurred. Use a ref to track if the user was dragging and reset it after a short timeout.

```typescript
// Add a ref to track recent drag
const wasDragging = useRef(false);

// In handleDragEnd, set the flag
wasDragging.current = true;
setTimeout(() => { wasDragging.current = false; }, 0);

// In onClick, check the flag
onClick={(e) => {
  if (wasDragging.current) return;
  onClick?.(event);
}}
```

---

## 2. Persist Calendar View in LocalStorage

**Problem**: The view preference (day/week/month/year) resets to "week" on page reload.**Solution**: In [`calendar.tsx`](apps/web/src/components/calendar/calendar.tsx), initialize `currentView` from localStorage and sync changes back.

```typescript
const [currentView, setCurrentView] = useState<CalendarView>(() => {
  const saved = localStorage.getItem("calendar-view");
  return (saved as CalendarView) ?? "week";
});

// Add useEffect to persist changes
useEffect(() => {
  localStorage.setItem("calendar-view", currentView);
}, [currentView]);
```

---

## 3. Top-Align Event Text

**Problem**: Text inside calendar events is centered instead of aligned to the top.**Solution**: Update the event block button in [`event-block.tsx`](apps/web/src/components/calendar/event-block.tsx) to use `items-start` for top alignment:

```typescript
// Change from current classes to include items-start
<button
  className={cn(
    "absolute right-1 left-1 flex flex-col items-start ...",
  )}
```

---

## 4. Enable Calendar Grid Scrolling

**Problem**: The time grid is not scrollable.**Solution**: The `ScrollArea` in [`time-grid.tsx`](apps/web/src/components/calendar/time-grid.tsx) needs proper overflow handling. Add `overflow-auto` to the viewport and ensure the inner content has a fixed height that exceeds the container:

- Ensure the `ScrollArea` wrapper has `h-full overflow-hidden` on the parent
- Add explicit overflow styles to allow vertical scrolling

---

## 5. Remove Hover Effect and Use Double-Click for Adding Events

**Problem**: Hour slots have a hover effect and single-click opens the add event dialog.**Solution**: In [`time-grid.tsx`](apps/web/src/components/calendar/time-grid.tsx):

1. Remove `hover:bg-accent/50` from the hour slot buttons (line 241)
2. Change `onClick` to `onDoubleClick` for adding new events
3. Remove the cursor-pointer class from slots
```typescript
<button
  className="block w-full border-b"  // Remove hover and cursor classes
  onDoubleClick={() => handleSlotClick(date, hour)}  // Change to double-click
  ...
/>
```


Also update [`month-view.tsx`](apps/web/src/components/calendar/views/month-view.tsx) to use double-click for day cells:

- Remove `hover:bg-accent/50` from day cells
- Change `onClick` to `onDoubleClick`

---

## Files to Modify

1. [`apps/web/src/components/calendar/event-block.tsx`](apps/web/src/components/calendar/event-block.tsx) - Issues 1 and 3