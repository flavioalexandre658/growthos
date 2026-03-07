"use client";

import { useTranslations } from "next-intl";
import { cn } from "@/lib/utils";
import type { IntegrationStatus } from "@/interfaces/integration.interface";

interface IntegrationStatusBadgeProps {
  status: IntegrationStatus;
}

export function IntegrationStatusBadge({ status }: IntegrationStatusBadgeProps) {
  const t = useTranslations("settings.integrations.statusBadge");

  const STATUS_CONFIG: Record<
    IntegrationStatus,
    { label: string; className: string; dotClassName: string }
  > = {
    active: {
      label: t("active"),
      className: "bg-emerald-500/10 text-emerald-400 border-emerald-500/20",
      dotClassName: "bg-emerald-400",
    },
    error: {
      label: t("error"),
      className: "bg-red-500/10 text-red-400 border-red-500/20",
      dotClassName: "bg-red-400",
    },
    disconnected: {
      label: t("disconnected"),
      className: "bg-zinc-500/10 text-zinc-400 border-zinc-500/20",
      dotClassName: "bg-zinc-500",
    },
  };

  const config = STATUS_CONFIG[status];
  return (
    <span
      className={cn(
        "inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full text-xs font-medium border",
        config.className,
      )}
    >
      <span className={cn("w-1.5 h-1.5 rounded-full", config.dotClassName)} />
      {config.label}
    </span>
  );
}
