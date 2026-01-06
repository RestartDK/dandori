import { useChat } from "@ai-sdk/react";
import { env } from "@dandori-ai/env/client";
import { DefaultChatTransport } from "ai";
import { Send, Sparkles } from "lucide-react";
import { type KeyboardEvent, useEffect, useRef, useState } from "react";

import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Textarea } from "@/components/ui/textarea";
import { cn } from "@/lib/utils";

import { ChatMessage } from "./chat-message";

const SUGGESTIONS = [
  "What's on my calendar today?",
  "Schedule a meeting tomorrow at 2pm",
  "When am I free this week?",
  "Find time for a 1-hour focus block",
];

export function ChatPanel() {
  const [input, setInput] = useState("");
  const scrollRef = useRef<HTMLDivElement>(null);

  // Get user's timezone for the AI to understand local time context
  const userTimezone = Intl.DateTimeFormat().resolvedOptions().timeZone;

  const { messages, sendMessage, status } = useChat({
    transport: new DefaultChatTransport({
      api: `${env.VITE_SERVER_URL}/api/chat`,
      credentials: "include",
      body: {
        timezone: userTimezone,
      },
    }),
  });

  // Auto-scroll to bottom when new messages arrive
  useEffect(() => {
    if (scrollRef.current) {
      const viewport = scrollRef.current.querySelector(
        '[data-slot="scroll-area-viewport"]'
      );
      if (viewport) {
        viewport.scrollTop = viewport.scrollHeight;
      }
    }
  }, []);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (input.trim() && status === "ready") {
      sendMessage({ text: input });
      setInput("");
    }
  };

  const handleKeyDown = (e: KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      if (input.trim() && status === "ready") {
        sendMessage({ text: input });
        setInput("");
      }
    }
  };

  const handleSuggestionClick = (suggestion: string) => {
    sendMessage({ text: suggestion });
  };

  const isLoading = status === "streaming" || status === "submitted";

  return (
    <div className="flex h-full w-96 flex-col border-l bg-card">
      {/* Header */}
      <div className="flex items-center gap-2 border-b px-4 py-3">
        <Sparkles className="size-4 text-primary" />
        <h2 className="font-medium text-sm">AI Assistant</h2>
      </div>

      {/* Messages */}
      <div className="flex-1 overflow-hidden" ref={scrollRef}>
        <ScrollArea className="h-full px-4">
          {messages.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-8">
              <div className="mb-4 flex size-12 items-center justify-center rounded-full bg-primary/10">
                <Sparkles className="size-6 text-primary" />
              </div>
              <h3 className="mb-2 font-medium">
                Hi! I'm your calendar assistant
              </h3>
              <p className="mb-6 text-center text-muted-foreground text-sm">
                I can help you schedule events, find free time, and manage your
                calendar.
              </p>
              <div className="w-full space-y-2">
                <p className="font-medium text-muted-foreground text-xs">
                  Try asking:
                </p>
                {SUGGESTIONS.map((suggestion) => (
                  <button
                    className="w-full rounded-lg border bg-muted/30 px-3 py-2 text-left text-sm transition-colors hover:bg-muted/50"
                    key={suggestion}
                    onClick={() => handleSuggestionClick(suggestion)}
                    type="button"
                  >
                    {suggestion}
                  </button>
                ))}
              </div>
            </div>
          ) : (
            <div className="py-4">
              {messages.map((message) => (
                <ChatMessage key={message.id} message={message} />
              ))}
              {isLoading && messages.at(-1)?.role === "user" && (
                <div className="flex gap-3 py-3">
                  <div className="flex size-7 shrink-0 items-center justify-center rounded-full bg-muted text-muted-foreground">
                    <Sparkles className="size-4 animate-pulse" />
                  </div>
                  <div className="flex items-center gap-1.5 rounded-lg bg-muted px-3 py-2">
                    <div className="size-1.5 animate-bounce rounded-full bg-muted-foreground/50" />
                    <div className="size-1.5 animate-bounce rounded-full bg-muted-foreground/50 [animation-delay:150ms]" />
                    <div className="size-1.5 animate-bounce rounded-full bg-muted-foreground/50 [animation-delay:300ms]" />
                  </div>
                </div>
              )}
            </div>
          )}
        </ScrollArea>
      </div>

      {/* Input */}
      <div className="border-t p-4">
        <form className="flex gap-2" onSubmit={handleSubmit}>
          <Textarea
            className={cn(
              "max-h-32 min-h-10 resize-none py-2.5",
              isLoading && "opacity-50"
            )}
            disabled={isLoading}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder="Type a message..."
            rows={1}
            value={input}
          />
          <Button
            className="shrink-0"
            disabled={!input.trim() || isLoading}
            size="icon"
            type="submit"
          >
            <Send className="size-4" />
          </Button>
        </form>
      </div>
    </div>
  );
}
