import { useMemo } from "react";

import type { CalendarEvent } from "@/hooks/use-events";

import { TimeGrid } from "../time-grid";

interface DayViewProps {
  currentDate: Date;
  events: CalendarEvent[];
  onEventClick?: (event: CalendarEvent) => void;
  onEventDrop?: (eventId: string, newStart: Date, newEnd: Date) => void;
  onEventResize?: (eventId: string, newStart: Date, newEnd: Date) => void;
  onSlotClick?: (start: Date, end: Date) => void;
}

export function DayView({
  currentDate,
  events,
  onEventClick,
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
      onEventClick={onEventClick}
      onEventDrop={onEventDrop}
      onEventResize={onEventResize}
      onSlotClick={onSlotClick}
      showDayHeader={true}
    />
  );
}
