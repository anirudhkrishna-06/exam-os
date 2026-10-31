CREATE TYPE "public"."unit_difficulty" AS ENUM('easy', 'medium', 'hard');--> statement-breakpoint
ALTER TYPE "public"."generation_type" ADD VALUE 'manual' BEFORE 'initial';--> statement-breakpoint
ALTER TABLE "units" ADD COLUMN "difficulty" "unit_difficulty" DEFAULT 'medium' NOT NULL;