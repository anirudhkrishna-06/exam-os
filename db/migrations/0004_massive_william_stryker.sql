CREATE TABLE "revision_dismissals" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" uuid NOT NULL,
	"activity_id" uuid NOT NULL,
	"suggested_date" date NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "revision_dismissals_user_activity_date_unique" UNIQUE("user_id","activity_id","suggested_date")
);
--> statement-breakpoint
ALTER TABLE "revision_dismissals" ADD CONSTRAINT "revision_dismissals_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "revision_dismissals" ADD CONSTRAINT "revision_dismissals_activity_id_unit_activities_id_fk" FOREIGN KEY ("activity_id") REFERENCES "public"."unit_activities"("id") ON DELETE cascade ON UPDATE no action;