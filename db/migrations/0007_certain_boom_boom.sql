CREATE TYPE "public"."share_status" AS ENUM('pending', 'imported', 'declined', 'revoked', 'expired');--> statement-breakpoint
CREATE TABLE "session_shares" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"sender_user_id" uuid NOT NULL,
	"recipient_user_id" uuid NOT NULL,
	"shared_content_id" uuid NOT NULL,
	"original_session_id" uuid,
	"status" "share_status" DEFAULT 'pending' NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"expires_at" timestamp NOT NULL,
	"responded_at" timestamp,
	"revoked_at" timestamp,
	CONSTRAINT "session_shares_active_unique" UNIQUE("sender_user_id","recipient_user_id","shared_content_id","status")
);
--> statement-breakpoint
CREATE TABLE "shared_content" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"content_hash" varchar(64) NOT NULL,
	"content" jsonb NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "shared_content_content_hash_unique" UNIQUE("content_hash")
);
--> statement-breakpoint
CREATE TABLE "unit_content_imports" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"share_id" uuid NOT NULL,
	"user_id" uuid NOT NULL,
	"subject_id" uuid NOT NULL,
	"unit_id" uuid NOT NULL,
	"shared_content_id" uuid NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "unit_content_imports_share_id_unique" UNIQUE("share_id")
);
--> statement-breakpoint
ALTER TABLE "session_shares" ADD CONSTRAINT "session_shares_sender_user_id_users_id_fk" FOREIGN KEY ("sender_user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "session_shares" ADD CONSTRAINT "session_shares_recipient_user_id_users_id_fk" FOREIGN KEY ("recipient_user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "session_shares" ADD CONSTRAINT "session_shares_shared_content_id_shared_content_id_fk" FOREIGN KEY ("shared_content_id") REFERENCES "public"."shared_content"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "session_shares" ADD CONSTRAINT "session_shares_original_session_id_study_sessions_id_fk" FOREIGN KEY ("original_session_id") REFERENCES "public"."study_sessions"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "unit_content_imports" ADD CONSTRAINT "unit_content_imports_share_id_session_shares_id_fk" FOREIGN KEY ("share_id") REFERENCES "public"."session_shares"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "unit_content_imports" ADD CONSTRAINT "unit_content_imports_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "unit_content_imports" ADD CONSTRAINT "unit_content_imports_subject_id_subjects_id_fk" FOREIGN KEY ("subject_id") REFERENCES "public"."subjects"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "unit_content_imports" ADD CONSTRAINT "unit_content_imports_unit_id_units_id_fk" FOREIGN KEY ("unit_id") REFERENCES "public"."units"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "unit_content_imports" ADD CONSTRAINT "unit_content_imports_shared_content_id_shared_content_id_fk" FOREIGN KEY ("shared_content_id") REFERENCES "public"."shared_content"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "session_shares_recipient_status_idx" ON "session_shares" USING btree ("recipient_user_id","status");--> statement-breakpoint
CREATE INDEX "session_shares_sender_status_idx" ON "session_shares" USING btree ("sender_user_id","status");--> statement-breakpoint
CREATE INDEX "unit_content_imports_user_unit_idx" ON "unit_content_imports" USING btree ("user_id","unit_id");--> statement-breakpoint
CREATE INDEX "unit_content_imports_snapshot_idx" ON "unit_content_imports" USING btree ("shared_content_id");