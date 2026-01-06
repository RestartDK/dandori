import { createFileRoute, redirect } from "@tanstack/react-router";

import { Calendar } from "@/components/calendar/calendar";
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
  return (
    <PendingChangesProvider>
      <div className="flex h-[calc(100vh-49px)]">
        <div className="flex-1 overflow-hidden">
          <Calendar />
        </div>
        <ChatPanel />
      </div>
    </PendingChangesProvider>
  );
}
