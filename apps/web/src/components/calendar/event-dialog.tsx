import { useEffect, useState } from "react";

import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import type { CalendarEvent, CreateEventInput } from "@/hooks/use-events";

import { ColorPicker } from "./color-picker";

interface EventDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  event?: CalendarEvent | null;
  defaultStart?: Date;
  defaultEnd?: Date;
  onSave: (data: CreateEventInput) => Promise<void>;
  onDelete?: (id: string) => Promise<void>;
  isSaving?: boolean;
  isDeleting?: boolean;
}

function formatDateTimeLocal(date: Date): string {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  const hours = String(date.getHours()).padStart(2, "0");
  const minutes = String(date.getMinutes()).padStart(2, "0");
  return `${year}-${month}-${day}T${hours}:${minutes}`;
}

function formatDateLocal(date: Date): string {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

export function EventDialog({
  open,
  onOpenChange,
  event,
  defaultStart,
  defaultEnd,
  onSave,
  onDelete,
  isSaving,
  isDeleting,
}: EventDialogProps) {
  const isEditing = !!event;

  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [startTime, setStartTime] = useState("");
  const [endTime, setEndTime] = useState("");
  const [isAllDay, setIsAllDay] = useState(false);
  const [color, setColor] = useState("#3b82f6");

  useEffect(() => {
    if (open) {
      if (event) {
        setTitle(event.title);
        setDescription(event.description ?? "");
        setIsAllDay(event.isAllDay);
        setColor(event.color);
        const start = new Date(event.startTime);
        const end = new Date(event.endTime);
        if (event.isAllDay) {
          setStartTime(formatDateLocal(start));
          setEndTime(formatDateLocal(end));
        } else {
          setStartTime(formatDateTimeLocal(start));
          setEndTime(formatDateTimeLocal(end));
        }
      } else {
        setTitle("");
        setDescription("");
        setIsAllDay(false);
        setColor("#3b82f6");
        const start = defaultStart ?? new Date();
        const end = defaultEnd ?? new Date(start.getTime() + 60 * 60 * 1000);
        setStartTime(formatDateTimeLocal(start));
        setEndTime(formatDateTimeLocal(end));
      }
    }
  }, [open, event, defaultStart, defaultEnd]);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();

    const startDate = new Date(startTime);
    const endDate = new Date(endTime);

    if (isAllDay) {
      startDate.setHours(0, 0, 0, 0);
      endDate.setHours(23, 59, 59, 999);
    }

    await onSave({
      title,
      description: description || null,
      startTime: startDate.toISOString(),
      endTime: endDate.toISOString(),
      isAllDay,
      color,
    });

    onOpenChange(false);
  }

  async function handleDelete() {
    if (event && onDelete) {
      await onDelete(event.id);
      onOpenChange(false);
    }
  }

  return (
    <Dialog onOpenChange={onOpenChange} open={open}>
      <DialogContent className="sm:max-w-[425px]">
        <DialogHeader>
          <DialogTitle>{isEditing ? "Edit Event" : "Create Event"}</DialogTitle>
        </DialogHeader>
        <form className="space-y-4" onSubmit={handleSubmit}>
          <div className="space-y-2">
            <Label htmlFor="title">Title</Label>
            <Input
              id="title"
              onChange={(e) => setTitle(e.target.value)}
              placeholder="Event title"
              required
              value={title}
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="description">Description</Label>
            <Textarea
              id="description"
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Event description (optional)"
              rows={3}
              value={description}
            />
          </div>

          <div className="flex items-center gap-2">
            <Checkbox
              checked={isAllDay}
              id="allDay"
              onCheckedChange={(checked) => {
                setIsAllDay(checked === true);
                if (checked) {
                  setStartTime(formatDateLocal(new Date(startTime)));
                  setEndTime(formatDateLocal(new Date(endTime)));
                } else {
                  const start = new Date(startTime);
                  const end = new Date(endTime);
                  start.setHours(9, 0, 0, 0);
                  end.setHours(10, 0, 0, 0);
                  setStartTime(formatDateTimeLocal(start));
                  setEndTime(formatDateTimeLocal(end));
                }
              }}
            />
            <Label htmlFor="allDay">All day</Label>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="startTime">Start</Label>
              <Input
                id="startTime"
                onChange={(e) => setStartTime(e.target.value)}
                required
                type={isAllDay ? "date" : "datetime-local"}
                value={startTime}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="endTime">End</Label>
              <Input
                id="endTime"
                onChange={(e) => setEndTime(e.target.value)}
                required
                type={isAllDay ? "date" : "datetime-local"}
                value={endTime}
              />
            </div>
          </div>

          <div className="space-y-2">
            <Label>Color</Label>
            <ColorPicker onChange={setColor} value={color} />
          </div>

          <DialogFooter className="gap-2">
            {isEditing && onDelete && (
              <Button
                disabled={isDeleting}
                onClick={handleDelete}
                type="button"
                variant="destructive"
              >
                {isDeleting ? "Deleting..." : "Delete"}
              </Button>
            )}
            <Button disabled={isSaving} type="submit">
              {isSaving && "Saving..."}
              {!isSaving && isEditing && "Save Changes"}
              {!(isSaving || isEditing) && "Create"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
