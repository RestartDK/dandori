import { useCallback, useEffect, useMemo, useState } from "react";

import type { CalendarEvent, CreateEventInput } from "@/hooks/use-events";
import { useEvents } from "@/hooks/use-events";

import { CalendarHeader } from "./calendar-header";
import { EventDialog } from "./event-dialog";
import { DayView } from "./views/day-view";
import { MonthView } from "./views/month-view";
import { WeekView } from "./views/week-view";
import { YearView } from "./views/year-view";

export type CalendarView = "day" | "week" | "month" | "year";

function getViewRange(
  view: CalendarView,
  date: Date
): { start: Date; end: Date } {
  const start = new Date(date);
  const end = new Date(date);

  switch (view) {
    case "day":
      start.setHours(0, 0, 0, 0);
      end.setHours(23, 59, 59, 999);
      break;
    case "week": {
      const dayOfWeek = start.getDay();
      start.setDate(start.getDate() - dayOfWeek);
      start.setHours(0, 0, 0, 0);
      end.setDate(start.getDate() + 6);
      end.setHours(23, 59, 59, 999);
      break;
    }
    case "month":
      start.setDate(1);
      start.setHours(0, 0, 0, 0);
      end.setMonth(end.getMonth() + 1);
      end.setDate(0);
      end.setHours(23, 59, 59, 999);
      break;
    case "year":
      start.setMonth(0, 1);
      start.setHours(0, 0, 0, 0);
      end.setMonth(11, 31);
      end.setHours(23, 59, 59, 999);
      break;
    default:
      start.setHours(0, 0, 0, 0);
      end.setHours(23, 59, 59, 999);
  }

  return { start, end };
}

const CALENDAR_VIEW_KEY = "calendar-view";

export function Calendar() {
  const [currentView, setCurrentView] = useState<CalendarView>(() => {
    const saved = localStorage.getItem(CALENDAR_VIEW_KEY);
    if (
      saved === "day" ||
      saved === "week" ||
      saved === "month" ||
      saved === "year"
    ) {
      return saved;
    }
    return "week";
  });
  const [currentDate, setCurrentDate] = useState(new Date());

  useEffect(() => {
    localStorage.setItem(CALENDAR_VIEW_KEY, currentView);
  }, [currentView]);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [selectedEvent, setSelectedEvent] = useState<CalendarEvent | null>(
    null
  );
  const [defaultEventStart, setDefaultEventStart] = useState<
    Date | undefined
  >();
  const [defaultEventEnd, setDefaultEventEnd] = useState<Date | undefined>();

  const { start: viewStart, end: viewEnd } = useMemo(
    () => getViewRange(currentView, currentDate),
    [currentView, currentDate]
  );

  const {
    events,
    isLoading,
    createEvent,
    updateEvent,
    deleteEvent,
    isCreating,
    isUpdating,
    isDeleting,
  } = useEvents(viewStart, viewEnd);

  const handleNavigate = useCallback(
    (direction: "prev" | "next" | "today") => {
      setCurrentDate((prev) => {
        if (direction === "today") {
          return new Date();
        }

        const newDate = new Date(prev);
        const delta = direction === "prev" ? -1 : 1;

        switch (currentView) {
          case "day":
            newDate.setDate(newDate.getDate() + delta);
            break;
          case "week":
            newDate.setDate(newDate.getDate() + delta * 7);
            break;
          case "month":
            newDate.setMonth(newDate.getMonth() + delta);
            break;
          case "year":
            newDate.setFullYear(newDate.getFullYear() + delta);
            break;
          default:
            newDate.setDate(newDate.getDate() + delta * 7);
        }

        return newDate;
      });
    },
    [currentView]
  );

  const handleAddEvent = useCallback((start?: Date, end?: Date) => {
    setSelectedEvent(null);
    setDefaultEventStart(start);
    setDefaultEventEnd(end);
    setDialogOpen(true);
  }, []);

  const handleEventClick = useCallback((event: CalendarEvent) => {
    setSelectedEvent(event);
    setDefaultEventStart(undefined);
    setDefaultEventEnd(undefined);
    setDialogOpen(true);
  }, []);

  const handleEventDrop = useCallback(
    async (eventId: string, newStart: Date, newEnd: Date) => {
      await updateEvent({
        id: eventId,
        startTime: newStart,
        endTime: newEnd,
      });
    },
    [updateEvent]
  );

  const handleEventResize = useCallback(
    async (eventId: string, newStart: Date, newEnd: Date) => {
      await updateEvent({
        id: eventId,
        startTime: newStart,
        endTime: newEnd,
      });
    },
    [updateEvent]
  );

  const handleSave = useCallback(
    async (data: CreateEventInput) => {
      if (selectedEvent) {
        await updateEvent({ id: selectedEvent.id, ...data });
      } else {
        await createEvent(data);
      }
    },
    [selectedEvent, createEvent, updateEvent]
  );

  const handleDelete = useCallback(
    async (id: string) => {
      await deleteEvent(id);
    },
    [deleteEvent]
  );

  const handleDateClick = useCallback((date: Date) => {
    setCurrentDate(date);
    setCurrentView("day");
  }, []);

  const viewProps = {
    currentDate,
    events,
    onEventClick: handleEventClick,
    onEventDrop: handleEventDrop,
    onEventResize: handleEventResize,
    onSlotClick: handleAddEvent,
    onDateClick: handleDateClick,
  };

  return (
    <div className="flex h-full flex-col">
      <CalendarHeader
        currentDate={currentDate}
        currentView={currentView}
        onAddEvent={() => handleAddEvent()}
        onNavigate={handleNavigate}
        onViewChange={setCurrentView}
      />

      <div className="relative flex-1 overflow-hidden">
        {isLoading ? (
          <div className="flex h-full items-center justify-center">
            <div className="text-muted-foreground">Loading events...</div>
          </div>
        ) : (
          <>
            {currentView === "day" && <DayView {...viewProps} />}
            {currentView === "week" && <WeekView {...viewProps} />}
            {currentView === "month" && <MonthView {...viewProps} />}
            {currentView === "year" && <YearView {...viewProps} />}
          </>
        )}
      </div>

      <EventDialog
        defaultEnd={defaultEventEnd}
        defaultStart={defaultEventStart}
        event={selectedEvent}
        isDeleting={isDeleting}
        isSaving={isCreating || isUpdating}
        onDelete={handleDelete}
        onOpenChange={setDialogOpen}
        onSave={handleSave}
        open={dialogOpen}
      />
    </div>
  );
}
