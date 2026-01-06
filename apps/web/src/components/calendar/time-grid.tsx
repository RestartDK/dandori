import { useCallback, useEffect, useMemo, useRef, useState } from "react";

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
const ALL_DAY_EVENT_HEIGHT = 24;
const TIME_GRID_PADDING_TOP = 12;
const TIME_GRID_PADDING_BOTTOM = 16;

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

function getContrastColor(hexColor: string): string {
  const r = Number.parseInt(hexColor.slice(1, 3), 16);
  const g = Number.parseInt(hexColor.slice(3, 5), 16);
  const b = Number.parseInt(hexColor.slice(5, 7), 16);
  const luminance = (0.299 * r + 0.587 * g + 0.114 * b) / 255;
  return luminance > 0.5 ? "#000000" : "#ffffff";
}

interface AllDayEventBlockProps {
  event: CalendarEvent;
  onClick?: (event: CalendarEvent) => void;
}

function AllDayEventBlock({ event, onClick }: AllDayEventBlockProps) {
  const textColor = getContrastColor(event.color);

  return (
    <button
      className="flex w-full items-center truncate rounded px-2 text-left font-medium text-xs transition-opacity hover:opacity-90"
      onClick={() => onClick?.(event)}
      style={{
        backgroundColor: event.color,
        color: textColor,
        height: ALL_DAY_EVENT_HEIGHT,
      }}
      type="button"
    >
      {event.title}
    </button>
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
  const columnRef = useRef<HTMLDivElement>(null);
  const [columnWidth, setColumnWidth] = useState(0);

  useEffect(() => {
    const updateColumnWidth = () => {
      if (columnRef.current) {
        setColumnWidth(columnRef.current.offsetWidth);
      }
    };

    updateColumnWidth();

    const observer = new ResizeObserver(updateColumnWidth);
    if (columnRef.current) {
      observer.observe(columnRef.current);
    }

    return () => observer.disconnect();
  }, []);

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

  const allDayEventsByDate = useMemo(() => {
    const map = new Map<string, CalendarEvent[]>();

    for (const date of dates) {
      const key = date.toISOString().split("T")[0];
      const dayStart = new Date(date);
      dayStart.setHours(0, 0, 0, 0);
      const dayEnd = new Date(date);
      dayEnd.setHours(23, 59, 59, 999);

      const allDayEvents = events.filter((event) => {
        if (!event.isAllDay) {
          return false;
        }
        const start = new Date(event.startTime);
        const end = new Date(event.endTime);
        return start <= dayEnd && end >= dayStart;
      });
      map.set(key ?? "", allDayEvents);
    }

    return map;
  }, [dates, events]);

  const maxAllDayEvents = useMemo(() => {
    let max = 0;
    for (const dayEvents of allDayEventsByDate.values()) {
      max = Math.max(max, dayEvents.length);
    }
    return max;
  }, [allDayEventsByDate]);

  const hasAllDayEvents = maxAllDayEvents > 0;
  const allDayRowHeight = hasAllDayEvents
    ? Math.max(
        ALL_DAY_EVENT_HEIGHT + 8,
        maxAllDayEvents * (ALL_DAY_EVENT_HEIGHT + 4) + 8
      )
    : 0;

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

      {hasAllDayEvents && (
        <div className="flex border-b" style={{ minHeight: allDayRowHeight }}>
          <div className="flex w-16 shrink-0 items-center justify-end pr-2">
            <span className="text-muted-foreground text-xs">All day</span>
          </div>
          {dates.map((date) => {
            const key = date.toISOString().split("T")[0];
            const dayAllDayEvents = allDayEventsByDate.get(key ?? "") ?? [];
            const isToday = isSameDay(date, today);

            return (
              <div
                className={cn(
                  "relative flex flex-1 flex-col gap-1 border-l p-1",
                  isToday && "bg-primary/5"
                )}
                key={date.toISOString()}
              >
                {dayAllDayEvents.map((event) => (
                  <AllDayEventBlock
                    event={event}
                    key={event.id}
                    onClick={onEventClick}
                  />
                ))}
              </div>
            );
          })}
        </div>
      )}

      <ScrollArea className="h-full flex-1 overflow-hidden">
        <div
          className="flex"
          style={{
            minHeight:
              totalHeight + TIME_GRID_PADDING_TOP + TIME_GRID_PADDING_BOTTOM,
          }}
        >
          <div className="w-16 shrink-0">
            <div style={{ height: TIME_GRID_PADDING_TOP }} />
            {displayHours.map((hour) => (
              <div
                className="relative pr-2 text-right text-muted-foreground text-xs"
                key={hour}
                style={{ height: slotHeight }}
              >
                <span className="absolute -top-2 right-2">
                  {formatHour(hour)}
                </span>
              </div>
            ))}
            <div style={{ height: TIME_GRID_PADDING_BOTTOM }} />
          </div>

          {dates.map((date, index) => {
            const key = date.toISOString().split("T")[0];
            const dayEvents = eventsByDate.get(key ?? "") ?? [];
            const isToday = isSameDay(date, today);

            return (
              <div
                className={cn(
                  "relative flex-1 border-l",
                  isToday && "bg-primary/5"
                )}
                key={date.toISOString()}
                ref={index === 0 ? columnRef : undefined}
              >
                <div style={{ height: TIME_GRID_PADDING_TOP }} />
                {displayHours.map((hour) => (
                  <button
                    className="block w-full border-b"
                    key={hour}
                    onDoubleClick={() => handleSlotClick(date, hour)}
                    style={{ height: slotHeight }}
                    type="button"
                  />
                ))}
                <div style={{ height: TIME_GRID_PADDING_BOTTOM }} />

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

                  const eventStart = new Date(event.startTime);
                  const dayStart = new Date(date);
                  dayStart.setHours(0, 0, 0, 0);
                  const isContinuation = eventStart < dayStart;

                  return (
                    <EventBlock
                      columnDate={date}
                      columnWidth={columnWidth}
                      event={event}
                      isContinuation={isContinuation}
                      key={event.id}
                      onClick={onEventClick}
                      onDragEnd={onEventDrop}
                      onResizeEnd={onEventResize}
                      slotHeight={slotHeight}
                      startHour={startHour}
                      style={{
                        top: position.top + TIME_GRID_PADDING_TOP,
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
