CREATE TABLE "alert_configs" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"organization_id" uuid NOT NULL,
	"type" text NOT NULL,
	"threshold" real NOT NULL,
	"is_active" boolean DEFAULT true NOT NULL,
	"channel_email" boolean DEFAULT true NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "api_keys" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"organization_id" uuid NOT NULL,
	"key" text NOT NULL,
	"name" text NOT NULL,
	"is_active" boolean DEFAULT true NOT NULL,
	"last_used_at" timestamp,
	"expires_at" timestamp,
	"created_at" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "api_keys_key_unique" UNIQUE("key")
);
--> statement-breakpoint
CREATE TABLE "fixed_costs" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"organization_id" uuid NOT NULL,
	"name" text NOT NULL,
	"amount_in_cents" integer NOT NULL,
	"type" text DEFAULT 'VALUE' NOT NULL,
	"frequency" text DEFAULT 'monthly' NOT NULL,
	"description" text,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "variable_costs" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"organization_id" uuid NOT NULL,
	"name" text NOT NULL,
	"amount_in_cents" integer NOT NULL,
	"type" text DEFAULT 'PERCENTAGE' NOT NULL,
	"apply_to" text DEFAULT 'all' NOT NULL,
	"apply_to_value" text,
	"description" text,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "events" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"organization_id" uuid NOT NULL,
	"event_type" text NOT NULL,
	"currency" text DEFAULT 'BRL' NOT NULL,
	"base_currency" text DEFAULT 'BRL' NOT NULL,
	"exchange_rate" real DEFAULT 1 NOT NULL,
	"gross_value_in_cents" integer,
	"base_gross_value_in_cents" integer,
	"base_net_value_in_cents" integer,
	"discount_in_cents" integer,
	"installments" integer,
	"payment_method" text,
	"product_id" text,
	"product_name" text,
	"category" text,
	"source" text,
	"medium" text,
	"campaign" text,
	"content" text,
	"landing_page" text,
	"entry_page" text,
	"referrer" text,
	"device" text,
	"customer_type" text,
	"customer_id" text,
	"session_id" text,
	"billing_type" text,
	"billing_reason" text,
	"billing_interval" text,
	"subscription_id" text,
	"plan_id" text,
	"plan_name" text,
	"provider" text,
	"metadata" jsonb,
	"event_hash" text,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "exchange_rates" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"organization_id" uuid NOT NULL,
	"from_currency" text NOT NULL,
	"to_currency" text NOT NULL,
	"rate" real NOT NULL,
	"effective_from" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "funnel_daily_pages" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"organization_id" uuid NOT NULL,
	"date" date NOT NULL,
	"event_type" text NOT NULL,
	"entry_page" text DEFAULT '' NOT NULL,
	"total" integer DEFAULT 0 NOT NULL,
	"unique_sessions" integer DEFAULT 0 NOT NULL,
	"value_in_cents" integer DEFAULT 0 NOT NULL
);
--> statement-breakpoint
CREATE TABLE "funnel_daily" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"organization_id" uuid NOT NULL,
	"date" date NOT NULL,
	"event_type" text NOT NULL,
	"source" text DEFAULT '' NOT NULL,
	"medium" text DEFAULT '' NOT NULL,
	"device" text DEFAULT '' NOT NULL,
	"total" integer DEFAULT 0 NOT NULL,
	"unique_sessions" integer DEFAULT 0 NOT NULL,
	"value_in_cents" integer DEFAULT 0 NOT NULL
);
--> statement-breakpoint
CREATE TABLE "organizations" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"name" text NOT NULL,
	"slug" text NOT NULL,
	"funnel_steps" jsonb DEFAULT '[{"eventType":"signup","label":"Cadastros"},{"eventType":"purchase","label":"Compras"}]'::jsonb NOT NULL,
	"timezone" text DEFAULT 'America/Sao_Paulo' NOT NULL,
	"currency" text DEFAULT 'BRL' NOT NULL,
	"locale" text DEFAULT 'pt-BR' NOT NULL,
	"country" text DEFAULT 'BR' NOT NULL,
	"language" text DEFAULT 'pt-BR' NOT NULL,
	"has_recurring_revenue" boolean DEFAULT false NOT NULL,
	"ai_profile" jsonb,
	"public_page_enabled" boolean DEFAULT false NOT NULL,
	"public_page_settings" jsonb DEFAULT '{"showAbsoluteValues":true,"showMrr":true,"showSubscribers":true,"showChurn":true,"showArpu":false,"showGrowthChart":true,"showSankey":true,"showRevenue":true,"showTicketMedio":true,"showRepurchaseRate":true,"showRevenueSplit":true}'::jsonb,
	"public_description" text,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "organizations_slug_unique" UNIQUE("slug")
);
--> statement-breakpoint
CREATE TABLE "payments" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"organization_id" uuid NOT NULL,
	"event_type" text NOT NULL,
	"currency" text DEFAULT 'BRL' NOT NULL,
	"base_currency" text DEFAULT 'BRL' NOT NULL,
	"exchange_rate" real DEFAULT 1 NOT NULL,
	"gross_value_in_cents" integer,
	"base_gross_value_in_cents" integer,
	"base_net_value_in_cents" integer,
	"discount_in_cents" integer,
	"installments" integer,
	"payment_method" text,
	"product_id" text,
	"product_name" text,
	"category" text,
	"source" text,
	"medium" text,
	"campaign" text,
	"content" text,
	"landing_page" text,
	"entry_page" text,
	"referrer" text,
	"device" text,
	"customer_type" text,
	"customer_id" text,
	"session_id" text,
	"billing_type" text,
	"billing_reason" text,
	"billing_interval" text,
	"subscription_id" text,
	"plan_id" text,
	"plan_name" text,
	"provider" text,
	"metadata" jsonb,
	"event_hash" text,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "users" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"name" text NOT NULL,
	"email" text NOT NULL,
	"password_hash" text NOT NULL,
	"role" text DEFAULT 'ADMIN' NOT NULL,
	"onboarding_completed" boolean DEFAULT false NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "users_email_unique" UNIQUE("email")
);
--> statement-breakpoint
CREATE TABLE "subscriptions" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"organization_id" uuid NOT NULL,
	"subscription_id" text NOT NULL,
	"customer_id" text NOT NULL,
	"plan_id" text NOT NULL,
	"plan_name" text NOT NULL,
	"status" text DEFAULT 'active' NOT NULL,
	"value_in_cents" integer NOT NULL,
	"currency" text DEFAULT 'BRL' NOT NULL,
	"base_currency" text DEFAULT 'BRL' NOT NULL,
	"exchange_rate" real DEFAULT 1 NOT NULL,
	"base_value_in_cents" integer,
	"billing_interval" text NOT NULL,
	"started_at" timestamp NOT NULL,
	"canceled_at" timestamp,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "subscriptions_subscription_id_unique" UNIQUE("subscription_id")
);
--> statement-breakpoint
CREATE TABLE "pageview_aggregates" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"organization_id" uuid NOT NULL,
	"date" date NOT NULL,
	"session_id" text NOT NULL,
	"landing_page" text,
	"entry_page" text,
	"source" text,
	"medium" text,
	"campaign" text,
	"content" text,
	"device" text,
	"referrer" text,
	"pageviews" integer DEFAULT 1 NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "pageview_daily_sessions" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"organization_id" uuid NOT NULL,
	"date" date NOT NULL,
	"source" text DEFAULT '' NOT NULL,
	"medium" text DEFAULT '' NOT NULL,
	"campaign" text DEFAULT '' NOT NULL,
	"content" text DEFAULT '' NOT NULL,
	"device" text DEFAULT '' NOT NULL,
	"entry_page" text DEFAULT '' NOT NULL,
	"referrer" text DEFAULT '' NOT NULL,
	"sessions" integer DEFAULT 0 NOT NULL,
	"pageviews" integer DEFAULT 0 NOT NULL
);
--> statement-breakpoint
CREATE TABLE "pageview_daily_pages" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"organization_id" uuid NOT NULL,
	"date" date NOT NULL,
	"landing_page" text DEFAULT '' NOT NULL,
	"sessions" integer DEFAULT 0 NOT NULL,
	"pageviews" integer DEFAULT 0 NOT NULL
);
--> statement-breakpoint
CREATE TABLE "org_invites" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"organization_id" uuid NOT NULL,
	"email" text NOT NULL,
	"role" text DEFAULT 'viewer' NOT NULL,
	"token" text NOT NULL,
	"expires_at" timestamp NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "org_invites_token_unique" UNIQUE("token")
);
--> statement-breakpoint
CREATE TABLE "org_members" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"organization_id" uuid NOT NULL,
	"user_id" uuid NOT NULL,
	"role" text DEFAULT 'viewer' NOT NULL,
	"invited_at" timestamp DEFAULT now() NOT NULL,
	"accepted_at" timestamp
);
--> statement-breakpoint
CREATE TABLE "integrations" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"organization_id" uuid NOT NULL,
	"provider" text NOT NULL,
	"access_token" text NOT NULL,
	"status" text DEFAULT 'active' NOT NULL,
	"last_synced_at" timestamp,
	"history_synced_at" timestamp,
	"sync_error" text,
	"provider_account_id" text,
	"provider_meta" jsonb,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "password_resets" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" uuid NOT NULL,
	"token" text NOT NULL,
	"expires_at" timestamp NOT NULL,
	"used_at" timestamp,
	"created_at" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "password_resets_token_unique" UNIQUE("token")
);
--> statement-breakpoint
CREATE TABLE "milestones" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"organization_id" uuid NOT NULL,
	"key" text NOT NULL,
	"reached_at" timestamp DEFAULT now() NOT NULL,
	"notified_at" timestamp,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "alert_configs" ADD CONSTRAINT "alert_configs_organization_id_organizations_id_fk" FOREIGN KEY ("organization_id") REFERENCES "public"."organizations"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "api_keys" ADD CONSTRAINT "api_keys_organization_id_organizations_id_fk" FOREIGN KEY ("organization_id") REFERENCES "public"."organizations"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "fixed_costs" ADD CONSTRAINT "fixed_costs_organization_id_organizations_id_fk" FOREIGN KEY ("organization_id") REFERENCES "public"."organizations"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "variable_costs" ADD CONSTRAINT "variable_costs_organization_id_organizations_id_fk" FOREIGN KEY ("organization_id") REFERENCES "public"."organizations"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "events" ADD CONSTRAINT "events_organization_id_organizations_id_fk" FOREIGN KEY ("organization_id") REFERENCES "public"."organizations"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "exchange_rates" ADD CONSTRAINT "exchange_rates_organization_id_organizations_id_fk" FOREIGN KEY ("organization_id") REFERENCES "public"."organizations"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "funnel_daily_pages" ADD CONSTRAINT "funnel_daily_pages_organization_id_organizations_id_fk" FOREIGN KEY ("organization_id") REFERENCES "public"."organizations"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "funnel_daily" ADD CONSTRAINT "funnel_daily_organization_id_organizations_id_fk" FOREIGN KEY ("organization_id") REFERENCES "public"."organizations"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "payments" ADD CONSTRAINT "payments_organization_id_organizations_id_fk" FOREIGN KEY ("organization_id") REFERENCES "public"."organizations"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "subscriptions" ADD CONSTRAINT "subscriptions_organization_id_organizations_id_fk" FOREIGN KEY ("organization_id") REFERENCES "public"."organizations"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "pageview_aggregates" ADD CONSTRAINT "pageview_aggregates_organization_id_organizations_id_fk" FOREIGN KEY ("organization_id") REFERENCES "public"."organizations"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "pageview_daily_sessions" ADD CONSTRAINT "pageview_daily_sessions_organization_id_organizations_id_fk" FOREIGN KEY ("organization_id") REFERENCES "public"."organizations"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "pageview_daily_pages" ADD CONSTRAINT "pageview_daily_pages_organization_id_organizations_id_fk" FOREIGN KEY ("organization_id") REFERENCES "public"."organizations"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "org_invites" ADD CONSTRAINT "org_invites_organization_id_organizations_id_fk" FOREIGN KEY ("organization_id") REFERENCES "public"."organizations"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "org_members" ADD CONSTRAINT "org_members_organization_id_organizations_id_fk" FOREIGN KEY ("organization_id") REFERENCES "public"."organizations"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "org_members" ADD CONSTRAINT "org_members_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "integrations" ADD CONSTRAINT "integrations_organization_id_organizations_id_fk" FOREIGN KEY ("organization_id") REFERENCES "public"."organizations"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "password_resets" ADD CONSTRAINT "password_resets_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "milestones" ADD CONSTRAINT "milestones_organization_id_organizations_id_fk" FOREIGN KEY ("organization_id") REFERENCES "public"."organizations"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE UNIQUE INDEX "alert_configs_org_type_idx" ON "alert_configs" USING btree ("organization_id","type");--> statement-breakpoint
