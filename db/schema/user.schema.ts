import { pgTable, uuid, text, boolean, timestamp } from "drizzle-orm/pg-core";

export const users = pgTable("users", {
  id: uuid("id").primaryKey().defaultRandom(),
  name: text("name").notNull(),
  email: text("email").notNull().unique(),
  phone: text("phone"),
  passwordHash: text("password_hash"),
  role: text("role", { enum: ["ADMIN", "VIEWER"] })
    .notNull()
    .default("ADMIN"),
  onboardingCompleted: boolean("onboarding_completed").notNull().default(false),
  locale: text("locale").notNull().default("pt"),
  authProvider: text("auth_provider", { enum: ["credentials", "google"] })
    .notNull()
    .default("credentials"),
  stripeCustomerId: text("stripe_customer_id"),
  planSlug: text("plan_slug").notNull().default("free"),
  stripeSubscriptionId: text("stripe_subscription_id"),
  subscriptionStatus: text("subscription_status"),
  currentPeriodEnd: timestamp("current_period_end"),
  createdAt: timestamp("created_at").notNull().defaultNow(),
  updatedAt: timestamp("updated_at").notNull().defaultNow(),
});
