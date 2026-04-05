"use client";

import { useState, useCallback } from "react";
import { useTranslations } from "next-intl";
import { useQueryClient } from "@tanstack/react-query";
import toast from "react-hot-toast";
import {
  IconClock,
  IconCheck,
  IconShieldCheck,
} from "@tabler/icons-react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { ProviderCard, StripeLogoIcon, AsaasLogoIcon } from "@/components/gateway/provider-card";
import { SyncProgress } from "@/components/gateway/sync-progress";
import type { Provider, ProviderConfig } from "@/components/gateway/provider-card";
import { syncStripeHistory } from "@/actions/integrations/sync-stripe-history.action";
import { syncAsaasHistory } from "@/actions/integrations/sync-asaas-history.action";
import { getOrgDataSourcesQueryKey } from "@/hooks/queries/use-org-data-sources";

interface ConnectGatewayModalProps {
  organizationId: string;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

const COMING_SOON_PROVIDERS = [
  {
    name: "Kiwify",
    accentColor: "#7C3AED",
    logo: <span className="text-[13px] font-bold text-[#7C3AED] leading-none">K</span>,
  },
  {
    name: "Hotmart",
    accentColor: "#F04E23",
    logo: <span className="text-[13px] font-bold text-[#F04E23] leading-none">H</span>,
  },
  {
    name: "Mercado Pago",
    accentColor: "#009EE3",
    logo: <span className="text-[13px] font-bold text-[#009EE3] leading-none">M</span>,
  },
];

export function ConnectGatewayModal({
  organizationId,
  open,
  onOpenChange,
}: ConnectGatewayModalProps) {
  const t = useTranslations("dashboard.connectModal");
  const tStripe = useTranslations("settings.integrations.stripe");
  const tAsaas = useTranslations("settings.integrations.asaas");
  const queryClient = useQueryClient();

  const [syncJobId, setSyncJobId] = useState<string | null>(null);
  const [syncDone, setSyncDone] = useState(false);

  const PROVIDER_CONFIGS: ProviderConfig[] = [
    {
      id: "asaas",
      name: "Asaas",
      accentColor: "#00BFA5",
      logo: <AsaasLogoIcon />,
      credentialLabel: tAsaas("credentialLabel"),
      credentialPlaceholder: tAsaas("credentialPlaceholder"),
      howToGetCredential: tAsaas("howToGetCredential"),
      tutorialSteps: [
        tAsaas("tutorialStep1"),
        tAsaas("tutorialStep2"),
        tAsaas("tutorialStep3"),
        tAsaas("tutorialStep4"),
      ],
      dashboardUrl: "https://app.asaas.com",
      openDashboardLabel: tAsaas("openDashboard"),
    },
    {
      id: "stripe",
      name: "Stripe",
      accentColor: "#635BFF",
      logo: <StripeLogoIcon />,
      credentialLabel: tStripe("credentialLabel"),
      credentialPlaceholder: tStripe("credentialPlaceholder"),
      howToGetCredential: tStripe("howToGetCredential"),
      tutorialSteps: [
        tStripe("tutorialStep1"),
        tStripe("tutorialStep2"),
        tStripe("tutorialStep3"),
        tStripe("tutorialStep4"),
        tStripe("tutorialStep5"),
        tStripe("tutorialStep6"),
        tStripe("tutorialStep7"),
        tStripe("tutorialStep8"),
        tStripe("tutorialStep9"),
      ],
      dashboardUrl: "https://dashboard.stripe.com/apikeys",
      openDashboardLabel: tStripe("openDashboard"),
    },
  ];

  const handleConnected = async (provider: Provider, integrationId: string) => {
    try {
      const syncFn = provider === "stripe" ? syncStripeHistory : syncAsaasHistory;
      const { jobId } = await syncFn(organizationId, integrationId);
      setSyncJobId(jobId);
    } catch {
      setSyncDone(true);
    }
  };

  const handleSyncCompleted = useCallback(() => {
    setSyncDone(true);
    queryClient.invalidateQueries({ queryKey: getOrgDataSourcesQueryKey(organizationId) });
    queryClient.invalidateQueries({ queryKey: ["organizations"] });
    toast.success(t("syncComplete"));
  }, [organizationId, queryClient, t]);

  const handleSyncFailed = useCallback(() => {
    setSyncDone(true);
    toast.error(t("syncFailed"));
  }, [t]);

  const handleClose = () => {
    onOpenChange(false);
    if (syncDone) {
      setSyncJobId(null);
      setSyncDone(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-lg bg-zinc-950 border-zinc-800">
        <DialogHeader>
          <DialogTitle className="text-zinc-100">{t("title")}</DialogTitle>
          <DialogDescription className="text-zinc-500">
            {t("subtitle")}
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 pt-2">
          <div className="flex items-center gap-2 rounded-lg border border-emerald-500/20 bg-emerald-500/5 px-3 py-2">
            <IconShieldCheck size={14} className="text-emerald-400 shrink-0" />
            <p className="text-xs text-emerald-300">{t("securityNote")}</p>
          </div>

          {syncJobId && !syncDone && (
            <SyncProgress
              jobId={syncJobId}
              onCompleted={handleSyncCompleted}
              onFailed={handleSyncFailed}
            />
          )}

          {syncDone && (
            <div className="space-y-3">
              <div className="rounded-xl border border-emerald-500/30 bg-emerald-950/20 p-4">
                <div className="flex items-center gap-2">
                  <IconCheck size={16} className="text-emerald-400" />
                  <p className="text-sm font-medium text-emerald-300">
                    {t("syncComplete")}
                  </p>
                </div>
              </div>
              <Button
                onClick={handleClose}
                className="w-full h-10 bg-indigo-600 hover:bg-indigo-500 text-white font-semibold"
              >
                {t("closeCta")}
              </Button>
            </div>
          )}

          {!syncJobId && (
            <>
              <div className="space-y-3">
                {PROVIDER_CONFIGS.map((config) => (
                  <div key={config.id} className="relative">
                    {config.id === "asaas" && (
                      <span className="absolute -top-2 right-3 z-10 rounded-full bg-emerald-600 px-2 py-0.5 text-[10px] font-bold text-white">
                        {t("mostUsedBadge")}
                      </span>
                    )}
                    <ProviderCard
                      config={config}
                      organizationId={organizationId}
                      onConnected={handleConnected}
                      disabled={!!syncJobId}
                    />
                  </div>
                ))}
              </div>

              <div className="space-y-2">
                <p className="text-[10px] font-semibold text-zinc-600 uppercase tracking-widest">
                  {t("comingSoonLabel")}
                </p>
                <div className="grid grid-cols-3 gap-2">
                  {COMING_SOON_PROVIDERS.map((provider) => (
                    <div
                      key={provider.name}
                      className="flex flex-col items-center gap-1.5 rounded-xl border border-zinc-800/60 bg-zinc-900/30 px-2 py-2.5 opacity-50"
                    >
                      <div
                        className="w-7 h-7 rounded-lg border flex items-center justify-center"
                        style={{
                          backgroundColor: `${provider.accentColor}15`,
                          borderColor: `${provider.accentColor}25`,
                        }}
                      >
                        {provider.logo}
                      </div>
                      <p className="text-[10px] font-medium text-zinc-500">
                        {provider.name}
                      </p>
                      <span className="inline-flex items-center gap-0.5 px-1.5 py-0.5 rounded-full text-[9px] font-medium bg-zinc-800 text-zinc-500 border border-zinc-700">
                        <IconClock size={8} />
                        {t("comingSoonLabel")}
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            </>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}
