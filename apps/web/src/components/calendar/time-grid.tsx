import { useCallback, useMemo } from "react";

import { ScrollArea } from "@/components/ui/scroll-area";
import type { CalendarEvent } from "@/hooks/use-events";
import { cn } from "@/lib/utils";

import { EventBlock } from "./event-block";

interface TimeGridProps {
  dates: Date[];
  events: CalendarEvent[];
  startHour?: number;
  endHour?: number;
  slotHeight?: number;
  onEventClick?: (event: CalendarEvent) => void;
  onEventDrop?: (eventId: string, newStart: Date, newEnd: Date) => void;
  onEventResize?: (eventId: string, newStart: Date, newEnd: Date) => void;
  onSlotClick?: (start: Date, end: Date) => void;
  showDayHeader?: boolean;
}

const HOURS = Array.from({ length: 24 }, (_, i) => i);

function formatHour(hour: number): string {
  if (hour === 0) {
    return "12 AM";
  }
  if (hour === 12) {
    return "12 PM";
  }
  if (hour < 12) {
    return `${hour} AM`;
  }
  return `${hour - 12} PM`;
}

function getEventPosition(
  event: CalendarEvent,
  date: Date,
  startHour: number,
  slotHeight: number
): { top: number; height: number } | null {
  const eventStart = new Date(event.startTime);
  const eventEnd = new Date(event.endTime);

  const dayStart = new Date(date);
  dayStart.setHours(0, 0, 0, 0);
  const dayEnd = new Date(date);
  dayEnd.setHours(23, 59, 59, 999);

  if (eventEnd < dayStart || eventStart > dayEnd) {
    return null;
  }

  const displayStart = eventStart < dayStart ? dayStart : eventStart;
  const displayEnd = eventEnd > dayEnd ? dayEnd : eventEnd;

  const startMinutes =
    (displayStart.getHours() - startHour) * 60 + displayStart.getMinutes();
  const endMinutes =
    (displayEnd.getHours() - startHour) * 60 + displayEnd.getMinutes();

  const top = (startMinutes / 60) * slotHeight;
  const height = Math.max(
    ((endMinutes - startMinutes) / 60) * slotHeight,
    slotHeight / 4
  );

  return { top, height };
}

function isSameDay(date1: Date, date2: Date): boolean {
  return (
    date1.getFullYear() === date2.getFullYear() &&
    date1.getMonth() === date2.getMonth() &&
    date1.getDate() === date2.getDate()
  );
}

