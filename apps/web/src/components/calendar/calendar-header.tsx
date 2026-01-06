import { ChevronLeft, ChevronRight, PanelLeft, Plus } from "lucide-react";

import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

import type { CalendarView } from "./calendar";

interface CalendarHeaderProps {
  currentView: CalendarView;
  currentDate: Date;
  isChatOpen: boolean;
  onViewChange: (view: CalendarView) => void;
  onNavigate: (direction: "prev" | "next" | "today") => void;
  onAddEvent: () => void;
  onToggleChat: () => void;
}

function formatDateRange(view: CalendarView, date: Date): string {
  const options: Intl.DateTimeFormatOptions = {};

  switch (view) {
    case "day":
      return date.toLocaleDateString("en-US", {
        weekday: "long",
        month: "long",
        day: "numeric",
        year: "numeric",
      });
    case "week": {
      const start = new Date(date);
      const dayOfWeek = start.getDay();
      start.setDate(start.getDate() - dayOfWeek);
      const end = new Date(start);
      end.setDate(end.getDate() + 6);

      if (start.getMonth() === end.getMonth()) {
        return `${start.toLocaleDateString("en-US", { month: "long" })} ${start.getDate()} - ${end.getDate()}, ${start.getFullYear()}`;
      }
      if (start.getFullYear() === end.getFullYear()) {
        return `${start.toLocaleDateString("en-US", { month: "short" })} ${start.getDate()} - ${end.toLocaleDateString("en-US", { month: "short" })} ${end.getDate()}, ${start.getFullYear()}`;
      }
      return `${start.toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" })} - ${end.toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" })}`;
    }
    case "month":
      return date.toLocaleDateString("en-US", {
        month: "long",
        year: "numeric",
      });
    case "year":
      return date.getFullYear().toString();
    default:
      return date.toLocaleDateString("en-US", options);
  }
}

export function CalendarHeader({
  currentView,
  currentDate,
  isChatOpen,
  onViewChange,
  onNavigate,
  onAddEvent,
  onToggleChat,
}: CalendarHeaderProps) {
  return (
    <div className="flex items-center justify-between border-b px-4 py-3">
      <div className="flex items-center gap-4">
        <Button onClick={() => onNavigate("today")} size="sm" variant="outline">
          Today
        </Button>

        <div className="flex items-center gap-1">
          <Button
            onClick={() => onNavigate("prev")}
            size="icon"
            variant="ghost"
          >
            <ChevronLeft className="size-4" />
          </Button>
          <Button
            onClick={() => onNavigate("next")}
            size="icon"
            variant="ghost"
          >
            <ChevronRight className="size-4" />
          </Button>
        </div>

        <h2 className="font-semibold text-lg">
          {formatDateRange(currentView, currentDate)}
        </h2>
      </div>

      <div className="flex items-center gap-3">
        <Select
          onValueChange={(value) => onViewChange(value as CalendarView)}
          value={currentView}
        >
          <SelectTrigger className="w-28">
            <SelectValue>
              {currentView.charAt(0).toUpperCase() + currentView.slice(1)}
            </SelectValue>
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="day">Day</SelectItem>
            <SelectItem value="week">Week</SelectItem>
            <SelectItem value="month">Month</SelectItem>
            <SelectItem value="year">Year</SelectItem>
          </SelectContent>
        </Select>

        <Button onClick={onAddEvent} size="sm">
          <Plus className="mr-1 size-4" />
          Add Event
        </Button>

        <Button
          aria-label={isChatOpen ? "Close chat panel" : "Open chat panel"}
          onClick={onToggleChat}
          size="icon"
          variant="ghost"
        >
          <PanelLeft className={isChatOpen ? "-scale-x-100" : ""} />
        </Button>
      </div>
    </div>
  );
}
