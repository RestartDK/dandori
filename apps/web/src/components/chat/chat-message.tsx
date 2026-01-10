import { useQueryClient } from "@tanstack/react-query";
import type { UIMessage } from "ai";
import { Bot, User } from "lucide-react";
import { useState } from "react";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";

import type { CalendarEvent } from "@/hooks/use-events";
import { cn } from "@/lib/utils";

import { ProposalCard } from "./proposal-card";
import { ToolCallCard } from "./tool-call-card";

interface ChatMessageProps {
  message: UIMessage;
}

// Tools that require approval (don't have execute functions)
const APPROVAL_TOOLS = new Set(["createEvent", "updateEvent", "deleteEvent"]);

// Helper to find an event in React Query cache by ID
const findEventInCache = (
  queryClient: ReturnType<typeof useQueryClient>,
  eventId: string
): CalendarEvent | undefined => {
  // Get all cached event queries
  const eventQueries = queryClient.getQueriesData<CalendarEvent[]>({
    queryKey: ["events"],
  });

  // Search through all cached event arrays
  for (const [, events] of eventQueries) {
    if (events) {
      const found = events.find((e) => e.id === eventId);
      if (found) return found;
    }
  }
  return undefined;
};

export function ChatMessage({ message }: ChatMessageProps) {
  const queryClient = useQueryClient();
  const [toolStatuses, setToolStatuses] = useState<
    Record<string, "pending" | "approved" | "declined">
  >({});

  const isUser = message.role === "user";

  const handleApprove = (toolCallId: string) => {
    setToolStatuses((prev) => ({ ...prev, [toolCallId]: "approved" }));
  };

  const handleDecline = (toolCallId: string) => {
    setToolStatuses((prev) => ({ ...prev, [toolCallId]: "declined" }));
  };

  return (
    <div
      className={cn(
        "flex gap-3 py-3",
        isUser ? "flex-row-reverse" : "flex-row"
      )}
    >
      <div
        className={cn(
          "flex size-7 shrink-0 items-center justify-center rounded-full",
          isUser
            ? "bg-primary text-primary-foreground"
            : "bg-muted text-muted-foreground"
        )}
      >
        {isUser ? <User className="size-4" /> : <Bot className="size-4" />}
      </div>

      <div
        className={cn(
          "flex max-w-[85%] flex-col gap-1",
          isUser ? "items-end" : "items-start"
        )}
      >
        {message.parts.map((part, index) => {
          const key = `${message.id}-${index}`;

          // Text part
          if (part.type === "text") {
            if (!part.text.trim()) {
              return null;
            }
            return (
              <div
                className={cn(
                  "rounded-lg px-3 py-2 text-sm",
                  isUser
                    ? "bg-primary text-primary-foreground"
                    : "prose prose-sm dark:prose-invert prose-headings:my-2 prose-li:my-0.5 prose-ol:my-1 prose-p:my-1 prose-pre:my-2 prose-ul:my-1 max-w-none prose-code:rounded bg-muted prose-code:bg-background/50 prose-code:px-1 prose-code:py-0.5 text-foreground prose-code:before:content-none prose-code:after:content-none"
                )}
                key={key}
              >
                {isUser ? (
                  <p className="whitespace-pre-wrap">{part.text}</p>
                ) : (
                  <ReactMarkdown remarkPlugins={[remarkGfm]}>
                    {part.text}
                  </ReactMarkdown>
                )}
              </div>
            );
          }

          // Tool call parts - check if the part is a tool type
          if (part.type.startsWith("tool-")) {
            const toolPart = part as {
              type: string;
              toolCallId: string;
              toolName?: string;
              state: string;
              input?: unknown;
              output?: unknown;
            };
            const { toolCallId, state } = toolPart;
            const toolName =
              toolPart.toolName ?? part.type.replace("tool-", "");
            const args = (toolPart.input ?? {}) as Record<string, unknown>;

            // Tools that require approval
            if (APPROVAL_TOOLS.has(toolName)) {
              const status = toolStatuses[toolCallId] ?? "pending";
              const eventData = args as {
                title?: string;
                description?: string | null;
                startTime?: string;
                endTime?: string;
                isAllDay?: boolean;
                color?: string;
                eventId?: string;
                eventTitle?: string;
              };

              // Map tool name to proposal type
              const typeMap: Record<string, "create" | "update" | "delete"> = {
                createEvent: "create",
                updateEvent: "update",
                deleteEvent: "delete",
              };
              const proposalType = typeMap[toolName] ?? "create";

              // For updates, find the original event from cache
              const originalEvent =
                proposalType === "update" && eventData.eventId
                  ? findEventInCache(queryClient, eventData.eventId)
                  : undefined;

              return (
                <ProposalCard
                  eventData={{
                    title: eventData.title ?? "",
                    description: eventData.description,
                    startTime: eventData.startTime ?? "",
                    endTime: eventData.endTime ?? "",
                    isAllDay: eventData.isAllDay,
                    color: eventData.color,
                    eventId: eventData.eventId,
                    eventTitle: eventData.eventTitle,
                  }}
                  key={key}
                  onApprove={() => handleApprove(toolCallId)}
                  onDecline={() => handleDecline(toolCallId)}
                  originalEvent={
                    originalEvent
                      ? {
                          id: originalEvent.id,
                          title: originalEvent.title,
                          description: originalEvent.description,
                          startTime:
                            originalEvent.startTime instanceof Date
                              ? originalEvent.startTime.toISOString()
                              : originalEvent.startTime,
                          endTime:
                            originalEvent.endTime instanceof Date
                              ? originalEvent.endTime.toISOString()
                              : originalEvent.endTime,
                          isAllDay: originalEvent.isAllDay,
                          color: originalEvent.color,
                        }
                      : undefined
                  }
                  status={status}
                  type={proposalType}
                />
              );
            }

            // Tools with execute (show progress/results)
            const getToolStatus = ():
              | "complete"
              | "in_progress"
              | "pending" => {
              if (state === "result" || state === "output-available") {
                return "complete";
              }
              if (state === "call" || state === "input-streaming") {
                return "in_progress";
              }
              return "pending";
            };
            const toolStatus = getToolStatus();

            const result = toolPart.output;

            return (
              <ToolCallCard
                args={args}
                key={key}
                result={result}
                status={toolStatus}
                toolName={toolName}
              />
            );
          }

          return null;
        })}
      </div>
    </div>
  );
}
