import { useQueryClient } from "@tanstack/react-query";
import { Calendar, Check, Pencil, Trash2, X } from "lucide-react";
import { useState } from "react";

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { api } from "@/lib/api";
import { cn } from "@/lib/utils";

interface EventData {
  title: string;
  description?: string | null;
  startTime: string;
  endTime: string;
  isAllDay?: boolean;
  color?: string;
  eventId?: string;
  eventTitle?: string;
}

interface ProposalCardProps {
  type: "create" | "update" | "delete";
  eventData: EventData;
  originalEvent?: EventData & { id: string };
  status: "pending" | "approved" | "declined";
  onApprove: () => void;
  onDecline: () => void;
}

interface ChangedField {
  label: string;
  before: React.ReactNode;
  after: React.ReactNode;
}

const formatDateTime = (isoString: string): string => {
  const date = new Date(isoString);
  return date.toLocaleString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
    hour: "numeric",
    minute: "2-digit",
    hour12: true,
  });
};

const formatTimeOnly = (isoString: string): string => {
  const date = new Date(isoString);
  return date.toLocaleTimeString("en-US", {
    hour: "numeric",
    minute: "2-digit",
    hour12: true,
  });
};

const formatDateShort = (isoString: string): string => {
  const date = new Date(isoString);
  return date.toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
  });
};

const isSameDay = (date1: string, date2: string): boolean => {
  const d1 = new Date(date1);
  const d2 = new Date(date2);
  return (
    d1.getFullYear() === d2.getFullYear() &&
    d1.getMonth() === d2.getMonth() &&
    d1.getDate() === d2.getDate()
  );
};

const getChangedFields = (
  original: EventData,
  updated: EventData
): ChangedField[] => {
  const changes: ChangedField[] = [];

  // Check title
  if (updated.title && original.title !== updated.title) {
    changes.push({
      label: "Title",
      before: original.title,
      after: updated.title,
    });
  }

  // Check time - compare dates and times (only if updated values exist)
  const hasUpdatedStart = updated.startTime && updated.startTime.length > 0;
  const hasUpdatedEnd = updated.endTime && updated.endTime.length > 0;
  const startChanged =
    hasUpdatedStart && original.startTime !== updated.startTime;
  const endChanged = hasUpdatedEnd && original.endTime !== updated.endTime;

  if (startChanged || endChanged) {
    // Use original values for any times not being updated
    const effectiveUpdatedStart = hasUpdatedStart
      ? updated.startTime
      : original.startTime;
    const effectiveUpdatedEnd = hasUpdatedEnd
      ? updated.endTime
      : original.endTime;
    const originalSameDay = isSameDay(original.startTime, original.endTime);
    const updatedSameDay = isSameDay(
      effectiveUpdatedStart,
      effectiveUpdatedEnd
    );

    if (originalSameDay && updatedSameDay) {
      // Both are same-day events, show compact time format
      const originalDateChanged = !isSameDay(
        original.startTime,
        effectiveUpdatedStart
      );

      changes.push({
        label: "Time",
        before: (
          <span>
            {originalDateChanged && (
              <span className="mr-1">
                {formatDateShort(original.startTime)}
              </span>
            )}
            {formatTimeOnly(original.startTime)} -{" "}
            {formatTimeOnly(original.endTime)}
          </span>
        ),
        after: (
          <span>
            {originalDateChanged && (
              <span className="mr-1">
                {formatDateShort(effectiveUpdatedStart)}
              </span>
            )}
            {formatTimeOnly(effectiveUpdatedStart)} -{" "}
            {formatTimeOnly(effectiveUpdatedEnd)}
          </span>
        ),
      });
    } else {
      // Multi-day or complex time change, show full format
      changes.push({
        label: "Time",
        before: (
          <span>
            {formatDateTime(original.startTime)} -{" "}
            {formatDateTime(original.endTime)}
          </span>
        ),
        after: (
          <span>
            {formatDateTime(effectiveUpdatedStart)} -{" "}
            {formatDateTime(effectiveUpdatedEnd)}
          </span>
        ),
      });
    }
  }

  // Check color
  if (updated.color && original.color !== updated.color) {
    changes.push({
      label: "Color",
      before: (
        <div
          className="size-4 rounded-full border border-border"
          style={{ backgroundColor: original.color ?? "#888" }}
        />
      ),
      after: (
        <div
          className="size-4 rounded-full border border-border"
          style={{ backgroundColor: updated.color }}
        />
      ),
    });
  }

  // Check description
  if (
    updated.description !== undefined &&
    original.description !== updated.description
  ) {
    changes.push({
      label: "Description",
      before: original.description ?? "(none)",
      after: updated.description ?? "(none)",
    });
  }

  // Check all-day status
  if (
    updated.isAllDay !== undefined &&
    original.isAllDay !== updated.isAllDay
  ) {
    changes.push({
      label: "All Day",
      before: original.isAllDay ? "Yes" : "No",
      after: updated.isAllDay ? "Yes" : "No",
    });
  }

  return changes;
};

