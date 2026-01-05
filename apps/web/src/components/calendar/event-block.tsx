import { useCallback, useRef, useState } from "react";
import type { CalendarEvent } from "@/hooks/use-events";
import { cn } from "@/lib/utils";

interface EventBlockProps {
  event: CalendarEvent;
  style?: React.CSSProperties;
  onClick?: (event: CalendarEvent) => void;
  onDragEnd?: (eventId: string, newStart: Date, newEnd: Date) => void;
  onResizeEnd?: (eventId: string, newStart: Date, newEnd: Date) => void;
  slotHeight: number;
  startHour?: number;
  columnDate?: Date;
  className?: string;
}

export function EventBlock({
  event,
  style,
  onClick,
  onDragEnd,
  onResizeEnd,
  slotHeight,
  startHour = 0,
  columnDate,
  className,
}: EventBlockProps) {
  const blockRef = useRef<HTMLButtonElement>(null);
  const [isDragging, setIsDragging] = useState(false);
  const [isResizing, setIsResizing] = useState(false);
  const wasDragging = useRef(false);
  const wasResizing = useRef(false);
  const dragStartY = useRef(0);
  const originalTop = useRef(0);
  const originalHeight = useRef(0);

  const handleDragStart = useCallback(
    (e: React.DragEvent) => {
      if (isResizing) {
        e.preventDefault();
        return;
      }

      setIsDragging(true);
      dragStartY.current = e.clientY;
      originalTop.current = blockRef.current?.offsetTop ?? 0;

      e.dataTransfer.setData("text/plain", event.id);
      e.dataTransfer.effectAllowed = "move";

      const dragImage = document.createElement("div");
      dragImage.style.opacity = "0";
      document.body.appendChild(dragImage);
      e.dataTransfer.setDragImage(dragImage, 0, 0);
      setTimeout(() => document.body.removeChild(dragImage), 0);
    },
    [event.id, isResizing]
  );

  const handleDragEnd = useCallback(
    (e: React.DragEvent) => {
      setIsDragging(false);
      wasDragging.current = true;
      setTimeout(() => {
        wasDragging.current = false;
      }, 0);

      if (!(onDragEnd && blockRef.current)) {
        return;
      }

      const deltaY = e.clientY - dragStartY.current;
      const deltaHours = Math.round(deltaY / slotHeight);

      if (deltaHours === 0) {
        return;
      }

      const eventStart = new Date(event.startTime);
      const eventEnd = new Date(event.endTime);

      const newStart = new Date(eventStart);
      const newEnd = new Date(eventEnd);

      newStart.setHours(newStart.getHours() + deltaHours);
      newEnd.setHours(newEnd.getHours() + deltaHours);

      onDragEnd(event.id, newStart, newEnd);
    },
    [event, onDragEnd, slotHeight]
  );

  const handleResizeStart = useCallback(
    (e: React.PointerEvent, direction: "top" | "bottom") => {
      e.stopPropagation();
      e.preventDefault();
      setIsResizing(true);

      const target = e.currentTarget as HTMLElement;
      target.setPointerCapture(e.pointerId);

      dragStartY.current = e.clientY;
      originalTop.current = blockRef.current?.offsetTop ?? 0;
      originalHeight.current = blockRef.current?.offsetHeight ?? 0;

      const handlePointerMove = (moveEvent: PointerEvent) => {
        if (!blockRef.current) {
          return;
        }

        const deltaY = moveEvent.clientY - dragStartY.current;

        if (direction === "bottom") {
          const newHeight = Math.max(
            slotHeight / 2,
            originalHeight.current + deltaY
          );
          blockRef.current.style.height = `${newHeight}px`;
        } else {
          const newTop = originalTop.current + deltaY;
          const newHeight = originalHeight.current - deltaY;

          if (newHeight >= slotHeight / 2) {
            blockRef.current.style.top = `${newTop}px`;
            blockRef.current.style.height = `${newHeight}px`;
          }
        }
      };

      const handlePointerUp = (upEvent: PointerEvent) => {
        setIsResizing(false);
        wasResizing.current = true;
        setTimeout(() => {
          wasResizing.current = false;
        }, 0);
        target.releasePointerCapture(upEvent.pointerId);
        target.removeEventListener("pointermove", handlePointerMove);
        target.removeEventListener("pointerup", handlePointerUp);

        if (!(onResizeEnd && blockRef.current)) {
          return;
        }

        const currentTop = blockRef.current.offsetTop;
        const currentHeight = blockRef.current.offsetHeight;

        const baseDate = columnDate ?? new Date(event.startTime);
        baseDate.setHours(startHour, 0, 0, 0);

        const newStartHours = startHour + currentTop / slotHeight;
        const durationHours = currentHeight / slotHeight;

        const newStart = new Date(baseDate);
        newStart.setHours(
          Math.floor(newStartHours),
          (newStartHours % 1) * 60,
          0,
          0
        );

        const newEnd = new Date(newStart);
        newEnd.setHours(
          newStart.getHours() + Math.floor(durationHours),
          newStart.getMinutes() + (durationHours % 1) * 60,
          0,
          0
        );

        onResizeEnd(event.id, newStart, newEnd);
      };

      target.addEventListener("pointermove", handlePointerMove);
      target.addEventListener("pointerup", handlePointerUp);
    },
    [event, onResizeEnd, slotHeight, startHour, columnDate]
  );

  const textColor = getContrastColor(event.color);

  return (
    <button
      className={cn(
        "absolute right-1 left-1 flex cursor-pointer flex-col items-start overflow-hidden rounded-md px-2 py-1 text-left text-xs transition-shadow hover:shadow-md",
        isDragging && "opacity-50",
        className
      )}
      draggable={!isResizing}
      onClick={(e) => {
        e.stopPropagation();
        if (wasDragging.current || wasResizing.current) {
          return;
        }
        onClick?.(event);
      }}
      onDragEnd={handleDragEnd}
      onDragStart={handleDragStart}
      ref={blockRef}
      style={{
        backgroundColor: event.color,
        color: textColor,
        ...style,
      }}
      type="button"
    >
      <div
        className="absolute inset-x-0 top-0 h-2 cursor-ns-resize"
        onPointerDown={(e) => handleResizeStart(e, "top")}
      />

      <div className="pointer-events-none">
        <div className="truncate font-medium">{event.title}</div>
        {!event.isAllDay && (
          <div className="opacity-80">
            {new Date(event.startTime).toLocaleTimeString("en-US", {
              hour: "numeric",
              minute: "2-digit",
            })}
          </div>
        )}
      </div>

      <div
        className="absolute inset-x-0 bottom-0 h-2 cursor-ns-resize"
        onPointerDown={(e) => handleResizeStart(e, "bottom")}
      />
    </button>
  );
}

function getContrastColor(hexColor: string): string {
  const r = Number.parseInt(hexColor.slice(1, 3), 16);
  const g = Number.parseInt(hexColor.slice(3, 5), 16);
  const b = Number.parseInt(hexColor.slice(5, 7), 16);

  const luminance = (0.299 * r + 0.587 * g + 0.114 * b) / 255;

  return luminance > 0.5 ? "#000000" : "#ffffff";
}
