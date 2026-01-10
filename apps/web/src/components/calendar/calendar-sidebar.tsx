import { Calendar } from "lucide-react";

import { Checkbox } from "@/components/ui/checkbox";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Skeleton } from "@/components/ui/skeleton";
import { useCalendars } from "@/hooks/use-calendars";

interface CalendarSidebarProps {
  isOpen: boolean;
}

export function CalendarSidebar({ isOpen }: CalendarSidebarProps) {
  const { calendars, isLoading, toggleCalendar, isToggling } = useCalendars();

  if (!isOpen) {
    return null;
  }

  return (
    <aside className="w-64 shrink-0 border-r bg-muted/30">
      <div className="flex items-center gap-2 border-b px-4 py-3">
        <Calendar className="size-4 text-muted-foreground" />
        <h2 className="font-medium text-sm">My Calendars</h2>
      </div>

      <ScrollArea className="h-[calc(100%-49px)]">
        <div className="p-3">
          {isLoading ? (
            <div className="space-y-2">
              {[1, 2, 3].map((i) => (
                <div className="flex items-center gap-3" key={i}>
                  <Skeleton className="size-4 rounded" />
                  <Skeleton className="h-4 w-32" />
                </div>
              ))}
            </div>
          ) : calendars.length === 0 ? (
            <p className="text-muted-foreground text-sm">
              No calendars found. Connect your Google account to see your
              calendars.
            </p>
          ) : (
            <div className="space-y-1">
              {calendars.map((calendar) => (
                <label
                  className="flex cursor-pointer items-center gap-3 rounded-md px-2 py-1.5 transition-colors hover:bg-muted"
                  key={calendar.id}
                >
                  <Checkbox
                    checked={calendar.isVisible}
                    className="data-checked:border-[var(--custom-bg)] data-checked:bg-[var(--custom-bg)]"
                    disabled={isToggling}
                    onCheckedChange={() =>
                      toggleCalendar(calendar.id, calendar.isVisible)
                    }
                    style={
                      {
                        "--tw-border-opacity": 1,
                        borderColor: calendar.color,
                        "--custom-bg": calendar.color,
                      } as React.CSSProperties
                    }
                  />
                  <span
                    className="size-2 shrink-0 rounded-full"
                    style={{ backgroundColor: calendar.color }}
                  />
                  <span className="truncate text-sm">{calendar.name}</span>
                  {calendar.isPrimary && (
                    <span className="ml-auto rounded bg-muted px-1.5 py-0.5 text-muted-foreground text-xs">
                      Primary
                    </span>
                  )}
                </label>
              ))}
            </div>
          )}
        </div>
      </ScrollArea>
    </aside>
  );
}