CREATE INDEX "events_org_type_created_idx" ON "events" USING btree ("organization_id","event_type","created_at");--> statement-breakpoint
CREATE INDEX "events_org_created_idx" ON "events" USING btree ("organization_id","created_at");--> statement-breakpoint
CREATE UNIQUE INDEX "events_hash_unique_idx" ON "events" USING btree ("organization_id","event_hash");--> statement-breakpoint
CREATE INDEX "exchange_rates_org_pair_date_idx" ON "exchange_rates" USING btree ("organization_id","from_currency","to_currency","effective_from");--> statement-breakpoint
CREATE UNIQUE INDEX "funnel_daily_pages_unique_idx" ON "funnel_daily_pages" USING btree ("organization_id","date","event_type","entry_page");--> statement-breakpoint
CREATE INDEX "funnel_daily_pages_org_date_idx" ON "funnel_daily_pages" USING btree ("organization_id","date");--> statement-breakpoint
CREATE UNIQUE INDEX "funnel_daily_unique_idx" ON "funnel_daily" USING btree ("organization_id","date","event_type","source","medium","device");--> statement-breakpoint
CREATE INDEX "funnel_daily_org_date_idx" ON "funnel_daily" USING btree ("organization_id","date");--> statement-breakpoint
CREATE INDEX "payments_org_type_created_idx" ON "payments" USING btree ("organization_id","event_type","created_at");--> statement-breakpoint
CREATE INDEX "payments_org_created_idx" ON "payments" USING btree ("organization_id","created_at");--> statement-breakpoint
CREATE UNIQUE INDEX "payments_hash_unique_idx" ON "payments" USING btree ("organization_id","event_hash");--> statement-breakpoint
CREATE INDEX "payments_org_customer_idx" ON "payments" USING btree ("organization_id","customer_id");--> statement-breakpoint
CREATE INDEX "subscriptions_org_status_idx" ON "subscriptions" USING btree ("organization_id","status");--> statement-breakpoint
CREATE UNIQUE INDEX "pv_agg_unique_idx" ON "pageview_aggregates" USING btree ("organization_id","date","session_id","landing_page");--> statement-breakpoint
CREATE INDEX "pv_agg_org_date_idx" ON "pageview_aggregates" USING btree ("organization_id","date");--> statement-breakpoint
CREATE UNIQUE INDEX "pv_daily_sess_unique_idx" ON "pageview_daily_sessions" USING btree ("organization_id","date","source","medium","campaign","content","device","entry_page","referrer");--> statement-breakpoint
CREATE INDEX "pv_daily_sess_org_date_idx" ON "pageview_daily_sessions" USING btree ("organization_id","date");--> statement-breakpoint
CREATE UNIQUE INDEX "pv_daily_pages_unique_idx" ON "pageview_daily_pages" USING btree ("organization_id","date","landing_page");--> statement-breakpoint
CREATE INDEX "pv_daily_pages_org_date_idx" ON "pageview_daily_pages" USING btree ("organization_id","date");--> statement-breakpoint
CREATE UNIQUE INDEX "org_members_org_user_idx" ON "org_members" USING btree ("organization_id","user_id");--> statement-breakpoint
CREATE UNIQUE INDEX "integrations_org_provider_idx" ON "integrations" USING btree ("organization_id","provider");--> statement-breakpoint
CREATE UNIQUE INDEX "milestones_org_key_idx" ON "milestones" USING btree ("organization_id","key");