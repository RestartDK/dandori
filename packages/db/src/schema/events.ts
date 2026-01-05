import { relations } from "drizzle-orm";
import {
  boolean,
  index,
  pgTable,
  text,
  timestamp,
  uniqueIndex,
} from "drizzle-orm/pg-core";

import { user } from "./auth";

export const event = pgTable(
  "event",
  {
    id: text("id")
      .primaryKey()
      .$defaultFn(() => crypto.randomUUID()),
    userId: text("user_id")
      .notNull()
      .references(() => user.id, { onDelete: "cascade" }),
    title: text("title").notNull(),
    description: text("description"),
    startTime: timestamp("start_time").notNull(),
    endTime: timestamp("end_time").notNull(),
    isAllDay: boolean("is_all_day").default(false).notNull(),
    color: text("color").default("#3b82f6").notNull(),
    googleEventId: text("google_event_id"),
    googleCalendarId: text("google_calendar_id"),
    createdAt: timestamp("created_at").defaultNow().notNull(),
    updatedAt: timestamp("updated_at")
      .defaultNow()
      .$onUpdate(() => new Date())
      .notNull(),
  },
  (table) => [
    index("event_userId_idx").on(table.userId),
    index("event_startTime_idx").on(table.startTime),
    uniqueIndex("event_user_google_event_idx").on(
      table.userId,
      table.googleEventId
    ),
  ]
);

export const eventRelations = relations(event, ({ one }) => ({
  user: one(user, {
    fields: [event.userId],
    references: [user.id],
  }),
}));
