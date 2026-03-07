"use client";

import { useState } from "react";
import { useTranslations } from "next-intl";
import {
  IconBell,
  IconClock,
  IconTrendingDown,
  IconLoader2,
  IconCheck,
  IconInfoCircle,
} from "@tabler/icons-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Skeleton } from "@/components/ui/skeleton";
import { cn } from "@/lib/utils";
import { useAlertConfigs } from "@/hooks/queries/use-alert-configs";
import { useUpsertAlertConfig } from "@/hooks/mutations/use-upsert-alert-config";
import type { AlertType } from "@/db/schema/alert-config.schema";
import toast from "react-hot-toast";

interface AlertCardConfig {
  type: AlertType;
  label: string;
  description: string;
  thresholdLabel: string;
  thresholdPlaceholder: string;
  thresholdSuffix: string;
  icon: React.ReactNode;
  defaultThreshold: number;
}

interface AlertCardProps {
  config: AlertCardConfig;
  orgId: string;
  existing?: {
    id: string;
    threshold: number;
    isActive: boolean;
    channelEmail: boolean;
  };
}

function AlertCard({ config, orgId, existing }: AlertCardProps) {
  const t = useTranslations("settings.notifications");
  const [isActive, setIsActive] = useState(existing?.isActive ?? false);
  const [threshold, setThreshold] = useState(
    String(existing?.threshold ?? config.defaultThreshold),
  );
  const [channelEmail, setChannelEmail] = useState(
    existing?.channelEmail ?? true,
  );
  const [saved, setSaved] = useState(false);
  const upsert = useUpsertAlertConfig(orgId);

  const isDirty =
    isActive !== (existing?.isActive ?? false) ||
    Number(threshold) !== (existing?.threshold ?? config.defaultThreshold) ||
    channelEmail !== (existing?.channelEmail ?? true);

  const handleSave = async () => {
    const thresholdNum = parseFloat(threshold);
    if (isNaN(thresholdNum) || thresholdNum <= 0) {
      toast.error(t("errorInvalidThreshold"));
      return;
    }
    await upsert.mutateAsync({
      organizationId: orgId,
      type: config.type,
      threshold: thresholdNum,
      isActive,
      channelEmail,
    });
    setSaved(true);
    setTimeout(() => setSaved(false), 2000);
    toast.success(t("alertSavedToast", { label: config.label }));
  };

  return (
    <div
      className={cn(
        "rounded-xl border bg-zinc-900/50 overflow-hidden transition-all",
        isActive ? "border-zinc-700" : "border-zinc-800",
      )}
    >
      <div className="flex items-start justify-between gap-3 p-4 border-b border-zinc-800">
        <div className="flex items-start gap-3">
          <div
            className={cn(
              "flex h-8 w-8 items-center justify-center rounded-lg shrink-0 mt-0.5",
              isActive ? "bg-indigo-600/20" : "bg-zinc-800",
            )}
          >
            <span className={isActive ? "text-indigo-400" : "text-zinc-600"}>
              {config.icon}
            </span>
          </div>
          <div>
            <p className="text-sm font-bold text-zinc-100">{config.label}</p>
            <p className="text-xs text-zinc-500 mt-0.5 leading-relaxed">
              {config.description}
            </p>
          </div>
        </div>

        <label className="relative inline-flex items-center cursor-pointer shrink-0 mt-0.5">
          <input
            type="checkbox"
            checked={isActive}
            onChange={(e) => setIsActive(e.target.checked)}
            className="sr-only peer"
          />
          <div className="w-9 h-5 bg-zinc-700 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:rounded-full after:h-4 after:w-4 after:transition-all peer-checked:bg-indigo-600" />
        </label>
      </div>

      <div
        className={cn(
          "p-4 space-y-3 transition-all",
          !isActive && "opacity-40 pointer-events-none",
        )}
      >
        <div className="flex flex-wrap items-center gap-3">
          <div className="space-y-1.5">
            <label className="text-[11px] text-zinc-500 uppercase tracking-wider font-medium">
              {config.thresholdLabel}
            </label>
            <div className="flex items-center gap-1.5">
              <Input
                type="number"
                value={threshold}
                onChange={(e) => setThreshold(e.target.value)}
                placeholder={config.thresholdPlaceholder}
                min="0"
                className="h-8 w-24 bg-zinc-900 border-zinc-700 text-zinc-200 text-xs focus-visible:ring-indigo-500 focus-visible:border-indigo-500"
              />
              <span className="text-xs text-zinc-500">{config.thresholdSuffix}</span>
            </div>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <input
            type="checkbox"
            id={`email-${config.type}`}
            checked={channelEmail}
            onChange={(e) => setChannelEmail(e.target.checked)}
            className="accent-indigo-500 h-3.5 w-3.5 cursor-pointer"
          />
          <label
            htmlFor={`email-${config.type}`}
            className="text-xs text-zinc-400 cursor-pointer select-none"
          >
            {t("notifyByEmail")}
          </label>
        </div>

        {isDirty && (
          <div className="flex justify-end pt-1">
            <Button
              size="sm"
              onClick={handleSave}
              disabled={upsert.isPending}
              className="h-7 bg-indigo-600 hover:bg-indigo-500 text-white text-xs gap-1.5"
            >
              {upsert.isPending ? (
                <IconLoader2 size={12} className="animate-spin" />
              ) : saved ? (
                <IconCheck size={12} className="text-emerald-300" />
              ) : (
                <IconCheck size={12} />
              )}
              {saved ? t("saved") : t("save")}
            </Button>
          </div>
        )}
      </div>
    </div>
  );
}

