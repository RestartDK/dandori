import { createFileRoute, redirect } from "@tanstack/react-router";
import { useState } from "react";

import { Calendar } from "@/components/calendar/calendar";
import { CalendarSidebar } from "@/components/calendar/calendar-sidebar";
import { ChatPanel } from "@/components/chat/chat-panel";
import { PendingChangesProvider } from "@/context/pending-changes-context";
import { authClient } from "@/lib/auth-client";

export const Route = createFileRoute("/")({
  beforeLoad: async () => {
    const session = await authClient.getSession();
    if (!session.data) {
      throw redirect({ to: "/login" });
    }
  },
  component: DashboardComponent,
});

function DashboardComponent() {
  const [isChatOpen, setIsChatOpen] = useState(true);
  const [isSidebarOpen, setIsSidebarOpen] = useState(true);

  return (
    <PendingChangesProvider>
      <div className="flex h-[calc(100vh-49px)]">
        <CalendarSidebar isOpen={isSidebarOpen} />
        <div className="flex-1 overflow-hidden">
          <Calendar
            isChatOpen={isChatOpen}
            isSidebarOpen={isSidebarOpen}
            onToggleChat={() => setIsChatOpen((prev) => !prev)}
            onToggleSidebar={() => setIsSidebarOpen((prev) => !prev)}
          />
        </div>
        {isChatOpen && <ChatPanel />}
      </div>
    </PendingChangesProvider>
  );
}
