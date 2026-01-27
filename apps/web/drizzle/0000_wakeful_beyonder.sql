CREATE TYPE "public"."action_status" AS ENUM('pending', 'approved', 'rejected', 'sent', 'failed');--> statement-breakpoint
CREATE TYPE "public"."cta" AS ENUM('book_call', 'reply', 'visit_site');--> statement-breakpoint
CREATE TYPE "public"."lead_source" AS ENUM('profile_viewer');--> statement-breakpoint
CREATE TYPE "public"."lead_status" AS ENUM('new', 'qualified', 'messaged', 'connected', 'replied', 'skipped');--> statement-breakpoint
CREATE TYPE "public"."tone" AS ENUM('professional', 'friendly', 'direct');--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "actions" (
	"id" text PRIMARY KEY NOT NULL,
	"user_id" text NOT NULL,
	"lead_id" text NOT NULL,
	"campaign_id" text NOT NULL,
	"type" text DEFAULT 'connection_request' NOT NULL,
	"message" text NOT NULL,
	"quality_score" integer,
	"used_signals" text,
	"generated_at" timestamp,
	"status" "action_status" DEFAULT 'pending' NOT NULL,
	"approved_at" timestamp,
	"rejected_at" timestamp,
	"sent_at" timestamp,
	"unipile_request_id" text,
	"error" text,
	"retry_count" integer DEFAULT 0,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "campaigns" (
	"id" text PRIMARY KEY NOT NULL,
	"user_id" text NOT NULL,
	"name" text NOT NULL,
	"tone" "tone" DEFAULT 'professional' NOT NULL,
	"cta" "cta" DEFAULT 'reply' NOT NULL,
	"calendar_link" text,
	"qualification_rules" text,
	"auto_approve" boolean DEFAULT false,
	"is_active" boolean DEFAULT true,
	"total_leads" integer DEFAULT 0,
	"total_sent" integer DEFAULT 0,
	"total_accepted" integer DEFAULT 0,
	"total_replied" integer DEFAULT 0,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "leads" (
	"id" text PRIMARY KEY NOT NULL,
	"user_id" text NOT NULL,
	"campaign_id" text,
	"linkedin_id" text NOT NULL,
	"profile_url" text NOT NULL,
	"first_name" text,
	"last_name" text,
	"full_name" text NOT NULL,
	"headline" text,
	"company" text,
	"location" text,
	"profile_image_url" text,
	"about" text,
	"recent_post" text,
	"mutual_connections" integer,
	"source" "lead_source" DEFAULT 'profile_viewer' NOT NULL,
	"status" "lead_status" DEFAULT 'new' NOT NULL,
	"viewed_at" timestamp,
	"enriched_at" timestamp,
	"connection_accepted_at" timestamp,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "processed_webhooks" (
	"event_id" text PRIMARY KEY NOT NULL,
	"event_type" text NOT NULL,
	"processed_at" timestamp DEFAULT now() NOT NULL,
	"payload" text
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "users" (
	"id" text PRIMARY KEY NOT NULL,
	"email" text NOT NULL,
	"name" text,
	"calendar_link" text,
	"unipile_account_id" text,
	"linkedin_profile_url" text,
	"linkedin_connected_at" timestamp,
	"daily_limit" integer DEFAULT 25,
	"timezone" text DEFAULT 'America/Los_Angeles',
	"last_sync_at" timestamp,
	"last_sync_error" text,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "users_unipile_account_id_unique" UNIQUE("unipile_account_id")
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "webhook_events" (
	"id" text PRIMARY KEY NOT NULL,
	"user_id" text,
	"unipile_account_id" text,
	"source" text NOT NULL,
	"event_type" text NOT NULL,
	"payload" text NOT NULL,
	"processed_at" timestamp,
	"error" text,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "actions" ADD CONSTRAINT "actions_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "actions" ADD CONSTRAINT "actions_lead_id_leads_id_fk" FOREIGN KEY ("lead_id") REFERENCES "public"."leads"("id") ON DELETE cascade ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "actions" ADD CONSTRAINT "actions_campaign_id_campaigns_id_fk" FOREIGN KEY ("campaign_id") REFERENCES "public"."campaigns"("id") ON DELETE cascade ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "campaigns" ADD CONSTRAINT "campaigns_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "leads" ADD CONSTRAINT "leads_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "leads" ADD CONSTRAINT "leads_campaign_id_campaigns_id_fk" FOREIGN KEY ("campaign_id") REFERENCES "public"."campaigns"("id") ON DELETE set null ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "webhook_events" ADD CONSTRAINT "webhook_events_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE set null ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "actions_user_id_idx" ON "actions" USING btree ("user_id");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "actions_status_idx" ON "actions" USING btree ("status");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "actions_lead_id_idx" ON "actions" USING btree ("lead_id");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "actions_sent_at_idx" ON "actions" USING btree ("sent_at");--> statement-breakpoint
CREATE UNIQUE INDEX IF NOT EXISTS "leads_user_linkedin_unique" ON "leads" USING btree ("user_id","linkedin_id");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "leads_user_id_idx" ON "leads" USING btree ("user_id");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "leads_status_idx" ON "leads" USING btree ("status");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "leads_campaign_id_idx" ON "leads" USING btree ("campaign_id");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "webhook_events_account_id_idx" ON "webhook_events" USING btree ("unipile_account_id");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "webhook_events_created_at_idx" ON "webhook_events" USING btree ("created_at");