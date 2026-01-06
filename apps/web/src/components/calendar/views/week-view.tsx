import { useMemo } from "react";

import type { CalendarEvent } from "@/hooks/use-events";

import { TimeGrid } from "../time-grid";

interface WeekViewProps {
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

export function WeekView({
  currentDate,
  events,
  onEventClick,
  onEventSelect,
  onClearSelection,
  selectedEventId,
  onEventDrop,
  onEventResize,
  onSlotClick,
}: WeekViewProps) {
  const dates = useMemo(() => {
    const start = new Date(currentDate);
    const dayOfWeek = start.getDay();
    start.setDate(start.getDate() - dayOfWeek);
    start.setHours(0, 0, 0, 0);

    return Array.from({ length: 7 }, (_, i) => {
      const date = new Date(start);
      date.setDate(start.getDate() + i);
      return date;
    });
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
