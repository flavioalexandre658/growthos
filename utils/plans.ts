export type PlanSlug = "free" | "starter" | "pro" | "scale";

export interface IPlanTier {
  slug: PlanSlug;
  name: string;
  maxOrgs: number;
  maxEventsPerMonth: number;
  priceBrlCents: number;
  priceUsdCents: number;
  stripePriceId: {
    brl: string | null;
    usd: string | null;
  };
  features: string[];
}

export const PLANS: Record<PlanSlug, IPlanTier> = {
  free: {
    slug: "free",
    name: "Free",
    maxOrgs: 1,
    maxEventsPerMonth: 50_000,
    priceBrlCents: 0,
    priceUsdCents: 0,
    stripePriceId: { brl: null, usd: null },
    features: [
      "1 organização",
      "50k eventos/mês",
      "Dashboard completo",
      "Rastreamento de funil",
    ],
  },
  starter: {
    slug: "starter",
    name: "Starter",
    maxOrgs: 1,
    maxEventsPerMonth: 250_000,
    priceBrlCents: 4900,
    priceUsdCents: 900,
    stripePriceId: {
      brl: process.env.STRIPE_PRICE_STARTER_BRL ?? "price_1T84jELEMla6y3l2HGzZd4Pf",
      usd: process.env.STRIPE_PRICE_STARTER_USD ?? "price_1T84jFLEMla6y3l2pH9PrugY",
    },
    features: [
      "1 organização",
      "250k eventos/mês",
      "Dashboard completo",
      "Análise de canais",
      "Relatórios de receita",
    ],
  },
  pro: {
    slug: "pro",
    name: "Pro",
    maxOrgs: 3,
    maxEventsPerMonth: 1_000_000,
    priceBrlCents: 14900,
    priceUsdCents: 2900,
    stripePriceId: {
      brl: process.env.STRIPE_PRICE_PRO_BRL ?? "price_1T84jFLEMla6y3l2tYkehFAS",
      usd: process.env.STRIPE_PRICE_PRO_USD ?? "price_1T84jGLEMla6y3l2hRXqgx5z",
    },
    features: [
      "3 organizações",
      "1M eventos/mês compartilhados",
      "Dashboard completo",
      "Análise de canais",
      "Relatórios de receita",
      "Análise de IA",
      "Relatórios de LTV",
    ],
  },
  scale: {
    slug: "scale",
    name: "Scale",
    maxOrgs: Infinity,
    maxEventsPerMonth: 5_000_000,
    priceBrlCents: 49900,
    priceUsdCents: 9900,
    stripePriceId: {
      brl: process.env.STRIPE_PRICE_SCALE_BRL ?? "price_1T84jHLEMla6y3l2UBMueu5s",
      usd: process.env.STRIPE_PRICE_SCALE_USD ?? "price_1T84jHLEMla6y3l2z7j3nhcX",
    },
    features: [
      "Organizações ilimitadas",
      "5M eventos/mês compartilhados",
      "Dashboard completo",
      "Análise de canais",
      "Relatórios de receita",
      "Análise de IA",
      "Relatórios de LTV",
      "Suporte prioritário",
    ],
  },
};

export const PLANS_LIST: IPlanTier[] = Object.values(PLANS);

export function getPlan(slug: string): IPlanTier {
  return PLANS[slug as PlanSlug] ?? PLANS.free;
}

export function formatEventsLimit(limit: number): string {
  if (limit >= 1_000_000) return `${limit / 1_000_000}M`;
  if (limit >= 1_000) return `${limit / 1_000}k`;
  return String(limit);
}
