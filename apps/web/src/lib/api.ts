import { treaty } from "@elysiajs/eden";
import type { App } from "@server/index";

export const api = treaty<App>(import.meta.env.VITE_SERVER_URL || "", {
  fetch: {
    credentials: "include",
  },
});
