import { useMemo } from "react";
import type { CalendarEvent } from "@/hooks/use-events";
import { cn } from "@/lib/utils";

interface YearViewProps {
  currentDate: Date;
  events: CalendarEvent[];
  onDateClick?: (date: Date) => void;
}

const MONTHS = [
  "January",
  "February",
  "March",
  "April",
  "May",
  "June",
  "July",
  "August",
  "September",
  "October",
  "November",
  "December",
];

const WEEKDAYS_SHORT = ["S", "M", "T", "W", "T", "F", "S"];

function getMonthDays(year: number, month: number): (Date | null)[] {
  const firstDay = new Date(year, month, 1);
  const lastDay = new Date(year, month + 1, 0);

  const days: (Date | null)[] = [];

  for (let i = 0; i < firstDay.getDay(); i++) {
    days.push(null);
  }

  for (let day = 1; day <= lastDay.getDate(); day++) {
    days.push(new Date(year, month, day));
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

export function YearView({ currentDate, events, onDateClick }: YearViewProps) {
  const year = currentDate.getFullYear();
  const today = useMemo(() => new Date(), []);

  const eventDates = useMemo(() => {
    const dates = new Set<string>();

    for (const event of events) {
      const start = new Date(event.startTime);
      const end = new Date(event.endTime);

      const current = new Date(start);
      current.setHours(0, 0, 0, 0);

      while (current <= end) {
        dates.add(current.toISOString().split("T")[0] ?? "");
        current.setDate(current.getDate() + 1);
      }
    }

    return dates;
  }, [events]);

  return (
    <div className="grid h-full grid-cols-3 gap-4 overflow-auto p-4 lg:grid-cols-4">
      {MONTHS.map((monthName, monthIndex) => {
        const days = getMonthDays(year, monthIndex);

        return (
          <div className="min-w-[200px]" key={monthName}>
            <h3 className="mb-2 font-semibold text-sm">{monthName}</h3>

            <div className="grid grid-cols-7 gap-px text-center text-xs">
              {WEEKDAYS_SHORT.map((weekday, columnIndex) => (
                <div
                  className="p-1 text-muted-foreground"
                  // biome-ignore lint/suspicious/noArrayIndexKey: Weekday columns are stable and never reorder
                  key={`${monthName}-col-${columnIndex}`}
                >
                  {weekday}
                </div>
              ))}

              {days.map((day, cellIndex) => {
                if (!day) {
                  return (
                    <div
                      className="p-1"
                      // biome-ignore lint/suspicious/noArrayIndexKey: Empty cells for calendar grid padding are stable
                      key={`${monthName}-empty-${cellIndex}`}
                    />
                  );
                }

                const dateKey = day.toISOString().split("T")[0] ?? "";
                const hasEvents = eventDates.has(dateKey);
                const isToday = isSameDay(day, today);

                return (
                  <button
                    className={cn(
                      "relative rounded p-1 text-sm transition-colors hover:bg-accent",
                      isToday &&
                        "bg-primary text-primary-foreground hover:bg-primary/90",
                      hasEvents && !isToday && "font-semibold"
                    )}
                    key={day.toISOString()}
                    onClick={() => onDateClick?.(day)}
                    type="button"
                  >
                    {day.getDate()}
                    {hasEvents && (
                      <span
                        className={cn(
                          "absolute bottom-0.5 left-1/2 size-1 -translate-x-1/2 rounded-full",
                          isToday ? "bg-primary-foreground" : "bg-primary"
                        )}
                      />
                    )}
                  </button>
                );
              })}
            </div>
          </div>
        );
      })}
    </div>
  );
}
