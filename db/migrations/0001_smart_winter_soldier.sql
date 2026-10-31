CREATE TYPE "public"."generation_type" AS ENUM('initial', 'manual_regeneration', 'automatic_reschedule');--> statement-breakpoint
CREATE TYPE "public"."session_action" AS ENUM('created', 'rescheduled', 'completed', 'skipped', 'edited');--> statement-breakpoint
CREATE TYPE "public"."session_status" AS ENUM('scheduled', 'in_progress', 'completed', 'skipped', 'overdue');--> statement-breakpoint
CREATE TABLE "daily_capacity" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"season_id" uuid NOT NULL,
	"user_id" uuid NOT NULL,
	"date" date NOT NULL,
	"session_count" integer NOT NULL,
	"is_rest_day" boolean DEFAULT false NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "daily_capacity_user_season_date_unique" UNIQUE("user_id","season_id","date")
);
--> statement-breakpoint
CREATE TABLE "daily_slot_overrides" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"season_id" uuid NOT NULL,
	"user_id" uuid NOT NULL,
	"date" date NOT NULL,
	"template_id" uuid,
	"slot_name" varchar(100) NOT NULL,
	"start_time" time NOT NULL,
	"end_time" time NOT NULL,
	"is_available" boolean DEFAULT true NOT NULL,
	"position" integer NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "plan_versions" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"season_id" uuid NOT NULL,
	"user_id" uuid NOT NULL,
	"version_number" integer NOT NULL,
	"generation_type" "generation_type" NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "session_history" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"study_session_id" uuid NOT NULL,
	"user_id" uuid NOT NULL,
	"previous_date" date,
	"new_date" date,
	"previous_status" varchar(50),
	"new_status" varchar(50),
	"action" "session_action" NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "study_sessions" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"season_id" uuid NOT NULL,
	"user_id" uuid NOT NULL,
	"activity_id" uuid NOT NULL,
	"plan_version_id" uuid NOT NULL,
	"scheduled_date" date NOT NULL,
	"slot_name" varchar(100) NOT NULL,
	"start_time" time NOT NULL,
	"end_time" time NOT NULL,
	"position" integer DEFAULT 0 NOT NULL,
	"status" "session_status" DEFAULT 'scheduled' NOT NULL,
	"estimated_duration_minutes" integer NOT NULL,
	"actual_duration_minutes" integer,
	"completion_note" text,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL,
	"completed_at" timestamp
);
--> statement-breakpoint
ALTER TABLE "daily_capacity" ADD CONSTRAINT "daily_capacity_season_id_exam_seasons_id_fk" FOREIGN KEY ("season_id") REFERENCES "public"."exam_seasons"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "daily_capacity" ADD CONSTRAINT "daily_capacity_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "daily_slot_overrides" ADD CONSTRAINT "daily_slot_overrides_season_id_exam_seasons_id_fk" FOREIGN KEY ("season_id") REFERENCES "public"."exam_seasons"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "daily_slot_overrides" ADD CONSTRAINT "daily_slot_overrides_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "daily_slot_overrides" ADD CONSTRAINT "daily_slot_overrides_template_id_daily_session_templates_id_fk" FOREIGN KEY ("template_id") REFERENCES "public"."daily_session_templates"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "plan_versions" ADD CONSTRAINT "plan_versions_season_id_exam_seasons_id_fk" FOREIGN KEY ("season_id") REFERENCES "public"."exam_seasons"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "plan_versions" ADD CONSTRAINT "plan_versions_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "session_history" ADD CONSTRAINT "session_history_study_session_id_study_sessions_id_fk" FOREIGN KEY ("study_session_id") REFERENCES "public"."study_sessions"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "session_history" ADD CONSTRAINT "session_history_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "study_sessions" ADD CONSTRAINT "study_sessions_season_id_exam_seasons_id_fk" FOREIGN KEY ("season_id") REFERENCES "public"."exam_seasons"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "study_sessions" ADD CONSTRAINT "study_sessions_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "study_sessions" ADD CONSTRAINT "study_sessions_activity_id_unit_activities_id_fk" FOREIGN KEY ("activity_id") REFERENCES "public"."unit_activities"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "study_sessions" ADD CONSTRAINT "study_sessions_plan_version_id_plan_versions_id_fk" FOREIGN KEY ("plan_version_id") REFERENCES "public"."plan_versions"("id") ON DELETE cascade ON UPDATE no action;