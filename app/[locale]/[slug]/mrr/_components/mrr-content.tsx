"use client";

import { Suspense } from "react";
import { useTranslations } from "next-intl";
import { useOrganization } from "@/components/providers/organization-provider";
import { PeriodFilter } from "@/app/[locale]/[slug]/_components/period-filter";
import { MrrKpiCards } from "./mrr-kpi-cards";
import { MrrMovementChart } from "./mrr-movement-chart";
import { MrrGrowthChart } from "./mrr-growth-chart";
import { ActiveSubscriptionsTable } from "./active-subscriptions-table";
import { SubscriberFlowSankey } from "./subscriber-flow-sankey";
import { useMrrOverview } from "@/hooks/queries/use-mrr-overview";
import { useMrrMovement } from "@/hooks/queries/use-mrr-movement";
import { useMrrGrowth } from "@/hooks/queries/use-mrr-growth";
import type { IDateFilter } from "@/interfaces/dashboard.interface";

interface MrrContentProps {
  filter: IDateFilter;
}

export function MrrContent({ filter }: MrrContentProps) {
  const t = useTranslations("mrr.content");
  const { organization } = useOrganization();
  const orgId = organization?.id;

  const { data: overview, isPending: overviewLoading } = useMrrOverview(orgId, filter);
  const { data: movement, isPending: movementLoading } = useMrrMovement(orgId, filter);
  const { data: growth, isPending: growthLoading } = useMrrGrowth(orgId, filter);

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-lg font-bold text-zinc-100">{t("title")}</h1>
          <p className="text-xs text-zinc-500">
            {t("subtitle")}
          </p>
        </div>
        <Suspense>
          <PeriodFilter filter={filter} />
        </Suspense>
      </div>

      <MrrKpiCards data={overview} isLoading={overviewLoading} />

      <SubscriberFlowSankey data={overview} isLoading={overviewLoading} />

      <div className="grid grid-cols-1 gap-5 xl:grid-cols-2">
        <MrrGrowthChart data={growth} isLoading={growthLoading} />
        <MrrMovementChart data={movement} isLoading={movementLoading} />
      </div>

      {orgId && <ActiveSubscriptionsTable organizationId={orgId} />}
    </div>
  );
}
