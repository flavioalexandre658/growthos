import type { IMrrOverview, IMrrMovementEntry, IMrrGrowthEntry, IActiveSubscription } from "@/interfaces/mrr.interface";

interface DemoEvent {
  id: string;
  eventType: string;
  grossValueInCents: number | null;
  currency: string;
  baseCurrency: string;
  baseGrossValueInCents: number | null;
  billingType: string | null;
  billingReason: string | null;
  provider: string | null;
  source: string | null;
  medium: string | null;
  campaign: string | null;
  productName: string | null;
  device: string | null;
  customerId: string | null;
  customerName: string | null;
  landingPage: string | null;
  paymentMethod: string | null;
  createdAt: Date;
  possibleDuplicate: boolean;
  isRetry: boolean;
}

interface DemoFinancial {
  grossRevenueInCents: number;
  totalDiscountsInCents: number;
  lostRevenueInCents: number;
  averageTicketInCents: number;
  totalPurchases: number;
  byPaymentMethod: Array<{ method: string; purchases: number; revenue: number; percentage: string }>;
  revenueByBillingType: { recurring: number; oneTime: number };
  pl: {
    grossRevenueInCents: number;
    totalFixedCostsInCents: number;
    totalVariableCostsInCents: number;
    marketingSpendInCents: number;
    operatingProfitInCents: number;
    netProfitInCents: number;
    marginPercent: number;
    fixedCostsBreakdown: Array<{ name: string; amountInCents: number; calculatedInCents: number; type: string }>;
    variableCostsBreakdown: Array<{ name: string; amountInCents: number; calculatedInCents: number; type: string }>;
    periodDays: number;
  };
  periodDays: number;
  previousGrossRevenueInCents: number;
  previousTotalPurchases: number;
}

interface DemoCosts {
  fixedCosts: Array<{ id: string; name: string; amountInCents: number; type: string; frequency: string }>;
  variableCosts: Array<{ id: string; name: string; amountInCents: number; type: string; applyTo: string }>;
  marketingSpends: Array<{ id: string; source: string; sourceLabel: string; amountInCents: number; spentAt: string }>;
}

interface DemoCustomer {
  id: string;
  customerId: string;
  name: string;
  email: string;
  firstSource: string | null;
  firstDevice: string | null;
  firstLandingPage: string | null;
  firstSeenAt: Date;
  lastSeenAt: Date;
  totalRevenueInCents: number;
  purchaseCount: number;
}

interface DemoChannelData {
  data: Array<{
    channel: string;
    revenue: number;
    ticket_medio: number;
    conversion_rate: string;
    investment: number;
    roi: number | null;
    customersCount: number;
    cac: number | null;
    avgLtv: number;
    steps: Record<string, number>;
  }>;
  totalRevenue: number;
  channelsWithRevenue: number;
  topChannel: string;
  concentrationTop2: number;
}

interface DemoFunnelData {
  steps: Array<{ key: string; label: string; value: number }>;
  rates: Array<{ key: string; label: string; value: string }>;
  revenue: number;
  ticketMedio: number;
  checkoutAbandoned: number;
  previousSteps: Array<{ key: string; value: number }>;
  previousRevenue: number;
}

interface DemoDailyEntry {
  date: string;
  steps: Record<string, number>;
  revenue: number;
}

interface DemoSourceDistribution {
  sources: Array<{ source: string; count: number; percentage: number; revenueInCents: number }>;
  total: number;
}

interface DemoTopProduct {
  productName: string;
  purchases: number;
  revenueInCents: number;
}

interface DemoPageData {
  data: Array<{
    page: string;
    revenue: number;
    conversion_rate: string;
    steps: Record<string, number>;
  }>;
  totalPages: number;
  pagesWithRevenue: number;
  totalRevenue: number;
  bestConversionPage: string;
  bestConversionRate: string;
  biggestOpportunityPage: string;
  biggestOpportunityVisits: number;
  scatterData: Array<{
    page: string;
    visits: number;
    conversionRate: number;
    revenue: number;
  }>;
}

