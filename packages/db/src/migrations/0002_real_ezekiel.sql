CREATE TABLE "calendar" (
	"id" text PRIMARY KEY NOT NULL,
	"user_id" text NOT NULL,
	"google_calendar_id" text NOT NULL,
	"name" text NOT NULL,
	"color" text DEFAULT '#3b82f6' NOT NULL,
	"is_visible" boolean DEFAULT true NOT NULL,
	"is_primary" boolean DEFAULT false NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "calendar" ADD CONSTRAINT "calendar_user_id_user_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."user"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "calendar_userId_idx" ON "calendar" USING btree ("user_id");--> statement-breakpoint
CREATE UNIQUE INDEX "calendar_user_google_calendar_idx" ON "calendar" USING btree ("user_id","google_calendar_id");