interface NotificationsSectionProps {
  orgId: string;
}

export function NotificationsSection({ orgId }: NotificationsSectionProps) {
  const t = useTranslations("settings.notifications");
  const { data: configs, isLoading } = useAlertConfigs(orgId);

  const ALERT_CARD_CONFIGS: AlertCardConfig[] = [
    {
      type: "no_events",
      label: t("noEventsLabel"),
      description: t("noEventsDescription"),
      thresholdLabel: t("noEventsThresholdLabel"),
      thresholdPlaceholder: "6",
      thresholdSuffix: t("noEventsSuffix"),
      icon: <IconClock size={16} />,
      defaultThreshold: 6,
    },
    {
      type: "churn_rate",
      label: t("churnRateLabel"),
      description: t("churnRateDescription"),
      thresholdLabel: t("churnRateThresholdLabel"),
      thresholdPlaceholder: "10",
      thresholdSuffix: t("churnRateSuffix"),
      icon: <IconTrendingDown size={16} />,
      defaultThreshold: 10,
    },
    {
      type: "revenue_drop",
      label: t("revenueDropLabel"),
      description: t("revenueDropDescription"),
      thresholdLabel: t("revenueDropThresholdLabel"),
      thresholdPlaceholder: "20",
      thresholdSuffix: t("revenueDropSuffix"),
      icon: <IconTrendingDown size={16} />,
      defaultThreshold: 20,
    },
  ];

  const existingByType = configs?.reduce(
    (acc, c) => {
      acc[c.type] = c;
      return acc;
    },
    {} as Record<
      string,
      {
        id: string;
        threshold: number;
        isActive: boolean;
        channelEmail: boolean;
      }
    >,
  );

  return (
    <div className="rounded-xl border border-zinc-800 bg-zinc-900/50 overflow-hidden">
      <div className="flex items-center gap-3 p-5 border-b border-zinc-800">
        <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-indigo-600/20">
          <IconBell size={14} className="text-indigo-400" />
        </div>
        <div>
          <h3 className="text-sm font-bold text-zinc-100">{t("title")}</h3>
          <p className="text-xs text-zinc-500 mt-0.5">
            {t("description")}
          </p>
        </div>
      </div>

      <div className="p-5 space-y-3">
        <div className="flex items-start gap-2 rounded-lg border border-zinc-800/60 bg-zinc-900/40 px-3 py-2.5">
          <IconInfoCircle size={13} className="text-zinc-600 mt-0.5 shrink-0" />
          <p className="text-[11px] text-zinc-600 leading-relaxed">
            {t("infoText")}
          </p>
        </div>

        {isLoading ? (
          <div className="space-y-3">
            {Array.from({ length: 3 }).map((_, i) => (
              <Skeleton key={i} className="h-28 w-full rounded-xl bg-zinc-800" />
            ))}
          </div>
        ) : (
          <div className="space-y-3">
            {ALERT_CARD_CONFIGS.map((config) => (
              <AlertCard
                key={config.type}
                config={config}
                orgId={orgId}
                existing={existingByType?.[config.type]}
              />
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
