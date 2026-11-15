CREATE TYPE "public"."media_asset_status" AS ENUM('pending', 'uploaded', 'ready', 'failed');--> statement-breakpoint
CREATE TABLE "media_assets" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"owner_id" uuid NOT NULL,
	"provider" varchar(32) DEFAULT 'backblaze-b2' NOT NULL,
	"object_key" text NOT NULL,
	"original_filename" varchar(255) NOT NULL,
	"mime_type" varchar(128) NOT NULL,
	"file_size" bigint NOT NULL,
	"width" integer,
	"height" integer,
	"status" "media_asset_status" DEFAULT 'pending' NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "media_assets_object_key_unique" UNIQUE("object_key")
);
--> statement-breakpoint
CREATE TABLE "media_note_refs" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"asset_id" uuid NOT NULL,
	"session_note_id" uuid,
	"unit_note_id" uuid,
	"position" integer DEFAULT 0 NOT NULL,
	"caption" varchar(500),
	"alt_text" varchar(500),
	"alignment" varchar(16) DEFAULT 'left' NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "media_note_refs_asset_session_unique" UNIQUE("asset_id","session_note_id"),
	CONSTRAINT "media_note_refs_asset_unit_unique" UNIQUE("asset_id","unit_note_id")
);
--> statement-breakpoint
CREATE TABLE "media_snapshot_refs" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"asset_id" uuid NOT NULL,
	"shared_content_id" uuid NOT NULL,
	CONSTRAINT "media_snapshot_refs_asset_snapshot_unique" UNIQUE("asset_id","shared_content_id")
);
--> statement-breakpoint
ALTER TABLE "media_assets" ADD CONSTRAINT "media_assets_owner_id_users_id_fk" FOREIGN KEY ("owner_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "media_note_refs" ADD CONSTRAINT "media_note_refs_asset_id_media_assets_id_fk" FOREIGN KEY ("asset_id") REFERENCES "public"."media_assets"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "media_note_refs" ADD CONSTRAINT "media_note_refs_session_note_id_session_notes_id_fk" FOREIGN KEY ("session_note_id") REFERENCES "public"."session_notes"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "media_note_refs" ADD CONSTRAINT "media_note_refs_unit_note_id_unit_notes_id_fk" FOREIGN KEY ("unit_note_id") REFERENCES "public"."unit_notes"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "media_snapshot_refs" ADD CONSTRAINT "media_snapshot_refs_asset_id_media_assets_id_fk" FOREIGN KEY ("asset_id") REFERENCES "public"."media_assets"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "media_snapshot_refs" ADD CONSTRAINT "media_snapshot_refs_shared_content_id_shared_content_id_fk" FOREIGN KEY ("shared_content_id") REFERENCES "public"."shared_content"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "media_assets_owner_status_idx" ON "media_assets" USING btree ("owner_id","status");--> statement-breakpoint
CREATE INDEX "media_note_refs_session_idx" ON "media_note_refs" USING btree ("session_note_id");--> statement-breakpoint
CREATE INDEX "media_note_refs_unit_idx" ON "media_note_refs" USING btree ("unit_note_id");