import { useMemo } from "react";
import type { CalendarEvent } from "@/hooks/use-events";
import { cn } from "@/lib/utils";

interface MonthViewProps {
  currentDate: Date;
  events: CalendarEvent[];
  onEventClick?: (event: CalendarEvent) => void;
  onSlotClick?: (start: Date, end: Date) => void;
  onDateClick?: (date: Date) => void;
}

const WEEKDAYS = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];

function getMonthDays(date: Date): Date[] {
  const year = date.getFullYear();
  const month = date.getMonth();

  const firstDay = new Date(year, month, 1);
  const lastDay = new Date(year, month + 1, 0);

  const startDay = new Date(firstDay);
  startDay.setDate(startDay.getDate() - firstDay.getDay());

  const days: Date[] = [];
  const current = new Date(startDay);

  while (days.length < 42) {
    days.push(new Date(current));
    current.setDate(current.getDate() + 1);
    if (days.length >= 35 && current > lastDay && current.getDay() === 0) {
      break;
    }
  }

  return days;
}

function isSameDay(date1: Date, date2: Date): boolean {
  return (
    date1.getFullYear() === date2.getFullYear() &&
    date1.getMonth() === date2.getMonth() &&
    date1.getDate() === date2.getDate()
  );
}

function isSameMonth(date1: Date, date2: Date): boolean {
  return (
    date1.getFullYear() === date2.getFullYear() &&
    date1.getMonth() === date2.getMonth()
  );
}

function isEventOnDay(event: CalendarEvent, day: Date): boolean {
  const start = new Date(event.startTime);
  const end = new Date(event.endTime);
  const dayStart = new Date(day);
  dayStart.setHours(0, 0, 0, 0);
  const dayEnd = new Date(day);
  dayEnd.setHours(23, 59, 59, 999);
  return start <= dayEnd && end >= dayStart;
}

function buildEventsByDayMap(
  events: CalendarEvent[],
  days: Date[]
): Map<string, CalendarEvent[]> {
  const map = new Map<string, CalendarEvent[]>();

  for (const day of days) {
    const key = day.toISOString().split("T")[0] ?? "";
    const dayEvents = events.filter((event) => isEventOnDay(event, day));
    map.set(key, dayEvents);
  }

  return map;
}

export function MonthView({
  currentDate,
  events,
  onEventClick,
  onSlotClick,
  onDateClick,
}: MonthViewProps) {
  const today = useMemo(() => new Date(), []);

  const days = useMemo(() => getMonthDays(currentDate), [currentDate]);

  const eventsByDay = useMemo(
    () => buildEventsByDayMap(events, days),
    [events, days]
  );

  const handleDayClick = (day: Date) => {
    if (onSlotClick) {
      const start = new Date(day);
      start.setHours(9, 0, 0, 0);
      const end = new Date(day);
      end.setHours(10, 0, 0, 0);
      onSlotClick(start, end);
    }
  };

  const handleDateNumberClick = (e: React.MouseEvent, day: Date) => {
    e.stopPropagation();
    onDateClick?.(day);
  };

  return (
    <div className="flex h-full flex-col">
      <div className="grid grid-cols-7 border-b">
        {WEEKDAYS.map((day) => (
          <div
            className="py-2 text-center font-medium text-muted-foreground text-sm"
            key={day}
          >
            {day}
          </div>
        ))}
      </div>

      <div className="grid flex-1 auto-rows-fr grid-cols-7">
        {days.map((day) => {
          const key = day.toISOString().split("T")[0] ?? "";
          const dayEvents = eventsByDay.get(key) ?? [];
          const isCurrentMonth = isSameMonth(day, currentDate);
          const isToday = isSameDay(day, today);

          return (
            // biome-ignore lint/a11y/noStaticElementInteractions: Calendar day cell with custom click/keyboard handling
            // biome-ignore lint/a11y/noNoninteractiveElementInteractions: Calendar day cell interaction pattern
            // biome-ignore lint/a11y/useAriaPropsSupportedByRole: aria-label provides context for screen readers
            // biome-ignore lint/a11y/noNoninteractiveTabindex: Day cell needs focus for keyboard navigation
            <div
              aria-label={`${day.toLocaleDateString()}, ${dayEvents.length} events`}
              className={cn(
                "min-h-[100px] cursor-pointer border-r border-b p-1 transition-colors hover:bg-accent/50",
                !isCurrentMonth && "bg-muted/30"
              )}
              key={day.toISOString()}
              onClick={() => handleDayClick(day)}
              onKeyDown={(e) => {
                if (e.key === "Enter" || e.key === " ") {
                  e.preventDefault();
                  handleDayClick(day);
                }
              }}
              tabIndex={0}
            >
              <button
                className={cn(
                  "mb-1 flex size-7 items-center justify-center rounded-full text-sm transition-colors hover:bg-accent",
                  isToday &&
                    "bg-primary text-primary-foreground hover:bg-primary/90",
                  !isCurrentMonth && "text-muted-foreground"
                )}
                onClick={(e) => handleDateNumberClick(e, day)}
                type="button"
              >
                {day.getDate()}
              </button>

              <div className="space-y-0.5 overflow-hidden">
                {dayEvents.slice(0, 3).map((event) => (
                  <button
                    className="block w-full truncate rounded px-1 py-0.5 text-left text-xs transition-opacity hover:opacity-80"
                    key={event.id}
                    onClick={(e) => {
                      e.stopPropagation();
                      onEventClick?.(event);
                    }}
                    style={{
                      backgroundColor: event.color,
                      color: getContrastColor(event.color),
                    }}
                    type="button"
                  >
                    {event.isAllDay ? (
                      event.title
                    ) : (
                      <>
                        <span className="font-medium">
                          {new Date(event.startTime).toLocaleTimeString(
                            "en-US",
                            { hour: "numeric", minute: "2-digit" }
                          )}
                        </span>{" "}
                        {event.title}
                      </>
                    )}
                  </button>
                ))}
                {dayEvents.length > 3 && (
                  <div className="px-1 text-muted-foreground text-xs">
                    +{dayEvents.length - 3} more
                  </div>
                )}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

function getContrastColor(hexColor: string): string {
  const r = Number.parseInt(hexColor.slice(1, 3), 16);
  const g = Number.parseInt(hexColor.slice(3, 5), 16);
  const b = Number.parseInt(hexColor.slice(5, 7), 16);

  const luminance = (0.299 * r + 0.587 * g + 0.114 * b) / 255;

  return luminance > 0.5 ? "#000000" : "#ffffff";
}
