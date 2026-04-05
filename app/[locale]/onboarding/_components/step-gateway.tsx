"use client";

import { useState, useCallback } from "react";
import { useTranslations } from "next-intl";
import { useSession } from "next-auth/react";
import toast from "react-hot-toast";
import {
  IconClock,
  IconArrowRight,
  IconPlugConnected,
  IconCheck,
} from "@tabler/icons-react";
import { Button } from "@/components/ui/button";
import { ProviderCard, StripeLogoIcon, AsaasLogoIcon } from "@/components/gateway/provider-card";
import { SyncProgress } from "@/components/gateway/sync-progress";
import type { Provider, ProviderConfig } from "@/components/gateway/provider-card";
import { syncStripeHistory } from "@/actions/integrations/sync-stripe-history.action";
import { syncAsaasHistory } from "@/actions/integrations/sync-asaas-history.action";
import { completeOnboarding } from "@/actions/auth/complete-onboarding.action";
import { pushDataLayerEvent } from "@/utils/datalayer";
import { growareTrack } from "@/utils/groware";

interface StepGatewayProps {
  organizationId: string;
  slug: string;
  onComplete: () => void;
}

const COMING_SOON_PROVIDERS = [
  {
    name: "Kiwify",
    accentColor: "#7C3AED",
    logo: (
      <span className="text-[15px] font-bold text-[#7C3AED] leading-none tracking-tight">
        K
      </span>
    ),
  },
  {
    name: "Hotmart",
    accentColor: "#F04E23",
    logo: (
      <span className="text-[15px] font-bold text-[#F04E23] leading-none tracking-tight">
        H
      </span>
    ),
  },
  {
    name: "Mercado Pago",
    accentColor: "#009EE3",
    logo: (
      <span className="text-[15px] font-bold text-[#009EE3] leading-none tracking-tight">
        M
      </span>
    ),
  },
];

export function StepGateway({
  organizationId,
  slug,
  onComplete,
}: StepGatewayProps) {
  const t = useTranslations("onboarding.stepGateway");
  const tStripe = useTranslations("settings.integrations.stripe");
  const tAsaas = useTranslations("settings.integrations.asaas");
  const { data: session, update } = useSession();
  const [connectedProviders, setConnectedProviders] = useState<Set<Provider>>(
    new Set(),
  );
  const [syncJobId, setSyncJobId] = useState<string | null>(null);
  const [syncDone, setSyncDone] = useState(false);
  const [isFinishing, setIsFinishing] = useState(false);

  const PROVIDER_CONFIGS: ProviderConfig[] = [
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
  ];

  const handleConnected = async (provider: Provider, integrationId: string) => {
    setConnectedProviders((prev) => new Set(prev).add(provider));
    pushDataLayerEvent("GatewayConnectedOnboarding", { provider });

    try {
      const syncFn =
        provider === "stripe" ? syncStripeHistory : syncAsaasHistory;
      const { jobId } = await syncFn(organizationId, integrationId);
      setSyncJobId(jobId);
    } catch {
      setSyncDone(true);
    }
  };

  const handleSyncCompleted = useCallback(() => {
    setSyncDone(true);
    toast.success(t("syncComplete"));
  }, [t]);

  const handleSyncFailed = useCallback(() => {
    setSyncDone(true);
    toast.error(t("syncFailed"));
  }, [t]);

  const hasAnyConnected = connectedProviders.size > 0;

  const handleFinish = async () => {
    setIsFinishing(true);
    try {
      await completeOnboarding();
      pushDataLayerEvent("OnboardingCompleted");
      growareTrack("onboarding", {
        product_id: organizationId,
        customer_id: session?.user?.id,
      });
      await update({ onboardingCompleted: true });
      window.location.href = `/${slug}`;
    } catch {
      toast.error(t("errorToast"));
      setIsFinishing(false);
    }
  };

  return (
    <div className="space-y-5">
      <div className="flex items-center gap-2">
        <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-emerald-600/20 border border-emerald-600/30">
          <IconPlugConnected size={18} className="text-emerald-400" />
        </div>
        <div>
          <h2 className="text-lg font-bold text-zinc-100">{t("title")}</h2>
          <p className="text-xs text-zinc-500">{t("subtitle")}</p>
        </div>
      </div>

      {syncJobId && !syncDone && (
        <SyncProgress
          jobId={syncJobId}
          onCompleted={handleSyncCompleted}
          onFailed={handleSyncFailed}
        />
      )}

      {syncDone && (
        <div className="rounded-xl border border-emerald-500/30 bg-emerald-950/20 p-4">
          <div className="flex items-center gap-2">
            <IconCheck size={16} className="text-emerald-400" />
            <p className="text-sm font-medium text-emerald-300">
              {t("syncComplete")}
            </p>
          </div>
        </div>
      )}

      {!syncJobId && (
        <>
          <div className="space-y-3">
            <p className="text-[10px] font-semibold text-zinc-500 uppercase tracking-widest">
              {t("availableLabel")}
            </p>
            {PROVIDER_CONFIGS.map((config) => (
              <ProviderCard
                key={config.id}
                config={config}
                organizationId={organizationId}
                onConnected={handleConnected}
              />
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
                  className="flex flex-col items-center gap-2 rounded-xl border border-zinc-800/60 bg-zinc-900/30 px-3 py-3 opacity-50"
                >
                  <div
                    className="w-8 h-8 rounded-lg border flex items-center justify-center shrink-0"
                    style={{
                      backgroundColor: `${provider.accentColor}15`,
                      borderColor: `${provider.accentColor}25`,
                    }}
                  >
                    {provider.logo}
                  </div>
                  <div className="text-center">
                    <p className="text-xs font-medium text-zinc-400">
                      {provider.name}
                    </p>
                    <span className="inline-flex items-center gap-1 mt-1 px-1.5 py-0.5 rounded-full text-[10px] font-medium bg-zinc-800 text-zinc-500 border border-zinc-700">
                      <IconClock size={9} />
                      {t("comingSoonLabel")}
                    </span>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </>
      )}

      <div className="flex flex-col gap-2 pt-1">
        {hasAnyConnected || syncDone ? (
          <Button
            onClick={handleFinish}
            disabled={isFinishing}
            className="w-full h-11 bg-indigo-600 hover:bg-indigo-500 text-white font-semibold gap-2 group"
          >
            {isFinishing ? t("connecting") : t("goToDashboard")}
            <IconArrowRight
              size={16}
              className="transition-transform group-hover:translate-x-0.5"
            />
          </Button>
        ) : (
          <>
            <Button
              onClick={onComplete}
              className="w-full h-11 bg-indigo-600 hover:bg-indigo-500 text-white font-semibold gap-2 group"
            >
              {t("submit")}
              <IconArrowRight
                size={16}
                className="transition-transform group-hover:translate-x-0.5"
              />
            </Button>
            <Button
              variant="ghost"
              onClick={handleFinish}
              disabled={isFinishing}
              className="w-full h-9 text-zinc-500 hover:text-zinc-300 text-sm"
            >
              {t("skip")}
            </Button>
          </>
        )}
      </div>
    </div>
  );
}
