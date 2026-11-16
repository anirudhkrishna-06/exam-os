CREATE TABLE "equation_bookmarks" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"session_id" uuid NOT NULL,
	"user_id" uuid NOT NULL,
	"expression" text NOT NULL,
	"label" varchar(255) NOT NULL,
	"occurrence" integer DEFAULT 0 NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "equation_variables" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"equation_id" uuid NOT NULL,
	"user_id" uuid NOT NULL,
	"symbol" varchar(100) NOT NULL,
	"explanation" text NOT NULL,
	"notation" varchar(20) DEFAULT 'plain' NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "equation_bookmarks" ADD CONSTRAINT "equation_bookmarks_session_id_study_sessions_id_fk" FOREIGN KEY ("session_id") REFERENCES "public"."study_sessions"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "equation_bookmarks" ADD CONSTRAINT "equation_bookmarks_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "equation_variables" ADD CONSTRAINT "equation_variables_equation_id_equation_bookmarks_id_fk" FOREIGN KEY ("equation_id") REFERENCES "public"."equation_bookmarks"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "equation_variables" ADD CONSTRAINT "equation_variables_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;