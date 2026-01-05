import { createFileRoute, redirect } from "@tanstack/react-router";

import { Calendar } from "@/components/calendar/calendar";
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
    <div className="h-[calc(100vh-49px)]">
      <Calendar />
    </div>
  );
}
