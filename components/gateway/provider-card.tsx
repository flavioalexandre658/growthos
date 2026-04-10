"use client";

import { useState } from "react";
import Image from "next/image";
import { useTranslations } from "next-intl";
import toast from "react-hot-toast";
import {
  IconChevronDown,
  IconChevronUp,
  IconCircleCheckFilled,
  IconLink,
} from "@tabler/icons-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { connectStripe } from "@/actions/integrations/connect-stripe.action";
import { connectAsaas } from "@/actions/integrations/connect-asaas.action";
import { renderInlineMarkdown } from "@/utils/inline-markdown";

export type Provider = "stripe" | "asaas";

export interface ProviderConfig {
  id: Provider;
  name: string;
  accentColor: string;
  logo: React.ReactNode;
  credentialLabel: string;
  credentialPlaceholder: string;
  howToGetCredential: string;
  tutorialSteps: string[];
  dashboardUrl: string;
  openDashboardLabel: string;
}

interface ProviderCardProps {
  config: ProviderConfig;
  organizationId: string;
  onConnected: (provider: Provider, integrationId: string) => void;
  disabled?: boolean;
}

export function AsaasLogoIcon() {
  return (
    <Image
      src="/assets/images/gateways/asaas.png"
      alt="Asaas"
      width={28}
      height={28}
      className="object-contain"
    />
  );
}

export function StripeLogoIcon() {
  return (
    <Image
      src="/assets/images/gateways/stripe.png"
      alt="Stripe"
      width={28}
      height={28}
      className="object-contain"
    />
  );
}

export function ProviderCard({
  config,
  organizationId,
  onConnected,
  disabled,
}: ProviderCardProps) {
  const t = useTranslations("onboarding.stepGateway");
  const [credential, setCredential] = useState("");
  const [isConnecting, setIsConnecting] = useState(false);
  const [connected, setConnected] = useState(false);
  const [tutorialOpen, setTutorialOpen] = useState(false);

  const handleConnect = async () => {
    const key = credential.trim();
    if (!key) return;
    setIsConnecting(true);
    try {
      const result =
        config.id === "stripe"
          ? await connectStripe(organizationId, key)
          : await connectAsaas(organizationId, key);
      if (result && "error" in result) {
        toast.error(result.error);
        return;
      }
      setConnected(true);
      setCredential("");
      toast.success(t("connectedToast"));
      onConnected(config.id, result.id);
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
          disabled={disabled}
          className="flex-1 bg-zinc-950 border-zinc-700 text-zinc-300 font-mono text-xs h-9"
        />
        <Button
          onClick={handleConnect}
          disabled={!credential.trim() || isConnecting || disabled}
          style={
            !credential.trim() || isConnecting || disabled
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
                  <span className="pt-0.5 flex-1">{renderInlineMarkdown(step)}</span>
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
              {config.openDashboardLabel}
            </a>
          </div>
        )}
      </div>
    </div>
  );
}
