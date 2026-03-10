"use client";

import { useState } from "react";
import { useTranslations } from "next-intl";
import toast from "react-hot-toast";
import {
  IconBrandStripe,
  IconChevronDown,
  IconChevronUp,
  IconCircleCheckFilled,
  IconClock,
  IconArrowRight,
  IconLink,
  IconPlugConnected,
} from "@tabler/icons-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { connectStripe } from "@/actions/integrations/connect-stripe.action";
import { connectAsaas } from "@/actions/integrations/connect-asaas.action";

interface StepGatewayProps {
  organizationId: string;
  onComplete: () => void;
}

type Provider = "stripe" | "asaas";

interface ProviderConfig {
  id: Provider;
  name: string;
  accentColor: string;
  logo: React.ReactNode;
  credentialLabel: string;
  credentialPlaceholder: string;
  howToGetCredential: string;
  tutorialSteps: string[];
  dashboardUrl: string;
}

function AsaasLogoIcon() {
  return (
    <span className="text-[15px] font-bold text-[#00BFA5] leading-none tracking-tight">
      A
    </span>
  );
}

function StripeLogoIcon() {
  return <IconBrandStripe size={18} className="text-[#635BFF]" />;
}

function ProviderCard({
  config,
  organizationId,
  onConnected,
}: {
  config: ProviderConfig;
  organizationId: string;
  onConnected: (provider: Provider) => void;
}) {
  const t = useTranslations("onboarding.stepGateway");
  const tStripe = useTranslations("settings.integrations.stripe");
  const tAsaas = useTranslations("settings.integrations.asaas");
  const [credential, setCredential] = useState("");
  const [isConnecting, setIsConnecting] = useState(false);
  const [connected, setConnected] = useState(false);
  const [tutorialOpen, setTutorialOpen] = useState(false);

  const translations = config.id === "stripe" ? tStripe : tAsaas;

  const handleConnect = async () => {
    const key = credential.trim();
    if (!key) return;
    setIsConnecting(true);
    try {
      if (config.id === "stripe") {
        await connectStripe(organizationId, key);
      } else {
        await connectAsaas(organizationId, key);
      }
      setConnected(true);
      setCredential("");
      toast.success(t("connectedToast"));
      onConnected(config.id);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : t("errorToast"));
    } finally {
      setIsConnecting(false);
    }
  };

  if (connected) {
    return (
      <div
        className="rounded-xl border bg-zinc-900/50 p-4"
        style={{ borderColor: `${config.accentColor}40` }}
      >
        <div className="flex items-center gap-3">
          <div
            className="w-9 h-9 rounded-lg border flex items-center justify-center shrink-0"
            style={{
              backgroundColor: `${config.accentColor}18`,
              borderColor: `${config.accentColor}30`,
            }}
          >
            {config.logo}
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-sm font-medium text-zinc-200">{config.name}</p>
          </div>
          <div className="flex items-center gap-1.5 text-xs font-medium text-emerald-400">
            <IconCircleCheckFilled size={14} />
            {t("connectedBadge")}
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="rounded-xl border border-zinc-800 bg-zinc-900/50 p-4 space-y-3">
      <div className="flex items-center gap-3">
        <div
          className="w-9 h-9 rounded-lg border flex items-center justify-center shrink-0"
          style={{
            backgroundColor: `${config.accentColor}18`,
            borderColor: `${config.accentColor}30`,
          }}
        >
          {config.logo}
        </div>
        <div className="flex-1 min-w-0">
          <p className="text-sm font-medium text-zinc-200">{config.name}</p>
          <p className="text-xs text-zinc-500">{config.credentialLabel}</p>
        </div>
      </div>

      <div className="flex gap-2">
        <Input
          value={credential}
          onChange={(e) => setCredential(e.target.value)}
          onKeyDown={(e) => e.key === "Enter" && handleConnect()}
          placeholder={config.credentialPlaceholder}
          type="password"
          className="flex-1 bg-zinc-950 border-zinc-700 text-zinc-300 font-mono text-xs h-9"
        />
        <Button
          onClick={handleConnect}
          disabled={!credential.trim() || isConnecting}
          style={
            !credential.trim() || isConnecting
              ? undefined
              : { backgroundColor: config.accentColor }
          }
          className="shrink-0 h-9 text-white hover:opacity-90"
        >
          {isConnecting ? t("connecting") : t("connectButton")}
        </Button>
      </div>

      <div className="rounded-lg border border-zinc-800 bg-zinc-950/60 overflow-hidden">
        <button
          type="button"
          onClick={() => setTutorialOpen((o) => !o)}
          className="w-full flex items-center justify-between px-3 py-2.5 text-xs font-medium text-zinc-400 hover:text-zinc-300 hover:bg-zinc-900/50 transition-colors"
        >
          <span>{config.howToGetCredential}</span>
          {tutorialOpen ? (
            <IconChevronUp size={13} />
          ) : (
            <IconChevronDown size={13} />
          )}
        </button>
        {tutorialOpen && (
          <div className="px-3 pb-4 pt-1 space-y-2 border-t border-zinc-800">
            <ol className="space-y-2">
              {config.tutorialSteps.map((step, i) => (
                <li key={i} className="flex gap-3 text-xs text-zinc-400">
                  <span className="shrink-0 w-5 h-5 rounded-full flex items-center justify-center text-[10px] font-bold bg-zinc-800 text-zinc-500 border border-zinc-700">
                    {i + 1}
                  </span>
                  <span className="pt-0.5 flex-1">{step}</span>
                </li>
              ))}
            </ol>
            <a
              href={config.dashboardUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-1.5 text-xs mt-1 transition-colors"
              style={{ color: config.accentColor }}
            >
              <IconLink size={12} />
              {translations("openDashboard")}
            </a>
          </div>
        )}
      </div>
    </div>
  );
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

export function StepGateway({ organizationId, onComplete }: StepGatewayProps) {
  const t = useTranslations("onboarding.stepGateway");
  const tStripe = useTranslations("settings.integrations.stripe");
  const tAsaas = useTranslations("settings.integrations.asaas");
  const [connectedProviders, setConnectedProviders] = useState<Set<Provider>>(
    new Set(),
  );

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
      ],
      dashboardUrl: "https://dashboard.stripe.com/apikeys",
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
        tAsaas("tutorialStep5"),
      ],
      dashboardUrl: "https://app.asaas.com",
    },
  ];

  const handleConnected = (provider: Provider) => {
    setConnectedProviders((prev) => new Set(prev).add(provider));
  };

  const hasAnyConnected = connectedProviders.size > 0;

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

      <div className="rounded-lg border border-indigo-500/20 bg-indigo-950/10 px-4 py-3 space-y-1">
        <p className="text-xs font-semibold text-indigo-300">
          {t("calloutTitle")}
        </p>
        <p className="text-[11px] text-zinc-400 leading-relaxed">
          {t("calloutDescription")}
        </p>
      </div>

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

      <div className="flex flex-col gap-2 pt-1">
        <Button
          onClick={onComplete}
          className="w-full h-11 bg-indigo-600 hover:bg-indigo-500 text-white font-semibold gap-2 group"
        >
          {hasAnyConnected ? t("submit") : t("submit")}
          <IconArrowRight
            size={16}
            className="transition-transform group-hover:translate-x-0.5"
          />
        </Button>
        <Button
          variant="ghost"
          onClick={onComplete}
          className="w-full h-9 text-zinc-500 hover:text-zinc-300 text-sm"
        >
          {t("skip")}
        </Button>
      </div>
    </div>
  );
}
