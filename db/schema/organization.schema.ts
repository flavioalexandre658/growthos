import { pgTable, uuid, text, timestamp, jsonb, boolean } from "drizzle-orm/pg-core";

export interface IFunnelStepConfig {
  eventType: string;
  label: string;
  countUnique?: boolean;
  hidden?: boolean;
}

export interface IAiProfileConfig {
  segment?: string;
  model?: string;
  taxRegime?: string;
  monthlyGoal?: number;
}

export interface IPublicPageSettings {
  showAbsoluteValues: boolean;
  showMrr: boolean;
  showSubscribers: boolean;
  showChurn: boolean;
  showArpu: boolean;
  showGrowthChart: boolean;
  showSankey: boolean;
  showRevenue: boolean;
  showTicketMedio: boolean;
  showRepurchaseRate: boolean;
  showRevenueSplit: boolean;
}

export const DEFAULT_PUBLIC_PAGE_SETTINGS: IPublicPageSettings = {
  showAbsoluteValues: true,
  showMrr: true,
  showSubscribers: true,
  showChurn: true,
  showArpu: false,
  showGrowthChart: true,
  showSankey: true,
  showRevenue: true,
  showTicketMedio: true,
  showRepurchaseRate: true,
  showRevenueSplit: true,
};

export const organizations = pgTable("organizations", {
  id: uuid("id").primaryKey().defaultRandom(),
  name: text("name").notNull(),
  slug: text("slug").notNull().unique(),
  funnelSteps: jsonb("funnel_steps")
    .$type<IFunnelStepConfig[]>()
    .notNull()
    .default([
      { eventType: "signup", label: "Cadastros" },
      { eventType: "purchase", label: "Compras" },
    ]),
  timezone: text("timezone").notNull().default("America/Sao_Paulo"),
  currency: text("currency").notNull().default("BRL"),
  locale: text("locale").notNull().default("pt-BR"),
  country: text("country").notNull().default("BR"),
  language: text("language").notNull().default("pt-BR"),
  hasRecurringRevenue: boolean("has_recurring_revenue").notNull().default(false),
  aiProfile: jsonb("ai_profile").$type<IAiProfileConfig>(),
  publicPageEnabled: boolean("public_page_enabled").notNull().default(false),
  publicPageSettings: jsonb("public_page_settings")
    .$type<IPublicPageSettings>()
    .default(DEFAULT_PUBLIC_PAGE_SETTINGS),
  publicDescription: text("public_description"),
  createdAt: timestamp("created_at").notNull().defaultNow(),
  updatedAt: timestamp("updated_at").notNull().defaultNow(),
});
