import { auth } from "@dandori-ai/auth";
import { env } from "@dandori-ai/env";
import { cors } from "@elysiajs/cors";
import { Elysia, t } from "elysia";

import { calendars } from "./modules/calendars";
import { chat } from "./modules/chat";
import { events } from "./modules/events";

const app = new Elysia()
  .use(
    cors({
      origin: env.CORS_ORIGIN,
      methods: ["GET", "POST", "PATCH", "DELETE", "OPTIONS"],
      allowedHeaders: ["Content-Type", "Authorization"],
      credentials: true,
    })
  )
  .mount(auth.handler)
  .get("/", () => ({ status: "ok", timestamp: Date.now() }), {
    response: t.Object({
      status: t.String(),
      timestamp: t.Number(),
    }),
  })
  .use(calendars)
  .use(events)
  .use(chat)
  .listen(env.PORT, () => {
    console.log(`Server is running on http://localhost:${env.PORT}`);
  });

export type App = typeof app;
