CREATE TABLE "customers" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"organization_id" uuid NOT NULL,
	"customer_id" text NOT NULL,
	"name" text,
	"email" text,
	"phone" text,
	"country" text,
	"region" text,
	"city" text,
	"avatar_url" text,
	"metadata" jsonb,
	"first_source" text,
	"first_medium" text,
	"first_campaign" text,
	"first_content" text,
	"first_landing_page" text,
	"first_referrer" text,
	"first_device" text,
	"first_seen_at" timestamp DEFAULT now() NOT NULL,
	"last_seen_at" timestamp DEFAULT now() NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "dead_letter_events" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"organization_id" uuid NOT NULL,
	"event_type" text NOT NULL,
	"payload" jsonb NOT NULL,
	"error_message" text NOT NULL,
	"attempts" integer DEFAULT 0 NOT NULL,
	"first_failed_at" timestamp DEFAULT now() NOT NULL,
	"last_failed_at" timestamp DEFAULT now() NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "email_logs" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" uuid NOT NULL,
	"organization_id" uuid NOT NULL,
	"email_id" text NOT NULL,
	"segment" text NOT NULL,
	"sent_at" timestamp DEFAULT now() NOT NULL,
	"opened_at" timestamp,
	"clicked_at" timestamp,
	"metadata" jsonb
);
--> statement-breakpoint
CREATE TABLE "notifications" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"organization_id" uuid NOT NULL,
	"type" text NOT NULL,
	"title" text NOT NULL,
	"body" text,
	"link_url" text,
	"metadata" jsonb,
	"is_read" boolean DEFAULT false NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "marketing_spends" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"organization_id" uuid NOT NULL,
	"source" text NOT NULL,
	"source_label" text NOT NULL,
	"amount_in_cents" integer NOT NULL,
	"spent_at" date NOT NULL,
	"description" text,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "events" ADD COLUMN "raw_source" text;--> statement-breakpoint
ALTER TABLE "events" ADD COLUMN "raw_medium" text;--> statement-breakpoint
ALTER TABLE "payments" ADD COLUMN "raw_source" text;--> statement-breakpoint
ALTER TABLE "payments" ADD COLUMN "raw_medium" text;--> statement-breakpoint
ALTER TABLE "users" ADD COLUMN "phone" text;--> statement-breakpoint
ALTER TABLE "org_members" ADD COLUMN "tour_state" jsonb;--> statement-breakpoint
ALTER TABLE "org_members" ADD COLUMN "email_sequence_state" jsonb;--> statement-breakpoint
ALTER TABLE "integrations" ADD COLUMN "sync_job_id" text;--> statement-breakpoint
ALTER TABLE "customers" ADD CONSTRAINT "customers_organization_id_organizations_id_fk" FOREIGN KEY ("organization_id") REFERENCES "public"."organizations"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "dead_letter_events" ADD CONSTRAINT "dead_letter_events_organization_id_organizations_id_fk" FOREIGN KEY ("organization_id") REFERENCES "public"."organizations"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "email_logs" ADD CONSTRAINT "email_logs_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "email_logs" ADD CONSTRAINT "email_logs_organization_id_organizations_id_fk" FOREIGN KEY ("organization_id") REFERENCES "public"."organizations"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "notifications" ADD CONSTRAINT "notifications_organization_id_organizations_id_fk" FOREIGN KEY ("organization_id") REFERENCES "public"."organizations"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "marketing_spends" ADD CONSTRAINT "marketing_spends_organization_id_organizations_id_fk" FOREIGN KEY ("organization_id") REFERENCES "public"."organizations"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE UNIQUE INDEX "customers_org_customer_idx" ON "customers" USING btree ("organization_id","customer_id");--> statement-breakpoint
CREATE INDEX "customers_org_email_idx" ON "customers" USING btree ("organization_id","email");--> statement-breakpoint
CREATE INDEX "customers_org_last_seen_idx" ON "customers" USING btree ("organization_id","last_seen_at");--> statement-breakpoint
CREATE INDEX "customers_org_first_source_idx" ON "customers" USING btree ("organization_id","first_source");--> statement-breakpoint
CREATE INDEX "dead_letter_events_org_created_idx" ON "dead_letter_events" USING btree ("organization_id","created_at");--> statement-breakpoint
CREATE UNIQUE INDEX "email_logs_user_org_email_idx" ON "email_logs" USING btree ("user_id","organization_id","email_id");--> statement-breakpoint
CREATE INDEX "notifications_org_read_created_idx" ON "notifications" USING btree ("organization_id","is_read","created_at");--> statement-breakpoint
CREATE INDEX "notifications_org_created_idx" ON "notifications" USING btree ("organization_id","created_at");