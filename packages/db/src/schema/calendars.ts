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

export const calendar = pgTable(
  "calendar",
  {
    id: text("id")
      .primaryKey()
      .$defaultFn(() => crypto.randomUUID()),
    userId: text("user_id")
      .notNull()
      .references(() => user.id, { onDelete: "cascade" }),
    googleCalendarId: text("google_calendar_id").notNull(),
    name: text("name").notNull(),
    color: text("color").default("#3b82f6").notNull(),
    isVisible: boolean("is_visible").default(true).notNull(),
    isPrimary: boolean("is_primary").default(false).notNull(),
    createdAt: timestamp("created_at").defaultNow().notNull(),
    updatedAt: timestamp("updated_at")
      .defaultNow()
      .$onUpdate(() => new Date())
      .notNull(),
  },
  (table) => [
    index("calendar_userId_idx").on(table.userId),
    uniqueIndex("calendar_user_google_calendar_idx").on(
      table.userId,
      table.googleCalendarId
    ),
  ]
);

export const calendarRelations = relations(calendar, ({ one }) => ({
  user: one(user, {
    fields: [calendar.userId],
    references: [user.id],
  }),
}));
