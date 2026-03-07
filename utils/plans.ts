export type PlanSlug = "free" | "starter" | "pro" | "scale";

export interface IPlanFeature {
  label: string;
  included: boolean;
  highlight?: boolean;
}

export interface IPlanTier {
  slug: PlanSlug;
  name: string;
  maxOrgs: number;
  maxMembers: number;
  maxRevenuePerMonthBrl: number;
  maxRevenuePerMonthUsd: number;
  maxHistoryDays: number;
  priceBrlCents: number;
  priceUsdCents: number;
  color: string;
  popular?: boolean;
  hasAiAnalysis: boolean;
  hasAdvancedIntegrations: boolean;
  hasMultipleOrgs: boolean;
  stripePriceId: {
    brl: string | null;
    usd: string | null;
  };
  features: string[];
  featuresBrl: IPlanFeature[];
  featuresUsd: IPlanFeature[];
  descriptionBrl: string;
  descriptionUsd: string;
}

export const PLANS: Record<PlanSlug, IPlanTier> = {
  free: {
    slug: "free",
    name: "Free",
    maxOrgs: 1,
    maxMembers: 1,
    maxRevenuePerMonthBrl: 1_500_000,
    maxRevenuePerMonthUsd: 300_000,
    maxHistoryDays: 30,
    priceBrlCents: 0,
    priceUsdCents: 0,
    color: "#6b7280",
    hasAiAnalysis: false,
    hasAdvancedIntegrations: false,
    hasMultipleOrgs: false,
    stripePriceId: { brl: null, usd: null },
    descriptionBrl: "Para quem está começando",
    descriptionUsd: "For early-stage products",
    features: [
      "1 organização",
      "1 membro",
      "Até R$ 15k receita/mês",
      "Integração Stripe",
    ],
    featuresBrl: [
      { label: "1 organização", included: true },
      { label: "1 membro", included: true },
      { label: "Até R$ 15k receita/mês", included: true },
      { label: "Integração Stripe", included: true, highlight: true },
      { label: "MRR & Recorrência", included: true, highlight: true },
      { label: "Dashboard completo", included: true },
      { label: "Histórico 30 dias", included: true },
      { label: "Análise com IA", included: false },
      { label: "Asaas/Kiwify/Hotmart", included: false },
      { label: "Múltiplas organizações", included: false },
    ],
    featuresUsd: [
      { label: "1 organization", included: true },
      { label: "1 member", included: true },
      { label: "Up to $3k revenue/mo", included: true },
      { label: "Stripe integration", included: true, highlight: true },
      { label: "MRR & Recurring", included: true, highlight: true },
      { label: "Full dashboard", included: true },
      { label: "30-day history", included: true },
      { label: "AI analysis", included: false },
      { label: "Asaas/Kiwify/Hotmart", included: false },
      { label: "Multiple organizations", included: false },
    ],
  },
  starter: {
    slug: "starter",
    name: "Starter",
    maxOrgs: 1,
    maxMembers: 3,
    maxRevenuePerMonthBrl: 8_000_000,
    maxRevenuePerMonthUsd: 1_500_000,
    maxHistoryDays: 365,
    priceBrlCents: 14900,
    priceUsdCents: 4900,
    color: "#818cf8",
    hasAiAnalysis: true,
    hasAdvancedIntegrations: true,
    hasMultipleOrgs: false,
    stripePriceId: {
      brl: process.env.STRIPE_PRICE_STARTER_BRL ?? "price_1T84jELEMla6y3l2HGzZd4Pf",
      usd: process.env.STRIPE_PRICE_STARTER_USD ?? "price_1T84jFLEMla6y3l2pH9PrugY",
    },
    descriptionBrl: "Para SaaS em crescimento",
    descriptionUsd: "For growing SaaS products",
    features: [
      "1 organização",
      "3 membros",
      "Até R$ 80k receita/mês",
      "Análise com IA",
    ],
    featuresBrl: [
      { label: "1 organização", included: true },
      { label: "3 membros", included: true },
      { label: "Até R$ 80k receita/mês", included: true },
      { label: "Integração Stripe", included: true, highlight: true },
      { label: "MRR & Recorrência", included: true, highlight: true },
      { label: "Dashboard completo", included: true },
      { label: "Histórico 12 meses", included: true },
      { label: "Análise com IA", included: true, highlight: true },
      { label: "Asaas/Kiwify/Hotmart", included: true, highlight: true },
      { label: "Múltiplas organizações", included: false },
    ],
    featuresUsd: [
      { label: "1 organization", included: true },
      { label: "3 members", included: true },
      { label: "Up to $15k revenue/mo", included: true },
      { label: "Stripe integration", included: true, highlight: true },
      { label: "MRR & Recurring", included: true, highlight: true },
      { label: "Full dashboard", included: true },
      { label: "12-month history", included: true },
      { label: "AI analysis", included: true, highlight: true },
      { label: "Asaas/Kiwify/Hotmart", included: true, highlight: true },
      { label: "Multiple organizations", included: false },
    ],
  },
  pro: {
    slug: "pro",
    name: "Pro",
    maxOrgs: 3,
    maxMembers: 10,
    maxRevenuePerMonthBrl: 30_000_000,
    maxRevenuePerMonthUsd: 6_000_000,
    maxHistoryDays: 730,
    priceBrlCents: 39900,
    priceUsdCents: 9900,
    color: "#a78bfa",
    popular: true,
    hasAiAnalysis: true,
    hasAdvancedIntegrations: true,
    hasMultipleOrgs: true,
    stripePriceId: {
      brl: process.env.STRIPE_PRICE_PRO_BRL ?? "price_1T84jFLEMla6y3l2tYkehFAS",
      usd: process.env.STRIPE_PRICE_PRO_USD ?? "price_1T84jGLEMla6y3l2hRXqgx5z",
    },
    descriptionBrl: "Para times e múltiplos produtos",
    descriptionUsd: "For teams & multiple products",
    features: [
      "3 organizações",
      "10 membros",
      "Até R$ 300k receita/mês",
      "Análise com IA",
    ],
    featuresBrl: [
      { label: "3 organizações", included: true },
      { label: "10 membros", included: true },
      { label: "Até R$ 300k receita/mês", included: true },
      { label: "Integração Stripe", included: true, highlight: true },
      { label: "MRR & Recorrência", included: true, highlight: true },
      { label: "Dashboard completo", included: true },
      { label: "Histórico 24 meses", included: true },
      { label: "Análise com IA", included: true, highlight: true },
      { label: "Todas as integrações", included: true, highlight: true },
      { label: "Múltiplas organizações", included: true },
    ],
    featuresUsd: [
      { label: "3 organizations", included: true },
      { label: "10 members", included: true },
      { label: "Up to $60k revenue/mo", included: true },
      { label: "Stripe integration", included: true, highlight: true },
      { label: "MRR & Recurring", included: true, highlight: true },
      { label: "Full dashboard", included: true },
      { label: "24-month history", included: true },
      { label: "AI analysis", included: true, highlight: true },
      { label: "All integrations", included: true, highlight: true },
      { label: "Multiple organizations", included: true },
    ],
  },
  scale: {
    slug: "scale",
    name: "Scale",
    maxOrgs: Infinity,
    maxMembers: Infinity,
    maxRevenuePerMonthBrl: Infinity,
    maxRevenuePerMonthUsd: Infinity,
    maxHistoryDays: 1095,
    priceBrlCents: 89900,
    priceUsdCents: 22900,
    color: "#34d399",
    hasAiAnalysis: true,
    hasAdvancedIntegrations: true,
    hasMultipleOrgs: true,
    stripePriceId: {
      brl: process.env.STRIPE_PRICE_SCALE_BRL ?? "price_1T84jHLEMla6y3l2UBMueu5s",
      usd: process.env.STRIPE_PRICE_SCALE_USD ?? "price_1T84jHLEMla6y3l2z7j3nhcX",
    },
    descriptionBrl: "Para operações em escala",
    descriptionUsd: "For operations at scale",
    features: [
      "Orgs ilimitadas",
      "Membros ilimitados",
      "Receita ilimitada",
      "Suporte dedicado",
    ],
    featuresBrl: [
      { label: "Orgs ilimitadas", included: true },
      { label: "Membros ilimitados", included: true },
      { label: "Receita ilimitada", included: true },
      { label: "Integração Stripe", included: true, highlight: true },
      { label: "MRR & Recorrência", included: true, highlight: true },
      { label: "Dashboard completo", included: true },
      { label: "Histórico 36 meses", included: true },
      { label: "Análise com IA", included: true, highlight: true },
      { label: "Todas as integrações", included: true, highlight: true },
      { label: "Suporte dedicado", included: true },
    ],
    featuresUsd: [
      { label: "Unlimited orgs", included: true },
      { label: "Unlimited members", included: true },
      { label: "Unlimited revenue", included: true },
      { label: "Stripe integration", included: true, highlight: true },
      { label: "MRR & Recurring", included: true, highlight: true },
      { label: "Full dashboard", included: true },
      { label: "36-month history", included: true },
      { label: "AI analysis", included: true, highlight: true },
      { label: "All integrations", included: true, highlight: true },
      { label: "Dedicated support", included: true },
    ],
  },
};

export const PLANS_LIST: IPlanTier[] = Object.values(PLANS);

export function getPlan(slug: string): IPlanTier {
  return PLANS[slug as PlanSlug] ?? PLANS.free;
}

export function formatRevenueLimit(cents: number, currency: "BRL" | "USD" = "BRL"): string {
  if (cents === Infinity) return currency === "BRL" ? "Ilimitada" : "Unlimited";
  const val = cents / 100;
  const symbol = currency === "BRL" ? "R$" : "$";
  if (val >= 1_000_000) return `${symbol} ${(val / 1_000_000).toFixed(0)}M`;
  if (val >= 1_000) return `${symbol} ${(val / 1_000).toFixed(0)}k`;
  return `${symbol} ${val.toFixed(0)}`;
}

export function formatEventsLimit(limit: number): string {
  if (limit >= 1_000_000) return `${limit / 1_000_000}M`;
  if (limit >= 1_000) return `${limit / 1_000}k`;
  return String(limit);
}
