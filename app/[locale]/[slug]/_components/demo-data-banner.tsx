"use client";

import { useTranslations } from "next-intl";
import { useOrgDataSources } from "@/hooks/queries/use-org-data-sources";
import { useOrganization } from "@/components/providers/organization-provider";

export function DemoDataBanner() {
  const t = useTranslations("dashboard.demoBanner");
  const { organization } = useOrganization();
  const orgId = organization?.id;

  const { data: dataSources } = useOrgDataSources(orgId);

  if (!orgId || dataSources?.hasRealData) return null;

  return (
    <div className="flex items-center justify-center gap-2 border-b border-amber-500/30 bg-amber-500/15 px-4 py-1">
      <span className="relative flex h-1.5 w-1.5 shrink-0">
        <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-amber-300 opacity-75" />
        <span className="relative inline-flex h-1.5 w-1.5 rounded-full bg-amber-300" />
      </span>
      <p className="text-[10px] font-semibold uppercase tracking-widest text-amber-200">
        {t("modeLabel")}
      </p>
    </div>
  );
}
