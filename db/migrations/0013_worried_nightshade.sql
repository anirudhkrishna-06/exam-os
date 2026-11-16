CREATE TABLE "equation_groups" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" uuid NOT NULL,
	"title" varchar(255) DEFAULT 'Related equations' NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "equation_bookmarks" ADD COLUMN "group_id" uuid;--> statement-breakpoint
ALTER TABLE "equation_groups" ADD CONSTRAINT "equation_groups_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "equation_bookmarks" ADD CONSTRAINT "equation_bookmarks_group_id_equation_groups_id_fk" FOREIGN KEY ("group_id") REFERENCES "public"."equation_groups"("id") ON DELETE set null ON UPDATE no action;