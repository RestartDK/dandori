import { Check } from "lucide-react";

import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { cn } from "@/lib/utils";

const PRESET_COLORS = [
  { name: "Blue", value: "#3b82f6" },
  { name: "Green", value: "#22c55e" },
  { name: "Red", value: "#ef4444" },
  { name: "Yellow", value: "#eab308" },
  { name: "Purple", value: "#a855f7" },
  { name: "Pink", value: "#ec4899" },
  { name: "Orange", value: "#f97316" },
  { name: "Teal", value: "#14b8a6" },
] as const;

interface ColorPickerProps {
  value: string;
  onChange: (color: string) => void;
}

export function ColorPicker({ value, onChange }: ColorPickerProps) {
  return (
    <Popover>
      <PopoverTrigger className="inline-flex w-full items-center justify-start gap-2 rounded-md border bg-background px-3 py-2 text-sm ring-offset-background hover:bg-accent hover:text-accent-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2">
        <div
          className="size-4 rounded-full border"
          style={{ backgroundColor: value }}
        />
        <span>
          {PRESET_COLORS.find((c) => c.value === value)?.name ?? "Custom"}
        </span>
      </PopoverTrigger>
      <PopoverContent align="start" className="w-48 p-2">
        <div className="grid grid-cols-4 gap-2">
          {PRESET_COLORS.map((color) => (
            <button
              className={cn(
                "flex size-8 items-center justify-center rounded-full border-2 transition-all hover:scale-110",
                value === color.value
                  ? "border-foreground"
                  : "border-transparent"
              )}
              key={color.value}
              onClick={() => onChange(color.value)}
              style={{ backgroundColor: color.value }}
              title={color.name}
              type="button"
            >
              {value === color.value && <Check className="size-4 text-white" />}
            </button>
          ))}
        </div>
      </PopoverContent>
    </Popover>
  );
}
