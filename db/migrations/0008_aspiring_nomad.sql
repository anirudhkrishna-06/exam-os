CREATE TABLE "external_share_sessions" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"share_id" uuid NOT NULL,
	"session_hash" varchar(64) NOT NULL,
	"expires_at" timestamp NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "external_share_sessions_session_hash_unique" UNIQUE("session_hash")
);
--> statement-breakpoint
CREATE TABLE "external_shares" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"owner_user_id" uuid NOT NULL,
	"original_session_id" uuid NOT NULL,
	"shared_content_id" uuid NOT NULL,
	"token_hash" varchar(64) NOT NULL,
	"passcode_hash" text NOT NULL,
	"expires_at" timestamp,
	"revoked_at" timestamp,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "external_shares_token_hash_unique" UNIQUE("token_hash")
);
--> statement-breakpoint
ALTER TABLE "external_share_sessions" ADD CONSTRAINT "external_share_sessions_share_id_external_shares_id_fk" FOREIGN KEY ("share_id") REFERENCES "public"."external_shares"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "external_shares" ADD CONSTRAINT "external_shares_owner_user_id_users_id_fk" FOREIGN KEY ("owner_user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "external_shares" ADD CONSTRAINT "external_shares_original_session_id_study_sessions_id_fk" FOREIGN KEY ("original_session_id") REFERENCES "public"."study_sessions"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "external_shares" ADD CONSTRAINT "external_shares_shared_content_id_shared_content_id_fk" FOREIGN KEY ("shared_content_id") REFERENCES "public"."shared_content"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "external_share_sessions_share_idx" ON "external_share_sessions" USING btree ("share_id");--> statement-breakpoint
CREATE INDEX "external_share_sessions_expiry_idx" ON "external_share_sessions" USING btree ("expires_at");--> statement-breakpoint
CREATE INDEX "external_shares_owner_idx" ON "external_shares" USING btree ("owner_user_id");--> statement-breakpoint
CREATE INDEX "external_shares_session_idx" ON "external_shares" USING btree ("original_session_id");