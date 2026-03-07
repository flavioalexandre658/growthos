"use client";

import { useTranslations } from "next-intl";
import { useOrganization } from "@/components/providers/organization-provider";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Skeleton } from "@/components/ui/skeleton";
import { FixedCostsTable } from "./fixed-costs-table";
import { VariableCostsTable } from "./variable-costs-table";
import { CostsImpactCards } from "./costs-impact-cards";
import { CostCompositionChart } from "./cost-composition-chart";
import { useCostsSummary } from "@/hooks/queries/use-costs-summary";

function CostsPageSkeleton() {
  return (
    <div className="space-y-4">
      <div>
        <Skeleton className="h-6 w-40 bg-zinc-800 mb-2" />
        <Skeleton className="h-4 w-72 bg-zinc-800" />
      </div>
      <div className="grid grid-cols-2 gap-3 lg:grid-cols-5">
        {Array.from({ length: 5 }).map((_, i) => (
          <div key={i} className="rounded-xl border border-zinc-800 bg-zinc-900/50 p-4 flex flex-col gap-2">
            <div className="flex items-center justify-between">
              <Skeleton className="h-3 w-24 bg-zinc-800" />
              <Skeleton className="h-7 w-7 rounded-lg bg-zinc-800" />
            </div>
            <Skeleton className="h-6 w-32 bg-zinc-800" />
            <Skeleton className="h-3 w-20 bg-zinc-800" />
          </div>
        ))}
      </div>
      <div className="rounded-xl border border-zinc-800 bg-zinc-900/50 p-5">
        <Skeleton className="h-4 w-40 bg-zinc-800 mb-4" />
        <Skeleton className="h-8 w-full rounded-lg bg-zinc-800 mb-3" />
        <div className="flex gap-4 flex-wrap">
          {Array.from({ length: 3 }).map((_, i) => (
            <Skeleton key={i} className="h-3 w-28 bg-zinc-800" />
          ))}
        </div>
      </div>
      <div className="rounded-xl border border-zinc-800 bg-zinc-900/50 overflow-hidden">
        <div className="px-5 py-4 border-b border-zinc-800">
          <Skeleton className="h-5 w-32 bg-zinc-800" />
        </div>
        {Array.from({ length: 4 }).map((_, i) => (
          <div key={i} className="border-b border-zinc-800/60 px-4 py-3 flex gap-4">
            <Skeleton className="h-4 w-40 bg-zinc-800" />
            <Skeleton className="h-4 w-24 bg-zinc-800 ml-auto" />
          </div>
        ))}
      </div>
    </div>
  );
}

export function CostsContent() {
  const t = useTranslations("finance.costsContent");
  const { organization } = useOrganization();
  const orgId = organization?.id;

  const { data: summary, isLoading: summaryLoading } = useCostsSummary(orgId);

  if (!orgId) {
    return <CostsPageSkeleton />;
  }

  return (
    <div className="space-y-4">
      <div>
        <h1 className="text-lg font-bold text-zinc-100">{t("title")}</h1>
        <p className="text-xs text-zinc-500">
          {t("subtitle")}
        </p>
      </div>

      <CostsImpactCards data={summary} isLoading={summaryLoading} />

      <CostCompositionChart data={summary} isLoading={summaryLoading} />

      <Tabs defaultValue="fixed" className="w-full">
        <TabsList className="bg-zinc-900 border border-zinc-800 h-9 mb-4">
          <TabsTrigger
            value="fixed"
            className="text-xs data-[state=active]:bg-zinc-700 data-[state=active]:text-zinc-100 text-zinc-400"
          >
            {t("fixedCostsTab")}
          </TabsTrigger>
          <TabsTrigger
            value="variable"
            className="text-xs data-[state=active]:bg-zinc-700 data-[state=active]:text-zinc-100 text-zinc-400"
          >
            {t("variableCostsTab")}
          </TabsTrigger>
        </TabsList>

        <TabsContent value="fixed">
          <FixedCostsTable organizationId={orgId} grossRevenueInCents={summary?.grossRevenueInCents} />
        </TabsContent>

        <TabsContent value="variable">
          <VariableCostsTable organizationId={orgId} grossRevenueInCents={summary?.grossRevenueInCents} />
        </TabsContent>
      </Tabs>
    </div>
  );
}