interface DemoData {
  mrrOverview: IMrrOverview;
  mrrMovement: IMrrMovementEntry[];
  mrrGrowth: IMrrGrowthEntry[];
  activeSubscriptions: IActiveSubscription[];
  events: DemoEvent[];
  financial: DemoFinancial;
  costs: DemoCosts;
  customers: DemoCustomer[];
  channels: DemoChannelData;
  funnel: DemoFunnelData;
  daily: DemoDailyEntry[];
  sourceDistribution: DemoSourceDistribution;
  topProducts: DemoTopProduct[];
  pages: DemoPageData;
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

const CUSTOMER_NAMES = [
  "Tech Solutions", "Digital Wave", "Cloud Nine", "Pixel Perfect", "Data Forge",
  "Swift Labs", "Nova Systems", "Core Analytics", "Bright Ideas", "Flow Studio",
  "Apex Digital", "Cyber Pulse", "Net Dynamics", "Logic Hub", "Spark Ventures",
];

const SOURCES = ["google", "instagram", "facebook", "direct", "email"];

const SOURCE_WEIGHTS = [0.40, 0.25, 0.17, 0.12, 0.06];

const LANDING_PAGES = [
  "/", "/pricing", "/features", "/blog/growth-tips", "/signup",
  "/webinar", "/demo", "/case-studies",
];

const PRODUCT_NAMES = [
  "Curso Completo", "Mentoria VIP", "Starter Pack", "Workshop", "E-book",
];

function pickSource(index: number): string {
  const roll = ((index * 7 + 3) % 100) / 100;
  let cumulative = 0;
  for (let i = 0; i < SOURCES.length; i++) {
    cumulative += SOURCE_WEIGHTS[i];
    if (roll < cumulative) return SOURCES[i];
  }
  return SOURCES[0];
}

function pickDevice(index: number): string {
  return index % 3 === 0 ? "mobile" : index % 3 === 1 ? "desktop" : "tablet";
}

function pickPaymentMethod(index: number): string {
  const mod = index % 20;
  if (mod < 11) return "credit_card";
  if (mod < 17) return "pix";
  return "boleto";
}

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

