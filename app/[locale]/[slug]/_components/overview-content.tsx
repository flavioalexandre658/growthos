"use client";

import { Suspense } from "react";
import { useTranslations } from "next-intl";
import { useOrganization } from "@/components/providers/organization-provider";
import { useOrgDataSources } from "@/hooks/queries/use-org-data-sources";
import { useMrrOverview } from "@/hooks/queries/use-mrr-overview";
import { useMrrMovement } from "@/hooks/queries/use-mrr-movement";
import { useMrrGrowth } from "@/hooks/queries/use-mrr-growth";
import { getDemoData } from "@/lib/demo-data";
import { PeriodFilter } from "./period-filter";
import { MrrKpiCards } from "@/app/[locale]/[slug]/mrr/_components/mrr-kpi-cards";
import { SubscriberFlowSankey } from "@/app/[locale]/[slug]/mrr/_components/subscriber-flow-sankey";
import { MrrGrowthChart } from "@/app/[locale]/[slug]/mrr/_components/mrr-growth-chart";
import { MrrMovementChart } from "@/app/[locale]/[slug]/mrr/_components/mrr-movement-chart";
import { ActiveSubscriptionsTable } from "@/app/[locale]/[slug]/mrr/_components/active-subscriptions-table";
import type { IDateFilter } from "@/interfaces/dashboard.interface";

interface OverviewContentProps {
  filter: IDateFilter;
}

export function OverviewContent({ filter }: OverviewContentProps) {
  const t = useTranslations("dashboard.overview");
  const { organization } = useOrganization();
  const orgId = organization?.id;
  const currency = organization?.currency ?? "BRL";

  const { data: dataSources } = useOrgDataSources(orgId);
  const hasGateway = dataSources?.hasGateway ?? false;
  const isDemo = !hasGateway;

  const demoData = isDemo ? getDemoData(currency) : null;

  const { data: overview, isPending: overviewLoading } = useMrrOverview(orgId, filter);
  const { data: movement, isPending: movementLoading } = useMrrMovement(orgId, filter);
  const { data: growth, isPending: growthLoading } = useMrrGrowth(orgId, filter);

  const effectiveOverview = demoData?.mrrOverview ?? overview;
  const effectiveMovement = demoData?.mrrMovement ?? movement;
  const effectiveGrowth = demoData?.mrrGrowth ?? growth;
  const effectiveOverviewLoading = isDemo ? false : overviewLoading;
  const effectiveMovementLoading = isDemo ? false : movementLoading;
  const effectiveGrowthLoading = isDemo ? false : growthLoading;

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-lg font-bold text-zinc-100">{t("title")}</h1>
          <p className="text-xs text-zinc-500">{t("gatewayOnlySubtitle")}</p>
        </div>
        <Suspense>
          <PeriodFilter filter={filter} />
        </Suspense>
      </div>

      <MrrKpiCards data={effectiveOverview} isLoading={effectiveOverviewLoading} />

      <SubscriberFlowSankey data={effectiveOverview} isLoading={effectiveOverviewLoading} />

      <div className="grid grid-cols-1 gap-5 xl:grid-cols-2">
        <MrrGrowthChart data={effectiveGrowth} isLoading={effectiveGrowthLoading} />
        <MrrMovementChart data={effectiveMovement} isLoading={effectiveMovementLoading} />
      </div>

      {!isDemo && orgId && <ActiveSubscriptionsTable organizationId={orgId} />}
    </div>
  );
}
