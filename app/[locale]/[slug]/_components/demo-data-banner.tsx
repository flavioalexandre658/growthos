"use client";

import { useState } from "react";
import { useTranslations } from "next-intl";
import { useOrgDataSources } from "@/hooks/queries/use-org-data-sources";
import { useOrganization } from "@/components/providers/organization-provider";
import { ConnectGatewayModal } from "./connect-gateway-modal";

export function DemoDataBanner() {
  const t = useTranslations("dashboard.demoBanner");
  const { organization } = useOrganization();
  const orgId = organization?.id;

  const { data: dataSources } = useOrgDataSources(orgId);
  const [modalOpen, setModalOpen] = useState(false);

  if (!orgId || dataSources?.hasGateway) return null;

  return (
    <>
      <div className="flex items-center gap-3 border-b border-amber-500/20 bg-amber-500/10 px-4 py-2.5">
        <span className="relative flex h-2 w-2 shrink-0">
          <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-amber-400 opacity-75" />
          <span className="relative inline-flex h-2 w-2 rounded-full bg-amber-400" />
        </span>
        <p className="flex-1 text-xs text-amber-200">{t("message")}</p>
        <button
          onClick={() => setModalOpen(true)}
          className="shrink-0 rounded-lg bg-amber-500/20 px-3 py-1.5 text-[11px] font-semibold text-amber-200 ring-1 ring-inset ring-amber-500/30 hover:bg-amber-500/30 transition-colors"
        >
          {t("cta")}
        </button>
      </div>

      <ConnectGatewayModal
        organizationId={orgId}
        open={modalOpen}
        onOpenChange={setModalOpen}
      />
    </>
  );
}
