import type { IFunnelStepConfig } from "@/db/schema/organization.schema";
import type { IStepMeta } from "@/interfaces/dashboard.interface";

const STEP_LABELS: Record<string, Record<string, string>> = {
  pageview: { pt: "Visitas", en: "Visits" },
  checkout_started: { pt: "Checkout Iniciado", en: "Checkout Started" },
  checkout_abandoned: { pt: "Abandonos", en: "Abandoned" },
};

function getStepLabel(eventType: string, locale: string): string {
  return STEP_LABELS[eventType]?.[locale] ?? STEP_LABELS[eventType]?.["pt"] ?? eventType;
}

function makePageviewStep(locale: string): IFunnelStepConfig {
  return { eventType: "pageview", label: getStepLabel("pageview", locale), countUnique: true };
}

function makeCheckoutStartedStep(locale: string): IFunnelStepConfig {
  return { eventType: "checkout_started", label: getStepLabel("checkout_started", locale), countUnique: false };
}

export function buildFunnelSteps(
  funnelSteps: IFunnelStepConfig[],
  locale: string = "pt"
): IFunnelStepConfig[] {
  const hasPageview = funnelSteps.some((s) => s.eventType === "pageview");
  const steps = hasPageview ? funnelSteps : [makePageviewStep(locale), ...funnelSteps];
  return steps.map((s) =>
    STEP_LABELS[s.eventType] ? { ...s, label: getStepLabel(s.eventType, locale) } : s
  );
}

export function getAllQueryEventTypes(funnelSteps: IFunnelStepConfig[]): string[] {
  const types = funnelSteps.map((s) => s.eventType);
  return [...new Set([...types, "checkout_started", "checkout_abandoned", "purchase", "renewal"])];
}

export function injectCheckoutSteps(
  funnelSteps: IFunnelStepConfig[],
  countMap: Map<string, { total: number; uniqueTotal: number }>,
  locale: string = "pt"
): IFunnelStepConfig[] {
  const result = [...funnelSteps];
  const hasCheckoutStarted = result.some((s) => s.eventType === "checkout_started");

  if (!hasCheckoutStarted && (countMap.get("checkout_started")?.total ?? 0) > 0) {
    const paymentIdx = result.findIndex((s) => s.eventType === "purchase");
    const insertAt = paymentIdx >= 0 ? paymentIdx : result.length;
    result.splice(insertAt, 0, makeCheckoutStartedStep(locale));
  }

  return result;
}

export function buildExtendedStepMeta(
  funnelSteps: IFunnelStepConfig[],
  countMap: Map<string, { total: number; uniqueTotal: number }>,
  locale: string = "pt"
): IStepMeta[] {
  const meta = funnelSteps.map((s) => ({
    key: s.eventType,
    label: STEP_LABELS[s.eventType] ? getStepLabel(s.eventType, locale) : s.label,
  }));
  const hasAbandoned = funnelSteps.some((s) => s.eventType === "checkout_abandoned");
  if (!hasAbandoned && (countMap.get("checkout_abandoned")?.total ?? 0) > 0) {
    meta.push({ key: "checkout_abandoned", label: getStepLabel("checkout_abandoned", locale) });
  }
  return meta;
}
