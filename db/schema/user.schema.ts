import { pgTable, uuid, text, boolean, timestamp } from "drizzle-orm/pg-core";

export const users = pgTable("users", {
  id: uuid("id").primaryKey().defaultRandom(),
  name: text("name").notNull(),
  email: text("email").notNull().unique(),
  passwordHash: text("password_hash").notNull(),
  role: text("role", { enum: ["ADMIN", "VIEWER"] })
    .notNull()
    .default("ADMIN"),
  onboardingCompleted: boolean("onboarding_completed").notNull().default(false),
  stripeCustomerId: text("stripe_customer_id"),
  planSlug: text("plan_slug").notNull().default("free"),
  stripeSubscriptionId: text("stripe_subscription_id"),
  subscriptionStatus: text("subscription_status"),
  currentPeriodEnd: timestamp("current_period_end"),
  createdAt: timestamp("created_at").notNull().defaultNow(),
  updatedAt: timestamp("updated_at").notNull().defaultNow(),
});