export function TimeGrid({
  dates,
  events,
  startHour = 0,
  endHour = 24,
  slotHeight = 60,
  onEventClick,
  onEventDrop,
  onEventResize,
  onSlotClick,
  showDayHeader = true,
}: TimeGridProps) {
  const displayHours = HOURS.slice(startHour, endHour);
  const totalHeight = displayHours.length * slotHeight;

  const today = useMemo(() => {
    const d = new Date();
    d.setHours(0, 0, 0, 0);
    return d;
  }, []);

  const eventsByDate = useMemo(() => {
    const map = new Map<string, CalendarEvent[]>();

    for (const date of dates) {
      const key = date.toISOString().split("T")[0];
      const dayEvents = events.filter((event) => {
        if (event.isAllDay) {
          return false;
        }
        const start = new Date(event.startTime);
        const end = new Date(event.endTime);
        const dayStart = new Date(date);
        dayStart.setHours(0, 0, 0, 0);
        const dayEnd = new Date(date);
        dayEnd.setHours(23, 59, 59, 999);
        return start <= dayEnd && end >= dayStart;
      });
      map.set(key ?? "", dayEvents);
    }

    return map;
  }, [dates, events]);

  const handleSlotClick = useCallback(
    (date: Date, hour: number) => {
      if (!onSlotClick) {
        return;
      }

      const start = new Date(date);
      start.setHours(hour, 0, 0, 0);
      const end = new Date(start);
      end.setHours(hour + 1, 0, 0, 0);

      onSlotClick(start, end);
    },
    [onSlotClick]
  );

  const handleColumnDrop = useCallback(
    (e: React.DragEvent, date: Date) => {
      e.preventDefault();
      const eventId = e.dataTransfer.getData("text/plain");
      if (!(eventId && onEventDrop)) {
        return;
      }

      const rect = e.currentTarget.getBoundingClientRect();
      const y = e.clientY - rect.top;
      const hour = Math.floor(y / slotHeight) + startHour;
      const minutes =
        Math.round((((y % slotHeight) / slotHeight) * 60) / 15) * 15;

      const event = events.find((ev) => ev.id === eventId);
      if (!event) {
        return;
      }

      const eventStart = new Date(event.startTime);
      const eventEnd = new Date(event.endTime);
      const duration = eventEnd.getTime() - eventStart.getTime();

      const newStart = new Date(date);
      newStart.setHours(hour, minutes, 0, 0);
      const newEnd = new Date(newStart.getTime() + duration);

      onEventDrop(eventId, newStart, newEnd);
    },
    [events, onEventDrop, slotHeight, startHour]
  );

  return (
    <div className="flex h-full flex-col">
      {showDayHeader && (
        <div className="flex border-b">
          <div className="w-16 shrink-0" />
          {dates.map((date) => {
            const isToday = isSameDay(date, today);
            return (
              <div
                className={cn(
                  "flex-1 border-l py-2 text-center",
                  isToday && "bg-primary/5"
                )}
                key={date.toISOString()}
              >
                <div className="text-muted-foreground text-xs">
                  {date.toLocaleDateString("en-US", { weekday: "short" })}
                </div>
                <div
                  className={cn(
                    "mx-auto mt-1 flex size-8 items-center justify-center rounded-full font-semibold text-lg",
                    isToday && "bg-primary text-primary-foreground"
                  )}
                >
                  {date.getDate()}
                </div>
              </div>
            );
          })}
        </div>
      )}

      <ScrollArea className="flex-1">
        <div className="flex" style={{ height: totalHeight }}>
          <div className="w-16 shrink-0">
            {displayHours.map((hour) => (
              <div
                className="relative border-b pr-2 text-right text-muted-foreground text-xs"
                key={hour}
                style={{ height: slotHeight }}
              >
                <span className="absolute -top-2 right-2">
                  {formatHour(hour)}
                </span>
              </div>
            ))}
          </div>

          {dates.map((date) => {
            const key = date.toISOString().split("T")[0];
            const dayEvents = eventsByDate.get(key ?? "") ?? [];
            const isToday = isSameDay(date, today);

            return (
              // biome-ignore lint/a11y/noStaticElementInteractions: Drag-drop zone for calendar events requires div
              // biome-ignore lint/a11y/noNoninteractiveElementInteractions: Drag-drop zone for calendar events
              // biome-ignore lint/a11y/useAriaPropsSupportedByRole: aria-label provides context for screen readers
              <div
                aria-label={`Events for ${date.toLocaleDateString()}`}
                className={cn(
                  "relative flex-1 border-l",
                  isToday && "bg-primary/5"
                )}
                key={date.toISOString()}
                onDragOver={(e) => e.preventDefault()}
                onDrop={(e) => handleColumnDrop(e, date)}
              >
                {displayHours.map((hour) => (
                  <button
                    className="block w-full cursor-pointer border-b transition-colors hover:bg-accent/50"
                    key={hour}
                    onClick={() => handleSlotClick(date, hour)}
                    style={{ height: slotHeight }}
                    type="button"
                  />
                ))}

                {dayEvents.map((event) => {
                  const position = getEventPosition(
                    event,
                    date,
                    startHour,
                    slotHeight
                  );
                  if (!position) {
                    return null;
                  }

                  return (
                    <EventBlock
                      columnDate={date}
                      event={event}
                      key={event.id}
                      onClick={onEventClick}
                      onDragEnd={onEventDrop}
                      onResizeEnd={onEventResize}
                      slotHeight={slotHeight}
                      startHour={startHour}
                      style={{
                        top: position.top,
                        height: position.height,
                      }}
                    />
                  );
                })}
              </div>
            );
          })}
        </div>
      </ScrollArea>
    </div>
  );
}
