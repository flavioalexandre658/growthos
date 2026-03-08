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

export const CHECKLIST_ITEMS: ChecklistItem[] = [
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
    href: "settings/installation",
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
