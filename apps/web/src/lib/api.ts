import { env } from "@dandori-ai/env/client";
import { treaty } from "@elysiajs/eden";
import type { App } from "@server/index";

export const api = treaty<App>(env.VITE_SERVER_URL, {
  fetch: {
    credentials: "include",
  },
});