export function ProposalCard({
  type,
  eventData,
  originalEvent,
  status,
  onApprove,
  onDecline,
}: ProposalCardProps) {
  const [isExecuting, setIsExecuting] = useState(false);
  const queryClient = useQueryClient();

  const handleApprove = async () => {
    setIsExecuting(true);
    try {
      let toolName: string;
      let args: Record<string, unknown>;

      switch (type) {
        case "create":
          toolName = "createEvent";
          args = {
            title: eventData.title,
            description: eventData.description,
            startTime: eventData.startTime,
            endTime: eventData.endTime,
            isAllDay: eventData.isAllDay,
            color: eventData.color,
          };
          break;
        case "update":
          toolName = "updateEvent";
          // Only include fields that have actual values to avoid overwriting with empty strings
          args = {
            eventId: eventData.eventId,
            ...(eventData.title && { title: eventData.title }),
            ...(eventData.description !== undefined && {
              description: eventData.description,
            }),
            ...(eventData.startTime && { startTime: eventData.startTime }),
            ...(eventData.endTime && { endTime: eventData.endTime }),
            ...(eventData.isAllDay !== undefined && {
              isAllDay: eventData.isAllDay,
            }),
            ...(eventData.color && { color: eventData.color }),
          };
          break;
        case "delete":
          toolName = "deleteEvent";
          args = {
            eventId: eventData.eventId,
          };
          break;
        default:
          throw new Error(`Unknown proposal type: ${type}`);
      }

      const { error } = await api.api.chat.execute.post({
        toolName,
        args,
      });

      if (error) {
        throw error;
      }

      // Invalidate events query to refresh calendar
      await queryClient.invalidateQueries({ queryKey: ["events"] });
      onApprove();
    } catch (err) {
      console.error("Failed to execute tool:", err);
    } finally {
      setIsExecuting(false);
    }
  };

  const icon = {
    create: <Calendar className="size-4" />,
    update: <Pencil className="size-4" />,
    delete: <Trash2 className="size-4" />,
  }[type];

  const title = {
    create: "Create Event",
    update: "Update Event",
    delete: "Delete Event",
  }[type];

  const statusBadge = {
    pending: null,
    approved: (
      <span className="flex items-center gap-1 text-emerald-600 text-xs dark:text-emerald-400">
        <Check className="size-3" />
        Approved
      </span>
    ),
    declined: (
      <span className="flex items-center gap-1 text-muted-foreground text-xs">
        <X className="size-3" />
        Declined
      </span>
    ),
  }[status];

  return (
    <Card
      className={cn(
        "my-2 w-full transition-colors",
        status === "approved" && "ring-emerald-500/30",
        status === "declined" && "opacity-60"
      )}
      size="sm"
    >
      <CardHeader className="flex flex-row items-center justify-between gap-2">
        <div className="flex items-center gap-2">
          <div
            className={cn(
              "flex size-6 items-center justify-center rounded-md",
              type === "create" &&
                "bg-blue-500/10 text-blue-600 dark:text-blue-400",
              type === "update" &&
                "bg-amber-500/10 text-amber-600 dark:text-amber-400",
              type === "delete" &&
                "bg-red-500/10 text-red-600 dark:text-red-400"
            )}
          >
            {icon}
          </div>
          <CardTitle className="text-sm">{title}</CardTitle>
        </div>
        {statusBadge}
      </CardHeader>

      <CardContent className="space-y-2">
        <div className="space-y-1">
          <p className="font-medium">
            {type === "delete" ? eventData.eventTitle : eventData.title}
          </p>
          {type !== "delete" && eventData.startTime && eventData.endTime && (
            <p className="text-muted-foreground text-xs">
              {formatDateTime(eventData.startTime)} -{" "}
              {formatTimeOnly(eventData.endTime)}
            </p>
          )}
          {type === "delete" && (
            <p className="mt-2 flex items-center gap-1 text-destructive text-xs">
              ⚠️ This action cannot be undone
            </p>
          )}
        </div>

        {type === "update" &&
          originalEvent &&
          (() => {
            const changes = getChangedFields(originalEvent, eventData);
            if (changes.length === 0) return null;

            return (
              <div className="space-y-2 rounded-md bg-muted/50 p-3">
                <p className="flex items-center gap-1.5 font-medium text-muted-foreground text-xs">
                  <Pencil className="size-3" />
                  What's changing
                </p>
                <div className="space-y-2">
                  {changes.map((change) => (
                    <div className="space-y-0.5" key={change.label}>
                      <p className="font-medium text-[10px] text-muted-foreground uppercase tracking-wide">
                        {change.label}
                      </p>
                      <div className="flex flex-wrap items-center gap-x-2 gap-y-1 text-xs">
                        <span className="text-muted-foreground line-through decoration-muted-foreground/50">
                          {change.before}
                        </span>
                        <span className="text-muted-foreground">→</span>
                        <span className="font-medium text-foreground">
                          {change.after}
                        </span>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            );
          })()}

        {eventData.color && type === "create" && (
          <div className="flex items-center gap-2 text-muted-foreground text-xs">
            <div
              className="size-3 rounded-full"
              style={{ backgroundColor: eventData.color }}
            />
            Color
          </div>
        )}

        {status === "pending" && (
          <div className="flex gap-2 pt-2">
            <Button
              className="flex-1"
              disabled={isExecuting}
              onClick={handleApprove}
              size="sm"
            >
              {isExecuting ? "Processing..." : "Accept"}
            </Button>
            <Button
              className="flex-1"
              disabled={isExecuting}
              onClick={onDecline}
              size="sm"
              variant="outline"
            >
              Decline
            </Button>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
