import "dotenv/config";
import { neon } from "@neondatabase/serverless";
import { drizzle } from "drizzle-orm/neon-http";
import { eq, and } from "drizzle-orm";
import { subscriptions, events, organizations } from "./schema";

const sql = neon(process.env.DATABASE_URL!);
const db = drizzle(sql);

const ORG_ID = "32359738-ad84-4d37-9496-99f97e36d433";

const PLANS = [
  { id: "plan_starter", name: "Starter", cents: 2990, interval: "monthly" as const },
  { id: "plan_pro", name: "Pro", cents: 7990, interval: "monthly" as const },
  { id: "plan_business", name: "Business", cents: 14990, interval: "monthly" as const },
  { id: "plan_enterprise", name: "Enterprise Annual", cents: 179900, interval: "yearly" as const },
  { id: "plan_weekly_lite", name: "Weekly Lite", cents: 1490, interval: "weekly" as const },
];

function daysAgo(days: number): Date {
  const d = new Date();
  d.setDate(d.getDate() - days);
  d.setHours(10, 0, 0, 0);
  return d;
}

function daysAgoJitter(days: number, jitterHours = 4): Date {
  const d = daysAgo(days);
  d.setHours(d.getHours() + Math.floor(Math.random() * jitterHours));
  return d;
}

function pickPlan(index: number) {
  return PLANS[index % PLANS.length];
}

async function cleanup() {
  console.log("Cleaning up mock MRR data...");

  await db
    .delete(events)
    .where(
      and(
        eq(events.organizationId, ORG_ID),
        eq(events.billingType, "recurring")
      )
    );

  await db
    .delete(subscriptions)
    .where(eq(subscriptions.organizationId, ORG_ID));

  await db
    .update(organizations)
    .set({ hasRecurringRevenue: false })
    .where(eq(organizations.id, ORG_ID));

  console.log("Cleanup complete.");
}

