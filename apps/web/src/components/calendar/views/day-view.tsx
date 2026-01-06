import { useMemo } from "react";

import type { CalendarEvent } from "@/hooks/use-events";

import { TimeGrid } from "../time-grid";

interface DayViewProps {
  currentDate: Date;
  events: CalendarEvent[];
  onEventClick?: (event: CalendarEvent) => void;
  onEventSelect?: (event: CalendarEvent) => void;
  onClearSelection?: () => void;
  selectedEventId?: string | null;
  onEventDrop?: (eventId: string, newStart: Date, newEnd: Date) => void;
  onEventResize?: (eventId: string, newStart: Date, newEnd: Date) => void;
  onSlotClick?: (start: Date, end: Date) => void;
}

export function DayView({
  currentDate,
  events,
  onEventClick,
  onEventSelect,
  onClearSelection,
  selectedEventId,
  onEventDrop,
  onEventResize,
  onSlotClick,
}: DayViewProps) {
  const dates = useMemo(() => {
    const date = new Date(currentDate);
    date.setHours(0, 0, 0, 0);
    return [date];
  }, [currentDate]);

  return (
    <TimeGrid
      dates={dates}
      events={events}
      onClearSelection={onClearSelection}
      onEventClick={onEventClick}
      onEventDrop={onEventDrop}
      onEventResize={onEventResize}
      onEventSelect={onEventSelect}
      onSlotClick={onSlotClick}
      selectedEventId={selectedEventId}
      showDayHeader={true}
    />
  );
}
