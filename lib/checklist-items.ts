import type { ITourProgress } from "@/interfaces/tour.interface";

export interface ChecklistItem {
  id: keyof Pick<
    ITourProgress,
    "gatewayConnected" | "funnelEventReceived" | "costsConfigured" | "aiExplored"
  >;
  labelKey: string;
  ctaKey?: string;
  href?: string;
  auto?: boolean;
}

export function getChecklistItems(): ChecklistItem[] {
  return [
    {
      id: "gatewayConnected",
      labelKey: "items.gateway.label",
      ctaKey: "items.gateway.cta",
      href: "settings/integrations",
    },
    {
      id: "costsConfigured",
      labelKey: "items.costs.label",
      ctaKey: "items.costs.cta",
      href: "costs",
    },
    {
      id: "funnelEventReceived",
      labelKey: "items.channels.label",
      ctaKey: "items.channels.cta",
      href: "channels",
    },
    {
      id: "aiExplored",
      labelKey: "items.ai.label",
      ctaKey: "items.ai.cta",
      href: "ai",
    },
  ];
}