async function seed() {
  console.log("Seeding MRR mock data...");

  await db
    .update(organizations)
    .set({ hasRecurringRevenue: true })
    .where(eq(organizations.id, ORG_ID));

  const subscriptionRows: (typeof subscriptions.$inferInsert)[] = [];

  // 30 active subscriptions spread over 12 months (increasing density = growth curve)
  // Older subs: few per month early, more recent months have more
  const activeGroups = [
    // 12 months ago: 2 subs
    { daysBack: 365, count: 2 },
    // 10 months ago: 2 subs
    { daysBack: 305, count: 2 },
    // 8 months ago: 3 subs
    { daysBack: 245, count: 3 },
    // 6 months ago: 4 subs
    { daysBack: 185, count: 4 },
    // 4 months ago: 5 subs
    { daysBack: 120, count: 5 },
    // 2 months ago: 7 subs
    { daysBack: 60, count: 7 },
    // Last month: 7 subs
    { daysBack: 20, count: 7 },
  ];

  let activeIndex = 0;
  for (const group of activeGroups) {
    for (let i = 0; i < group.count; i++) {
      const plan = pickPlan(activeIndex);
      subscriptionRows.push({
        organizationId: ORG_ID,
        subscriptionId: `mock_sub_active_${activeIndex}`,
        customerId: `mock_cust_${activeIndex}`,
        planId: plan.id,
        planName: plan.name,
        status: "active",
        valueInCents: plan.cents,
        billingInterval: plan.interval,
        startedAt: daysAgoJitter(group.daysBack, 8),
        canceledAt: null,
      });
      activeIndex++;
    }
  }

  // 5 trialing subscriptions (started in the last 7 days)
  for (let i = 0; i < 5; i++) {
    const plan = PLANS[i % 3]; // starter, pro, business only for trials
    subscriptionRows.push({
      organizationId: ORG_ID,
      subscriptionId: `mock_sub_trial_${i}`,
      customerId: `mock_cust_trial_${i}`,
      planId: plan.id,
      planName: plan.name,
      status: "trialing",
      valueInCents: plan.cents,
      billingInterval: plan.interval,
      startedAt: daysAgoJitter(i + 1, 2),
      canceledAt: null,
    });
  }

  // 4 past_due subscriptions (started 1-3 months ago)
  for (let i = 0; i < 4; i++) {
    const plan = PLANS[i % PLANS.length];
    subscriptionRows.push({
      organizationId: ORG_ID,
      subscriptionId: `mock_sub_pastdue_${i}`,
      customerId: `mock_cust_pastdue_${i}`,
      planId: plan.id,
      planName: plan.name,
      status: "past_due",
      valueInCents: plan.cents,
      billingInterval: plan.interval,
      startedAt: daysAgoJitter(30 + i * 12, 6),
      canceledAt: null,
    });
  }

  // 6 canceled in current period (last 30 days) – for churn metric current period
  for (let i = 0; i < 6; i++) {
    const plan = PLANS[i % PLANS.length];
    const startedAt = daysAgoJitter(90 + i * 10, 8);
    const canceledAt = daysAgoJitter(5 + i * 3, 4);
    subscriptionRows.push({
      organizationId: ORG_ID,
      subscriptionId: `mock_sub_canceled_cur_${i}`,
      customerId: `mock_cust_canceled_cur_${i}`,
      planId: plan.id,
      planName: plan.name,
      status: "canceled",
      valueInCents: plan.cents,
      billingInterval: plan.interval,
      startedAt,
      canceledAt,
    });
  }

  // 5 canceled in previous period (31-60 days ago) – for period comparison
  for (let i = 0; i < 5; i++) {
    const plan = PLANS[i % PLANS.length];
    const startedAt = daysAgoJitter(150 + i * 15, 8);
    const canceledAt = daysAgoJitter(35 + i * 4, 4);
    subscriptionRows.push({
      organizationId: ORG_ID,
      subscriptionId: `mock_sub_canceled_prev_${i}`,
      customerId: `mock_cust_canceled_prev_${i}`,
      planId: plan.id,
      planName: plan.name,
      status: "canceled",
      valueInCents: plan.cents,
      billingInterval: plan.interval,
      startedAt,
      canceledAt,
    });
  }

  await db.insert(subscriptions).values(subscriptionRows);
  console.log(`Inserted ${subscriptionRows.length} subscriptions.`);

  // Build events for MRR movement chart
  // Events needed: payment (recurring) – first = new MRR, subsequent = expansion
  //                subscription_canceled – churn
  //                subscription_changed – expansion
  const eventRows: (typeof events.$inferInsert)[] = [];

  // Payment events for active subscriptions (spread over their tenure)
  for (let idx = 0; idx < activeIndex; idx++) {
    const sub = subscriptionRows[idx];
    const plan = PLANS.find((p) => p.id === sub.planId)!;
    const startedAt = sub.startedAt as Date;
    const daysOld = Math.floor(
      (Date.now() - startedAt.getTime()) / (1000 * 60 * 60 * 24)
    );

    const monthsOfPayments =
      sub.billingInterval === "yearly"
        ? Math.max(1, Math.floor(daysOld / 365))
        : sub.billingInterval === "weekly"
          ? Math.min(4, Math.floor(daysOld / 7))
          : Math.min(6, Math.floor(daysOld / 30));

    for (let m = 0; m < monthsOfPayments; m++) {
      const paymentDaysAgo =
        sub.billingInterval === "yearly"
          ? daysOld - m * 365
          : sub.billingInterval === "weekly"
            ? daysOld - m * 7
            : daysOld - m * 30;

      const eventDate = daysAgoJitter(Math.max(0, paymentDaysAgo), 6);

      eventRows.push({
        organizationId: ORG_ID,
        eventType: "purchase",
        billingType: "recurring",
        billingInterval: sub.billingInterval,
        subscriptionId: sub.subscriptionId as string,
        planId: sub.planId as string,
        planName: sub.planName as string,
        customerId: sub.customerId as string,
        grossValueInCents: sub.valueInCents as number,
        baseGrossValueInCents: sub.valueInCents as number,
        baseNetValueInCents: Math.round((sub.valueInCents as number) * 0.88),
        currency: "BRL",
        baseCurrency: "BRL",
        exchangeRate: 1,
        paymentMethod: m % 3 === 0 ? "credit_card" : m % 3 === 1 ? "pix" : "boleto",
        createdAt: eventDate,
      });
    }
  }

  // subscription_canceled events – one per canceled sub (in current period)
  for (let i = 0; i < 6; i++) {
    const sub = subscriptionRows[activeIndex + 5 + 4 + i]; // after active, trial, pastdue
    eventRows.push({
      organizationId: ORG_ID,
      eventType: "subscription_canceled",
      billingType: "recurring",
      billingInterval: sub.billingInterval,
      subscriptionId: sub.subscriptionId as string,
      planId: sub.planId as string,
      planName: sub.planName as string,
      customerId: sub.customerId as string,
      grossValueInCents: sub.valueInCents as number,
      baseGrossValueInCents: sub.valueInCents as number,
      baseNetValueInCents: Math.round((sub.valueInCents as number) * 0.88),
      currency: "BRL",
      baseCurrency: "BRL",
      exchangeRate: 1,
      createdAt: sub.canceledAt as Date,
    });
  }

  // subscription_canceled events for previous period cancellations
  for (let i = 0; i < 5; i++) {
    const sub = subscriptionRows[activeIndex + 5 + 4 + 6 + i];
    eventRows.push({
      organizationId: ORG_ID,
      eventType: "subscription_canceled",
      billingType: "recurring",
      billingInterval: sub.billingInterval,
      subscriptionId: sub.subscriptionId as string,
      planId: sub.planId as string,
      planName: sub.planName as string,
      customerId: sub.customerId as string,
      grossValueInCents: sub.valueInCents as number,
      baseGrossValueInCents: sub.valueInCents as number,
      baseNetValueInCents: Math.round((sub.valueInCents as number) * 0.88),
      currency: "BRL",
      baseCurrency: "BRL",
      exchangeRate: 1,
      createdAt: sub.canceledAt as Date,
    });
  }

  // subscription_changed events – upgrades on 4 active subs at different points in time
  const upgradeTargets = [2, 5, 9, 15];
  for (const targetIdx of upgradeTargets) {
    const sub = subscriptionRows[targetIdx];
    const upgradedPlan = PLANS[(PLANS.findIndex((p) => p.id === sub.planId) + 1) % PLANS.length];
    eventRows.push({
      organizationId: ORG_ID,
      eventType: "subscription_changed",
      billingType: "recurring",
      billingInterval: upgradedPlan.interval,
      subscriptionId: sub.subscriptionId as string,
      planId: upgradedPlan.id,
      planName: upgradedPlan.name,
      customerId: sub.customerId as string,
      grossValueInCents: upgradedPlan.cents,
      baseGrossValueInCents: upgradedPlan.cents,
      baseNetValueInCents: Math.round(upgradedPlan.cents * 0.88),
      currency: "BRL",
      baseCurrency: "BRL",
      exchangeRate: 1,
      createdAt: daysAgoJitter(14, 6),
    });
  }

  await db.insert(events).values(eventRows);
  console.log(`Inserted ${eventRows.length} events.`);

  console.log("MRR mock seed complete.");
  console.log(`Organization ${ORG_ID} has hasRecurringRevenue = true`);
  console.log("To remove mock data run: npx tsx db/seed-mrr-mock.ts --cleanup");
}

const isCleanup = process.argv.includes("--cleanup");

if (isCleanup) {
  cleanup().catch(console.error);
} else {
  seed().catch(console.error);
}
