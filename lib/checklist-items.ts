import type { ITourProgress } from "@/interfaces/tour.interface";

export interface ChecklistItem {
  id: keyof Pick<
    ITourProgress,
    "gatewayConnected" | "trackerInstalled" | "funnelEventReceived" | "costsConfigured" | "aiExplored"
  >;
  labelKey: string;
  ctaKey?: string;
  href?: string;
  auto?: boolean;
}

export function getChecklistItems(slug: string): ChecklistItem[] {
  return [
    {
      id: "gatewayConnected",
      labelKey: "items.gateway.label",
      ctaKey: "items.gateway.cta",
      href: "settings/integrations",
    },
    {
      id: "trackerInstalled",
      labelKey: "items.tracker.label",
      ctaKey: "items.tracker.cta",
      href: `/onboarding/${slug}?step=install`,
    },
    {
      id: "funnelEventReceived",
      labelKey: "items.funnelEvent.label",
      auto: true,
    },
    {
      id: "costsConfigured",
      labelKey: "items.costs.label",
      ctaKey: "items.costs.cta",
      href: "costs",
    },
    {
      id: "aiExplored",
      labelKey: "items.ai.label",
      ctaKey: "items.ai.cta",
      href: "ai",
    },
  ];
}
