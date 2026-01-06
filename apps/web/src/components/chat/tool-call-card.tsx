import {
  Calendar,
  Check,
  ChevronDown,
  Clock,
  Loader2,
  Search,
  User,
  X,
} from "lucide-react";
import { useState } from "react";

import { Card, CardContent } from "@/components/ui/card";
import { cn } from "@/lib/utils";

type ToolStatus = "pending" | "in_progress" | "complete" | "error";

interface ToolCallCardProps {
  toolName: string;
  args: Record<string, unknown>;
  result?: unknown;
  status: ToolStatus;
  error?: string;
}

const toolConfig: Record<
  string,
  { icon: React.ReactElement; label: string; color: string }
> = {
  readEvents: {
    icon: <Calendar className="size-3.5" />,
    label: "Reading Events",
    color: "text-blue-600 dark:text-blue-400",
  },
  queryCalendar: {
    icon: <Search className="size-3.5" />,
    label: "Analyzing Calendar",
    color: "text-purple-600 dark:text-purple-400",
  },
  getUserInfo: {
    icon: <User className="size-3.5" />,
    label: "Getting User Info",
    color: "text-emerald-600 dark:text-emerald-400",
  },
  createEvent: {
    icon: <Calendar className="size-3.5" />,
    label: "Create Event",
    color: "text-blue-600 dark:text-blue-400",
  },
  updateEvent: {
    icon: <Calendar className="size-3.5" />,
    label: "Update Event",
    color: "text-amber-600 dark:text-amber-400",
  },
  deleteEvent: {
    icon: <Calendar className="size-3.5" />,
    label: "Delete Event",
    color: "text-red-600 dark:text-red-400",
  },
};

const statusConfig: Record<
  ToolStatus,
  { icon: React.ReactNode; label: string }
> = {
  pending: {
    icon: <Clock className="size-3 text-muted-foreground" />,
    label: "Pending",
  },
  in_progress: {
    icon: <Loader2 className="size-3 animate-spin text-blue-500" />,
    label: "Running",
  },
  complete: {
    icon: <Check className="size-3 text-emerald-500" />,
    label: "Complete",
  },
  error: {
    icon: <X className="size-3 text-destructive" />,
    label: "Failed",
  },
};

const formatResult = (result: unknown, toolName: string): string => {
  if (!result) {
    return "";
  }

  if (toolName === "readEvents" && Array.isArray(result)) {
    if (result.length === 0) {
      return "No events found";
    }
    return `Found ${result.length} event${result.length === 1 ? "" : "s"}`;
  }

  if (toolName === "queryCalendar" && typeof result === "object") {
    const r = result as { queryType?: string; results?: unknown };
    if (r.queryType === "free_time" && Array.isArray(r.results)) {
      return `Found ${r.results.length} free slot${r.results.length === 1 ? "" : "s"}`;
    }
    if (r.queryType === "events_on_day" && Array.isArray(r.results)) {
      return `${r.results.length} event${r.results.length === 1 ? "" : "s"} scheduled`;
    }
    if (
      typeof r.results === "object" &&
      r.results !== null &&
      "message" in r.results
    ) {
      return (r.results as { message: string }).message;
    }
  }

  if (toolName === "getUserInfo" && typeof result === "object") {
    const r = result as { name?: string };
    return r.name ? `User: ${r.name}` : "User info retrieved";
  }

  return "Completed";
};

export function ToolCallCard({
  toolName,
  args,
  result,
  status,
  error,
}: ToolCallCardProps) {
  const [isExpanded, setIsExpanded] = useState(false);
  const config = toolConfig[toolName] ?? {
    icon: <Calendar className="size-3.5" />,
    label: toolName,
    color: "text-muted-foreground",
  };
  const statusInfo = statusConfig[status];

  const summary = formatResult(result, toolName);

  return (
    <Card className="my-1.5 w-full bg-muted/30" size="sm">
      <CardContent className="py-2">
        <button
          className="flex w-full items-center justify-between gap-2 text-left"
          onClick={() => setIsExpanded(!isExpanded)}
          type="button"
        >
          <div className="flex items-center gap-2">
            <div className={cn("flex items-center gap-1.5", config.color)}>
              {config.icon}
              <span className="font-medium text-xs">
                {status === "in_progress" ? `${config.label}...` : config.label}
              </span>
            </div>
            {statusInfo.icon}
          </div>
          <ChevronDown
            className={cn(
              "size-3.5 text-muted-foreground transition-transform",
              isExpanded && "rotate-180"
            )}
          />
        </button>

        {summary && status === "complete" && (
          <p className="mt-1 text-muted-foreground text-xs">{summary}</p>
        )}

        {error && status === "error" && (
          <p className="mt-1 text-destructive text-xs">{error}</p>
        )}

        {isExpanded && (
          <div className="mt-2 space-y-2 border-t pt-2 text-xs">
            <div>
              <p className="font-medium text-muted-foreground">Arguments:</p>
              <pre className="mt-1 overflow-x-auto rounded bg-muted/50 p-1.5 text-[10px]">
                {JSON.stringify(args, null, 2)}
              </pre>
            </div>
            {result !== undefined && result !== null && (
              <div>
                <p className="font-medium text-muted-foreground">Result:</p>
                <pre className="mt-1 max-h-32 overflow-auto rounded bg-muted/50 p-1.5 text-[10px]">
                  {JSON.stringify(result, null, 2)}
                </pre>
              </div>
            )}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
