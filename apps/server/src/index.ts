import { auth } from "@dandori-ai/auth";
import { cors } from "@elysiajs/cors";
import { Elysia, t } from "elysia";

const app = new Elysia()
  .use(
    cors({
      origin: process.env.CORS_ORIGIN || "",
      methods: ["GET", "POST", "OPTIONS"],
      allowedHeaders: ["Content-Type", "Authorization"],
      credentials: true,
    })
  )
  .all("/api/auth/*", async (context) => {
    const { request, status } = context;
    if (["POST", "GET"].includes(request.method)) {
      return auth.handler(request);
    }
    return status(405);
  })
  .get("/", () => ({ status: "ok", timestamp: Date.now() }), {
    response: t.Object({
      status: t.String(),
      timestamp: t.Number(),
    }),
  })
  .listen(process.env.PORT || 3000, () => {
    console.log("Server is running on http://localhost:3000");
  });

export type App = typeof app;
