import type { IFunnelStepConfig } from "@/db/schema/organization.schema";
import type { IStepMeta } from "@/interfaces/dashboard.interface";

const PAGEVIEW_STEP: IFunnelStepConfig = {
  eventType: "pageview",
  label: "Visitas",
  countUnique: true,
};

export const CHECKOUT_STARTED_STEP: IFunnelStepConfig = {
  eventType: "checkout_started",
  label: "Checkout Iniciado",
  countUnique: false,
};

export function buildFunnelSteps(
  funnelSteps: IFunnelStepConfig[]
): IFunnelStepConfig[] {
  const hasPageview = funnelSteps.some((s) => s.eventType === "pageview");
  return hasPageview ? funnelSteps : [PAGEVIEW_STEP, ...funnelSteps];
}

export function getAllQueryEventTypes(funnelSteps: IFunnelStepConfig[]): string[] {
  const types = funnelSteps.map((s) => s.eventType);
  return [...new Set([...types, "checkout_started", "checkout_abandoned", "payment"])];
}

export function injectCheckoutSteps(
  funnelSteps: IFunnelStepConfig[],
  countMap: Map<string, { total: number; uniqueTotal: number }>
): IFunnelStepConfig[] {
  const result = [...funnelSteps];
  const hasCheckoutStarted = result.some((s) => s.eventType === "checkout_started");

  if (!hasCheckoutStarted && (countMap.get("checkout_started")?.total ?? 0) > 0) {
    const paymentIdx = result.findIndex((s) => s.eventType === "payment");
    const insertAt = paymentIdx >= 0 ? paymentIdx : result.length;
    result.splice(insertAt, 0, CHECKOUT_STARTED_STEP);
  }

  return result;
}

export function buildExtendedStepMeta(
  funnelSteps: IFunnelStepConfig[],
  countMap: Map<string, { total: number; uniqueTotal: number }>
): IStepMeta[] {
  const meta = funnelSteps.map((s) => ({ key: s.eventType, label: s.label }));
  const hasAbandoned = funnelSteps.some((s) => s.eventType === "checkout_abandoned");
  if (!hasAbandoned && (countMap.get("checkout_abandoned")?.total ?? 0) > 0) {
    meta.push({ key: "checkout_abandoned", label: "Abandonos" });
  }
  return meta;
}
