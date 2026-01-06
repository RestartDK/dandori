CREATE TABLE "event" (
	"id" text PRIMARY KEY NOT NULL,
	"user_id" text NOT NULL,
	"title" text NOT NULL,
	"description" text,
	"start_time" timestamp NOT NULL,
	"end_time" timestamp NOT NULL,
	"is_all_day" boolean DEFAULT false NOT NULL,
	"color" text DEFAULT '#3b82f6' NOT NULL,
	"google_event_id" text,
	"google_calendar_id" text,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "event" ADD CONSTRAINT "event_user_id_user_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."user"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "event_userId_idx" ON "event" USING btree ("user_id");--> statement-breakpoint
CREATE INDEX "event_startTime_idx" ON "event" USING btree ("start_time");--> statement-breakpoint
CREATE UNIQUE INDEX "event_user_google_event_idx" ON "event" USING btree ("user_id","google_event_id");