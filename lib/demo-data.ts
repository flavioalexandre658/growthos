import type { IMrrOverview, IMrrMovementEntry, IMrrGrowthEntry, IActiveSubscription } from "@/interfaces/mrr.interface";

interface DemoData {
  mrrOverview: IMrrOverview;
  mrrMovement: IMrrMovementEntry[];
  mrrGrowth: IMrrGrowthEntry[];
  activeSubscriptions: IActiveSubscription[];
}

function monthsAgo(months: number): string {
  const d = new Date();
  d.setMonth(d.getMonth() - months);
  return d.toISOString().slice(0, 7);
}

function daysAgo(days: number): Date {
  const d = new Date();
  d.setDate(d.getDate() - days);
  d.setHours(10, 0, 0, 0);
  return d;
}

const BRL_PLANS = [
  { id: "plan_starter", name: "Starter", cents: 2990 },
  { id: "plan_pro", name: "Pro", cents: 7990 },
  { id: "plan_business", name: "Business", cents: 14990 },
  { id: "plan_enterprise", name: "Enterprise", cents: 49900 },
];

const USD_PLANS = [
  { id: "plan_starter", name: "Starter", cents: 990 },
  { id: "plan_pro", name: "Pro", cents: 2990 },
  { id: "plan_business", name: "Business", cents: 4990 },
  { id: "plan_enterprise", name: "Enterprise", cents: 14900 },
];

function buildMrrOverview(isBrl: boolean): IMrrOverview {
  const mrr = isBrl ? 1420000 : 280000;
  const prevMrr = isBrl ? 1310000 : 258000;
  const activeSubs = 312;
  const prevActiveSubs = 295;
  const churnedSubs = 7;
  const newSubs = 24;
  const renewalSubs = 281;
  const pastDue = 4;
  const arpu = Math.round(mrr / activeSubs);
  const prevArpu = Math.round(prevMrr / prevActiveSubs);
  const churnRate = 2.3;
  const prevChurnRate = 2.8;
  const revenueChurnRate = 1.9;
  const prevRevenueChurnRate = 2.4;
  const ltv = Math.round(arpu / (churnRate / 100));
  const prevLtv = Math.round(prevArpu / (prevChurnRate / 100));
  const totalNew = isBrl ? 185000 : 36500;
  const totalExpansion = isBrl ? 42000 : 8200;
  const totalContraction = isBrl ? 12000 : 2400;
  const totalChurned = isBrl ? 67000 : 13200;
  const periodRevenue = isBrl ? 1580000 : 312000;
  const prevPeriodRevenue = isBrl ? 1420000 : 280000;

  return {
    mrr,
    arr: mrr * 12,
    activeSubscriptions: activeSubs,
    arpu,
    churnRate,
    revenueChurnRate,
    estimatedLtv: ltv,
    mrrGrowthRate: Math.round(((mrr - prevMrr) / prevMrr) * 10000) / 100,
    previousMrr: prevMrr,
    previousArr: prevMrr * 12,
    previousArpu: prevArpu,
    previousChurnRate: prevChurnRate,
    previousRevenueChurnRate: prevRevenueChurnRate,
    previousEstimatedLtv: prevLtv,
    previousActiveSubscriptions: prevActiveSubs,
    totalNewMrr: totalNew,
    totalExpansionMrr: totalExpansion,
    totalContractionMrr: totalContraction,
    totalChurnedMrr: totalChurned,
    pastDueSubscriptions: pastDue,
    newSubscriptions: newSubs,
    churnedSubscriptions: churnedSubs,
    renewalSubscriptions: renewalSubs,
    totalPeriodRevenue: periodRevenue,
    totalPurchaseCount: 336,
    previousPeriodRevenue: prevPeriodRevenue,
    nrr: 104.2,
    previousNrr: 103.1,
    forecastNext30dRevenue: Math.round(mrr * 1.04),
    forecastNext30dCount: 330,
  };
}

