"use client";

import { useState } from "react";
import { useTranslations } from "next-intl";
import { IconPlus, IconSettings, IconLock } from "@tabler/icons-react";
import { Button } from "@/components/ui/button";
import { useIntegrations } from "@/hooks/queries/use-integrations";
import { IntegrationDrawer } from "./integration-drawer";
import { cn } from "@/lib/utils";
import type { IntegrationDrawerConfig } from "./integration-types";

interface IntegrationCardProps {
  organizationId: string;
  config: IntegrationDrawerConfig;
}

export function IntegrationCard({ organizationId, config }: IntegrationCardProps) {
  const tc = useTranslations("settings.integrations");
  const { data: integrationsList, isLoading } = useIntegrations(organizationId);
  const integration = integrationsList?.find((i) => i.provider === config.provider) ?? null;
  const isConnected = !!integration && integration.status !== "disconnected";
  const hasError = integration?.status === "error";
  const [open, setOpen] = useState(false);

  if (isLoading) {
    return (
      <div className="rounded-2xl border border-zinc-800 bg-zinc-900/40 p-5 animate-pulse h-[180px]">
        <div className="flex items-start gap-3">
          <div className="w-11 h-11 rounded-xl bg-zinc-800" />
          <div className="flex-1 space-y-2">
            <div className="h-3 w-20 bg-zinc-800 rounded" />
            <div className="h-2.5 w-32 bg-zinc-800 rounded" />
          </div>
        </div>
      </div>
    );
  }

  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        className="group relative flex flex-col text-left rounded-2xl border border-zinc-800 bg-zinc-900/40 p-5 hover:border-zinc-700 hover:bg-zinc-900/70 transition-all"
      >
        {config.badge && !isConnected && (
          <span
            className="absolute top-3 right-3 inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-semibold border"
            style={{
              backgroundColor: `${config.accentColor}15`,
              borderColor: `${config.accentColor}30`,
              color: config.accentColor,
            }}
          >
            {config.badge}
          </span>
        )}

        <div className="flex items-start gap-3">
          <div
            className="w-11 h-11 rounded-xl border flex items-center justify-center shrink-0"
            style={{
              backgroundColor: `${config.accentColor}18`,
              borderColor: `${config.accentColor}30`,
            }}
          >
            {config.logo}
          </div>
          <div className="flex-1 min-w-0 pt-0.5">
            <p className="text-sm font-semibold text-zinc-100 truncate">{config.providerName}</p>
            <p className="text-xs text-zinc-500 truncate mt-0.5">{config.tagline}</p>
          </div>
        </div>

        <div className="mt-auto pt-5 flex items-center justify-between gap-2">
          <StatusIndicator
            isConnected={isConnected}
            hasError={hasError}
            providerAccountId={integration?.providerAccountId}
          />
          <span
            className={cn(
              "inline-flex items-center gap-1.5 text-xs font-medium px-3 py-1.5 rounded-lg border transition-colors",
              isConnected
                ? "border-zinc-700 bg-zinc-800/60 text-zinc-300 group-hover:bg-zinc-800"
                : "border-zinc-700 bg-zinc-800/60 text-zinc-200 group-hover:border-zinc-600 group-hover:bg-zinc-800",
            )}
          >
            {isConnected ? (
              <>
                <IconSettings size={13} />
                {tc("manage")}
              </>
            ) : (
              <>
                <IconPlus size={13} />
                {tc("integrate")}
              </>
            )}
          </span>
        </div>
      </button>

      <IntegrationDrawer
        organizationId={organizationId}
        config={config}
        open={open}
        onOpenChange={setOpen}
      />
    </>
  );
}

function StatusIndicator({
  isConnected,
  hasError,
  providerAccountId,
}: {
  isConnected: boolean;
  hasError: boolean;
  providerAccountId?: string | null;
}) {
  const t = useTranslations("settings.integrations.statusBadge");

  if (hasError) {
    return (
      <span className="inline-flex items-center gap-1.5 text-[11px] text-red-400 min-w-0">
        <span className="w-1.5 h-1.5 rounded-full bg-red-400 shrink-0" />
        <span className="truncate">{t("error")}</span>
      </span>
    );
  }

  if (isConnected) {
    return (
      <span className="inline-flex items-center gap-1.5 text-[11px] text-emerald-400 min-w-0">
        <span className="relative flex h-1.5 w-1.5 shrink-0">
          <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-60" />
          <span className="relative inline-flex rounded-full h-1.5 w-1.5 bg-emerald-400" />
        </span>
        <span className="truncate">
          {providerAccountId ? (
            <span className="font-mono text-zinc-500">{providerAccountId}</span>
          ) : (
            t("active")
          )}
        </span>
      </span>
    );
  }

  return (
    <span className="inline-flex items-center gap-1.5 text-[11px] text-zinc-500">
      <span className="w-1.5 h-1.5 rounded-full bg-zinc-600" />
      {t("disconnected")}
    </span>
  );
}

interface ComingSoonCardProps {
  name: string;
  tagline: string;
  accentColor: string;
  logo: React.ReactNode;
  comingSoonLabel: string;
}

export function ComingSoonCard({
  name,
  tagline,
  accentColor,
  logo,
  comingSoonLabel,
}: ComingSoonCardProps) {
  return (
    <div className="relative flex flex-col rounded-2xl border border-zinc-800/60 bg-zinc-900/20 p-5 opacity-60 cursor-not-allowed">
      <span className="absolute top-3 right-3 inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-semibold bg-zinc-800 text-zinc-500 border border-zinc-700">
        <IconLock size={10} />
        {comingSoonLabel}
      </span>

      <div className="flex items-start gap-3">
        <div
          className="w-11 h-11 rounded-xl border flex items-center justify-center shrink-0"
          style={{
            backgroundColor: `${accentColor}15`,
            borderColor: `${accentColor}25`,
          }}
        >
          {logo}
        </div>
        <div className="flex-1 min-w-0 pt-0.5">
          <p className="text-sm font-semibold text-zinc-300 truncate">{name}</p>
          <p className="text-xs text-zinc-600 truncate mt-0.5">{tagline}</p>
        </div>
      </div>

      <div className="mt-auto pt-5 flex items-center justify-between gap-2">
        <span className="inline-flex items-center gap-1.5 text-[11px] text-zinc-600">
          <span className="w-1.5 h-1.5 rounded-full bg-zinc-700" />
          {comingSoonLabel}
        </span>
        <Button
          disabled
          variant="outline"
          className="h-auto py-1.5 px-3 text-xs border-zinc-800 bg-zinc-900/40 text-zinc-600"
        >
          <IconLock size={13} className="mr-1.5" />
          {comingSoonLabel}
        </Button>
      </div>
    </div>
  );
}