  return CUSTOMER_NAMES.map((name, i) => {
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

function buildEvents(isBrl: boolean): DemoEvent[] {
  const currency = isBrl ? "BRL" : "USD";
  const scale = isBrl ? 1 : 0.2;
  const plans = isBrl ? BRL_PLANS : USD_PLANS;
  const events: DemoEvent[] = [];

  const oneTimeAmounts = isBrl
    ? [9700, 14700, 19700, 29700, 39700, 49700]
    : [1940, 2940, 3940, 5940, 7940, 9940];

  for (let i = 0; i < 25; i++) {
    const day = Math.floor((i / 25) * 30);
    const custIdx = i % 15;
    const src = pickSource(i);
    events.push({
      id: `demo_evt_pv_${i}`,
      eventType: "pageview",
      grossValueInCents: null,
      currency,
      baseCurrency: currency,
      baseGrossValueInCents: null,
      billingType: null,
      billingReason: null,
      provider: null,
      source: src,
      medium: src === "direct" ? null : src === "google" ? "cpc" : "social",
      campaign: src === "google" ? "brand_search" : src === "direct" ? null : `${src}_q1`,
      productName: null,
      device: pickDevice(i),
      customerId: `demo_cust_${custIdx}`,
      customerName: CUSTOMER_NAMES[custIdx],
      landingPage: LANDING_PAGES[i % LANDING_PAGES.length],
      paymentMethod: null,
      createdAt: daysAgo(day),
      possibleDuplicate: false,
      isRetry: false,
    });
  }

  for (let i = 0; i < 10; i++) {
    const day = Math.floor((i / 10) * 28) + 1;
    const custIdx = (i + 3) % 15;
    const src = pickSource(i + 25);
    events.push({
      id: `demo_evt_su_${i}`,
      eventType: "signup",
      grossValueInCents: null,
      currency,
      baseCurrency: currency,
      baseGrossValueInCents: null,
      billingType: null,
      billingReason: null,
      provider: null,
      source: src,
      medium: src === "direct" ? null : src === "google" ? "cpc" : "social",
      campaign: src === "google" ? "brand_search" : src === "direct" ? null : `${src}_q1`,
      productName: null,
      device: pickDevice(i + 25),
      customerId: `demo_cust_${custIdx}`,
      customerName: CUSTOMER_NAMES[custIdx],
      landingPage: LANDING_PAGES[(i + 2) % LANDING_PAGES.length],
      paymentMethod: null,
      createdAt: daysAgo(day),
      possibleDuplicate: false,
      isRetry: false,
    });
  }

  for (let i = 0; i < 8; i++) {
    const day = Math.floor((i / 8) * 27) + 2;
    const custIdx = (i + 5) % 15;
    const src = pickSource(i + 35);
    const usePlan = i < 4;
    const plan = plans[i % plans.length];
    const amount = usePlan ? plan.cents : oneTimeAmounts[i % oneTimeAmounts.length];
    events.push({
      id: `demo_evt_pu_${i}`,
      eventType: "purchase",
      grossValueInCents: amount,
      currency,
      baseCurrency: currency,
      baseGrossValueInCents: amount,
      billingType: usePlan ? "recurring" : "one_time",
      billingReason: usePlan ? "subscription_create" : "single_purchase",
      provider: i % 2 === 0 ? "stripe" : "asaas",
      source: src,
      medium: src === "direct" ? null : src === "google" ? "cpc" : "social",
      campaign: src === "google" ? "brand_search" : src === "direct" ? null : `${src}_q1`,
      productName: usePlan ? plan.name : PRODUCT_NAMES[i % PRODUCT_NAMES.length],
      device: pickDevice(i + 35),
      customerId: `demo_cust_${custIdx}`,
      customerName: CUSTOMER_NAMES[custIdx],
      landingPage: LANDING_PAGES[(i + 4) % LANDING_PAGES.length],
      paymentMethod: pickPaymentMethod(i),
      createdAt: daysAgo(day),
      possibleDuplicate: false,
      isRetry: false,
    });
  }

  for (let i = 0; i < 5; i++) {
    const day = Math.floor((i / 5) * 25) + 3;
    const custIdx = (i + 8) % 15;
    const plan = plans[i % plans.length];
    events.push({
      id: `demo_evt_rn_${i}`,
      eventType: "renewal",
      grossValueInCents: plan.cents,
      currency,
      baseCurrency: currency,
      baseGrossValueInCents: plan.cents,
      billingType: "recurring",
      billingReason: "subscription_renewal",
      provider: i % 2 === 0 ? "stripe" : "asaas",
      source: pickSource(i + 43),
      medium: "organic",
      campaign: null,
      productName: plan.name,
      device: pickDevice(i + 43),
      customerId: `demo_cust_${custIdx}`,
      customerName: CUSTOMER_NAMES[custIdx],
      landingPage: null,
      paymentMethod: pickPaymentMethod(i + 10),
      createdAt: daysAgo(day),
      possibleDuplicate: false,
      isRetry: false,
    });
  }

  const refundAmounts = isBrl ? [7990, 14990] : [2990, 4990];
  for (let i = 0; i < 2; i++) {
    const day = i === 0 ? 8 : 22;
    const custIdx = (i + 12) % 15;
    events.push({
      id: `demo_evt_rf_${i}`,
      eventType: "refund",
      grossValueInCents: -refundAmounts[i],
      currency,
      baseCurrency: currency,
      baseGrossValueInCents: -refundAmounts[i],
      billingType: "recurring",
      billingReason: "refund",
      provider: "stripe",
      source: pickSource(i + 48),
      medium: null,
      campaign: null,
      productName: isBrl ? BRL_PLANS[(i + 1) % BRL_PLANS.length].name : USD_PLANS[(i + 1) % USD_PLANS.length].name,
      device: null,
      customerId: `demo_cust_${custIdx}`,
      customerName: CUSTOMER_NAMES[custIdx],
      landingPage: null,
      paymentMethod: "credit_card",
      createdAt: daysAgo(day),
      possibleDuplicate: false,
      isRetry: false,
    });
  }

  return events.sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime());
}

function buildFinancial(isBrl: boolean): DemoFinancial {
  const scale = isBrl ? 1 : 0.2;

  const grossRevenue = Math.round(4200000 * scale);
  const discounts = Math.round(180000 * scale);
  const lostRevenue = Math.round(67000 * scale);
  const totalPurchases = 28;
  const averageTicket = Math.round(grossRevenue / totalPurchases);
  const previousGross = Math.round(3780000 * scale);
  const previousPurchases = 25;

  const creditCardRevenue = Math.round(grossRevenue * 0.55);
  const pixRevenue = Math.round(grossRevenue * 0.30);
  const boletoRevenue = grossRevenue - creditCardRevenue - pixRevenue;

  const creditCardPurchases = Math.round(totalPurchases * 0.55);
  const pixPurchases = Math.round(totalPurchases * 0.30);
  const boletoPurchases = totalPurchases - creditCardPurchases - pixPurchases;

  const recurringRevenue = Math.round(grossRevenue * 0.75);
  const oneTimeRevenue = grossRevenue - recurringRevenue;

  const hosting = Math.round(85000 * scale);
  const salarios = Math.round(1500000 * scale);
  const tools = Math.round(49000 * scale);
  const office = Math.round(120000 * scale);
  const licenses = Math.round(35000 * scale);
  const totalFixed = hosting + salarios + tools + office + licenses;

  const gateway = Math.round(grossRevenue * 0.0499);
  const impostos = Math.round(grossRevenue * 0.06);
  const totalVariable = gateway + impostos;

  const marketingSpend = Math.round(350000 * scale);
  const operatingProfit = grossRevenue - totalFixed - totalVariable - marketingSpend;
  const netProfit = operatingProfit;
  const marginPercent = Math.round((netProfit / grossRevenue) * 1000) / 10;

  return {
    grossRevenueInCents: grossRevenue,
    totalDiscountsInCents: discounts,
    lostRevenueInCents: lostRevenue,
    averageTicketInCents: averageTicket,
    totalPurchases,
    byPaymentMethod: [
      { method: "credit_card", purchases: creditCardPurchases, revenue: creditCardRevenue, percentage: "55.0" },
      { method: "pix", purchases: pixPurchases, revenue: pixRevenue, percentage: "30.0" },
      { method: "boleto", purchases: boletoPurchases, revenue: boletoRevenue, percentage: "15.0" },
    ],
    revenueByBillingType: { recurring: recurringRevenue, oneTime: oneTimeRevenue },
    pl: {
      grossRevenueInCents: grossRevenue,
      totalFixedCostsInCents: totalFixed,
      totalVariableCostsInCents: totalVariable,
      marketingSpendInCents: marketingSpend,
      operatingProfitInCents: operatingProfit,
      netProfitInCents: netProfit,
      marginPercent,
      fixedCostsBreakdown: [
        { name: "Hosting", amountInCents: hosting, calculatedInCents: hosting, type: "fixed" },
        { name: "Salários", amountInCents: salarios, calculatedInCents: salarios, type: "fixed" },
        { name: "Ferramentas", amountInCents: tools, calculatedInCents: tools, type: "fixed" },
        { name: "Escritório", amountInCents: office, calculatedInCents: office, type: "fixed" },
        { name: "Licenças", amountInCents: licenses, calculatedInCents: licenses, type: "fixed" },
      ],
      variableCostsBreakdown: [
        { name: "Gateway (4.99%)", amountInCents: 499, calculatedInCents: gateway, type: "percentage" },
        { name: "Impostos (6%)", amountInCents: 600, calculatedInCents: impostos, type: "percentage" },
      ],
      periodDays: 30,
    },
    periodDays: 30,
    previousGrossRevenueInCents: previousGross,
    previousTotalPurchases: previousPurchases,
  };
}

function buildCosts(isBrl: boolean): DemoCosts {
  const scale = isBrl ? 1 : 0.2;
  const now = new Date();
  const currentMonth = now.toISOString().slice(0, 7);

  return {
    fixedCosts: [
      { id: "demo_fc_1", name: "Hosting", amountInCents: Math.round(85000 * scale), type: "fixed", frequency: "monthly" },
      { id: "demo_fc_2", name: "Salários", amountInCents: Math.round(1500000 * scale), type: "fixed", frequency: "monthly" },
      { id: "demo_fc_3", name: "Ferramentas", amountInCents: Math.round(49000 * scale), type: "fixed", frequency: "monthly" },
      { id: "demo_fc_4", name: "Escritório", amountInCents: Math.round(120000 * scale), type: "fixed", frequency: "monthly" },
      { id: "demo_fc_5", name: "Licenças", amountInCents: Math.round(35000 * scale), type: "fixed", frequency: "monthly" },
    ],
    variableCosts: [
      { id: "demo_vc_1", name: "Gateway (4.99%)", amountInCents: 499, type: "percentage", applyTo: "gross_revenue" },
      { id: "demo_vc_2", name: "Impostos (6%)", amountInCents: 600, type: "percentage", applyTo: "gross_revenue" },
      { id: "demo_vc_3", name: "Comissão vendas (3%)", amountInCents: 300, type: "percentage", applyTo: "gross_revenue" },
    ],
    marketingSpends: [
      { id: "demo_ms_1", source: "google", sourceLabel: "Google Ads", amountInCents: Math.round(150000 * scale), spentAt: currentMonth },
      { id: "demo_ms_2", source: "instagram", sourceLabel: "Instagram Ads", amountInCents: Math.round(95000 * scale), spentAt: currentMonth },
      { id: "demo_ms_3", source: "facebook", sourceLabel: "Facebook Ads", amountInCents: Math.round(65000 * scale), spentAt: currentMonth },
      { id: "demo_ms_4", source: "email", sourceLabel: "E-mail Marketing", amountInCents: Math.round(25000 * scale), spentAt: currentMonth },
      { id: "demo_ms_5", source: "direct", sourceLabel: "Offline / Direto", amountInCents: Math.round(15000 * scale), spentAt: currentMonth },
    ],
  };
}

function buildCustomers(isBrl: boolean): DemoCustomer[] {
  const plans = isBrl ? BRL_PLANS : USD_PLANS;
  const sourceList = ["google", "instagram", "facebook", "direct", "google",
    "instagram", "google", "facebook", "direct", "google",
    "instagram", "google", "facebook", "google", "direct"];

  return CUSTOMER_NAMES.map((name, i) => {
    const plan = plans[i % plans.length];
    const startDays = 30 + i * 22;
    const months = Math.max(1, Math.floor(startDays / 30));
    return {
      id: `demo_cust_row_${i}`,
      customerId: `demo_cust_${i}`,
      name,
      email: `${name.toLowerCase().replace(/\s+/g, ".")}@example.com`,
      firstSource: sourceList[i],
      firstDevice: pickDevice(i),
      firstLandingPage: LANDING_PAGES[i % LANDING_PAGES.length],
      firstSeenAt: daysAgo(startDays + 5),
      lastSeenAt: daysAgo(Math.min(i, 3)),
      totalRevenueInCents: plan.cents * months,
      purchaseCount: months,
    };
  });
}

function buildChannels(isBrl: boolean): DemoChannelData {
  const scale = isBrl ? 1 : 0.2;

  const channelData = [
    { channel: "google", revenue: 1850000, customers: 6, investment: 150000, visits: 500, signups: 36, checkouts: 18, purchases: 12 },
    { channel: "instagram", revenue: 1230000, customers: 4, investment: 95000, visits: 300, signups: 22, checkouts: 11, purchases: 7 },
    { channel: "facebook", revenue: 680000, customers: 3, investment: 65000, visits: 200, signups: 14, checkouts: 7, purchases: 5 },
    { channel: "direct", revenue: 320000, customers: 1, investment: 15000, visits: 150, signups: 9, checkouts: 4, purchases: 3 },
    { channel: "email", revenue: 120000, customers: 1, investment: 25000, visits: 50, signups: 4, checkouts: 2, purchases: 1 },
  ];

  const totalRevenue = Math.round(4200000 * scale);

  const data = channelData.map((ch) => {
    const rev = Math.round(ch.revenue * scale);
    const inv = Math.round(ch.investment * scale);
    const ticket = ch.purchases > 0 ? Math.round(rev / ch.purchases) : 0;
    const convRate = ch.visits > 0 ? ((ch.purchases / ch.visits) * 100).toFixed(1) : "0.0";
    const roi = inv > 0 ? Math.round(((rev - inv) / inv) * 100) / 100 : null;
    const cac = ch.customers > 0 ? Math.round(inv / ch.customers) : null;
    const avgLtv = ch.customers > 0 ? Math.round(rev / ch.customers) : 0;
    return {
      channel: ch.channel,
      revenue: rev,
      ticket_medio: ticket,
      conversion_rate: convRate,
      investment: inv,
      roi,
      customersCount: ch.customers,
      cac,
      avgLtv,
      steps: { pageview: ch.visits, signup: ch.signups, checkout: ch.checkouts, purchase: ch.purchases },
    };
  });

  const top2 = data.slice(0, 2).reduce((s, c) => s + c.revenue, 0);
  const concentration = Math.round((top2 / totalRevenue) * 1000) / 10;

  return {
    data,
    totalRevenue,
    channelsWithRevenue: 5,
    topChannel: "google",
    concentrationTop2: concentration,
  };
}

function buildFunnel(isBrl: boolean): DemoFunnelData {
  const scale = isBrl ? 1 : 0.2;
  const revenue = Math.round(4200000 * scale);
  const previousRevenue = Math.round(3780000 * scale);

  return {
    steps: [
      { key: "pageview", label: "Visualizações", value: 1200 },
      { key: "signup", label: "Cadastros", value: 85 },
      { key: "checkout", label: "Checkouts", value: 42 },
      { key: "purchase", label: "Compras", value: 28 },
    ],
    rates: [
      { key: "pageview_to_signup", label: "Visualização → Cadastro", value: "7.1" },
      { key: "signup_to_checkout", label: "Cadastro → Checkout", value: "49.4" },
      { key: "checkout_to_purchase", label: "Checkout → Compra", value: "66.7" },
    ],
    revenue,
    ticketMedio: Math.round(revenue / 28),
    checkoutAbandoned: 14,
    previousSteps: [
      { key: "pageview", value: 1090 },
      { key: "signup", value: 77 },
      { key: "checkout", value: 38 },
      { key: "purchase", value: 25 },
    ],
    previousRevenue,
  };
}

function buildDaily(isBrl: boolean): DemoDailyEntry[] {
  const scale = isBrl ? 1 : 0.2;
  const avgPageviews = 40;
  const avgSignups = 2.8;
  const avgCheckouts = 1.4;
  const avgPurchases = 0.93;
  const avgRevenue = Math.round((4200000 / 30) * scale);
  const entries: DemoDailyEntry[] = [];

  const fluctuations = [
    0.82, 1.15, 0.91, 1.08, 1.22, 0.88, 0.95,
    1.12, 0.85, 1.18, 1.05, 0.92, 0.80, 1.10,
    1.20, 0.87, 1.02, 0.94, 1.16, 1.08, 0.83,
    0.96, 1.14, 1.06, 0.89, 1.19, 0.93, 1.11,
    0.86, 1.07,
  ];

  for (let i = 0; i < 30; i++) {
    const f = fluctuations[i];
    const d = daysAgo(29 - i);
    entries.push({
      date: d.toISOString().slice(0, 10),
      steps: {
        pageview: Math.round(avgPageviews * f),
        signup: Math.max(0, Math.round(avgSignups * f)),
        checkout: Math.max(0, Math.round(avgCheckouts * f)),
        purchase: Math.max(0, Math.round(avgPurchases * f)),
      },
      revenue: Math.round(avgRevenue * f),
    });
  }

  return entries;
}

function buildSourceDistribution(isBrl: boolean): DemoSourceDistribution {
  const scale = isBrl ? 1 : 0.2;
  const total = 1200;
  return {
    sources: [
      { source: "google", count: 500, percentage: 42, revenueInCents: Math.round(1850000 * scale) },
      { source: "instagram", count: 300, percentage: 25, revenueInCents: Math.round(1230000 * scale) },
      { source: "facebook", count: 200, percentage: 17, revenueInCents: Math.round(680000 * scale) },
      { source: "direct", count: 200, percentage: 16, revenueInCents: Math.round(440000 * scale) },
    ],
    total,
  };
}

function buildTopProducts(isBrl: boolean): DemoTopProduct[] {
  const scale = isBrl ? 1 : 0.2;
  return [
    { productName: "Curso Completo", purchases: 8, revenueInCents: Math.round(1520000 * scale) },
    { productName: "Mentoria VIP", purchases: 5, revenueInCents: Math.round(1280000 * scale) },
    { productName: "Starter Pack", purchases: 7, revenueInCents: Math.round(750000 * scale) },
    { productName: "Workshop", purchases: 5, revenueInCents: Math.round(420000 * scale) },
    { productName: "E-book", purchases: 3, revenueInCents: Math.round(230000 * scale) },
  ];
}

function buildPages(isBrl: boolean): DemoPageData {
  const scale = isBrl ? 1 : 0.2;

  const pagesRaw = [
    { page: "/", visits: 400, signups: 20, checkouts: 8, purchases: 5, revenue: 980000 },
    { page: "/pricing", visits: 180, signups: 18, checkouts: 12, purchases: 8, revenue: 1250000 },
    { page: "/features", visits: 150, signups: 10, checkouts: 5, purchases: 3, revenue: 480000 },
    { page: "/blog/growth-tips", visits: 120, signups: 8, checkouts: 3, purchases: 2, revenue: 290000 },
    { page: "/signup", visits: 100, signups: 12, checkouts: 6, purchases: 4, revenue: 520000 },
    { page: "/webinar", visits: 90, signups: 9, checkouts: 5, purchases: 3, revenue: 380000 },
    { page: "/demo", visits: 80, signups: 5, checkouts: 2, purchases: 2, revenue: 200000 },
    { page: "/case-studies", visits: 80, signups: 3, checkouts: 1, purchases: 1, revenue: 100000 },
  ];

  const totalRevenue = Math.round(4200000 * scale);

  const data = pagesRaw.map((p) => ({
    page: p.page,
    revenue: Math.round(p.revenue * scale),
    conversion_rate: p.visits > 0 ? ((p.purchases / p.visits) * 100).toFixed(1) : "0.0",
    steps: { pageview: p.visits, signup: p.signups, checkout: p.checkouts, purchase: p.purchases },
  }));

  const scatterData = pagesRaw.map((p) => ({
    page: p.page,
    visits: p.visits,
    conversionRate: p.visits > 0 ? Math.round((p.purchases / p.visits) * 1000) / 10 : 0,
    revenue: Math.round(p.revenue * scale),
  }));

  const bestPage = data.reduce((best, cur) =>
    parseFloat(cur.conversion_rate) > parseFloat(best.conversion_rate) ? cur : best
  );

  const opportunityPage = pagesRaw.reduce((best, cur) => {
    const curConv = cur.visits > 0 ? cur.purchases / cur.visits : 0;
    const bestConv = best.visits > 0 ? best.purchases / best.visits : 0;
    return cur.visits > best.visits && curConv < bestConv ? cur : best;
  });

  return {
    data,
    totalPages: 8,
    pagesWithRevenue: 8,
    totalRevenue,
    bestConversionPage: bestPage.page,
    bestConversionRate: bestPage.conversion_rate,
    biggestOpportunityPage: opportunityPage.page,
    biggestOpportunityVisits: opportunityPage.visits,
    scatterData,
  };
}

const brlData: DemoData = {
  mrrOverview: buildMrrOverview(true),
  mrrMovement: buildMrrMovement(true),
  mrrGrowth: buildMrrGrowth(true),
  activeSubscriptions: buildActiveSubscriptions(true),
  events: buildEvents(true),
  financial: buildFinancial(true),
  costs: buildCosts(true),
  customers: buildCustomers(true),
  channels: buildChannels(true),
  funnel: buildFunnel(true),
  daily: buildDaily(true),
  sourceDistribution: buildSourceDistribution(true),
  topProducts: buildTopProducts(true),
  pages: buildPages(true),
};

const usdData: DemoData = {
  mrrOverview: buildMrrOverview(false),
  mrrMovement: buildMrrMovement(false),
  mrrGrowth: buildMrrGrowth(false),
  activeSubscriptions: buildActiveSubscriptions(false),
  events: buildEvents(false),
  financial: buildFinancial(false),
  costs: buildCosts(false),
  customers: buildCustomers(false),
  channels: buildChannels(false),
  funnel: buildFunnel(false),
  daily: buildDaily(false),
  sourceDistribution: buildSourceDistribution(false),
  topProducts: buildTopProducts(false),
  pages: buildPages(false),
};

export function getDemoData(currency: string): DemoData {
  return currency === "BRL" ? brlData : usdData;
}

export type {
  DemoData,
  DemoEvent,
  DemoFinancial,
  DemoCosts,
  DemoCustomer,
  DemoChannelData,
  DemoFunnelData,
  DemoDailyEntry,
  DemoSourceDistribution,
  DemoTopProduct,
  DemoPageData,
};