function buildMrrMovement(isBrl: boolean): IMrrMovementEntry[] {
  const scale = isBrl ? 1 : 0.2;
  const base = [
    { newMrr: 65000, renewalMrr: 620000, expansionMrr: 8000, contractionMrr: 3000, churnedMrr: 28000 },
    { newMrr: 78000, renewalMrr: 680000, expansionMrr: 12000, contractionMrr: 5000, churnedMrr: 32000 },
    { newMrr: 82000, renewalMrr: 730000, expansionMrr: 15000, contractionMrr: 4000, churnedMrr: 35000 },
    { newMrr: 95000, renewalMrr: 790000, expansionMrr: 18000, contractionMrr: 6000, churnedMrr: 38000 },
    { newMrr: 105000, renewalMrr: 850000, expansionMrr: 22000, contractionMrr: 5000, churnedMrr: 42000 },
    { newMrr: 115000, renewalMrr: 920000, expansionMrr: 25000, contractionMrr: 7000, churnedMrr: 45000 },
    { newMrr: 125000, renewalMrr: 980000, expansionMrr: 28000, contractionMrr: 6000, churnedMrr: 48000 },
    { newMrr: 138000, renewalMrr: 1050000, expansionMrr: 32000, contractionMrr: 8000, churnedMrr: 52000 },
    { newMrr: 148000, renewalMrr: 1120000, expansionMrr: 35000, contractionMrr: 7000, churnedMrr: 55000 },
    { newMrr: 158000, renewalMrr: 1180000, expansionMrr: 38000, contractionMrr: 9000, churnedMrr: 58000 },
    { newMrr: 170000, renewalMrr: 1250000, expansionMrr: 40000, contractionMrr: 10000, churnedMrr: 62000 },
    { newMrr: 185000, renewalMrr: 1320000, expansionMrr: 42000, contractionMrr: 12000, churnedMrr: 67000 },
  ];

  return base.map((entry, i) => ({
    date: monthsAgo(11 - i),
    newMrr: Math.round(entry.newMrr * scale),
    renewalMrr: Math.round(entry.renewalMrr * scale),
    expansionMrr: Math.round(entry.expansionMrr * scale),
    contractionMrr: Math.round(entry.contractionMrr * scale),
    churnedMrr: Math.round(entry.churnedMrr * scale),
    netMrr: Math.round(
      (entry.newMrr + entry.renewalMrr + entry.expansionMrr - entry.contractionMrr - entry.churnedMrr) * scale,
    ),
  }));
}

function buildMrrGrowth(isBrl: boolean): IMrrGrowthEntry[] {
  const values = isBrl
    ? [620000, 720000, 790000, 860000, 940000, 1020000, 1080000, 1150000, 1220000, 1290000, 1350000, 1420000]
    : [122000, 142000, 156000, 170000, 186000, 202000, 214000, 228000, 242000, 256000, 268000, 280000];

  return values.map((mrr, i) => ({
    date: monthsAgo(11 - i),
    mrr,
  }));
}

function buildActiveSubscriptions(isBrl: boolean): IActiveSubscription[] {
  const plans = isBrl ? BRL_PLANS : USD_PLANS;
  const names = [
    "Tech Solutions", "Digital Wave", "Cloud Nine", "Pixel Perfect", "Data Forge",
    "Swift Labs", "Nova Systems", "Core Analytics", "Bright Ideas", "Flow Studio",
    "Apex Digital", "Cyber Pulse", "Net Dynamics", "Logic Hub", "Spark Ventures",
  ];

  return names.map((name, i) => {
    const plan = plans[i % plans.length];
    const startDays = 30 + i * 22;
    return {
      subscriptionId: `demo_sub_${i}`,
      customerId: `demo_cust_${i}`,
      customerName: name,
      customerEmail: `${name.toLowerCase().replace(/\s+/g, ".")}@example.com`,
      planName: plan.name,
      planId: plan.id,
      valueInCents: plan.cents,
      billingInterval: "monthly",
      status: "active",
      startedAt: daysAgo(startDays),
      canceledAt: null,
      renewalCount: Math.max(1, Math.floor(startDays / 30)),
      nextBillingAt: new Date(Date.now() + (30 - (startDays % 30)) * 86400000),
      estimatedLtvInCents: plan.cents * Math.max(1, Math.floor(startDays / 30)) * 3,
    };
  });
}

const brlData: DemoData = {
  mrrOverview: buildMrrOverview(true),
  mrrMovement: buildMrrMovement(true),
  mrrGrowth: buildMrrGrowth(true),
  activeSubscriptions: buildActiveSubscriptions(true),
};

const usdData: DemoData = {
  mrrOverview: buildMrrOverview(false),
  mrrMovement: buildMrrMovement(false),
  mrrGrowth: buildMrrGrowth(false),
  activeSubscriptions: buildActiveSubscriptions(false),
};

export function getDemoData(currency: string): DemoData {
  return currency === "BRL" ? brlData : usdData;
}

export type { DemoData };
