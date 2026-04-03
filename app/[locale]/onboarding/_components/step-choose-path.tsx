"use client";

import { useTranslations } from "next-intl";
import {
  IconPlugConnected,
  IconCode,
  IconBolt,
  IconArrowRight,
} from "@tabler/icons-react";
import { cn } from "@/lib/utils";

type OnboardingPath = "gateway" | "tracker";

interface StepChoosePathProps {
  onChoose: (path: OnboardingPath) => void;
}

function PathCard({
  title,
  subtitle,
  description,
  icon: Icon,
  badges,
  recommended,
  onClick,
}: {
  title: string;
  subtitle: string;
  description: string;
  icon: React.ElementType;
  badges: { label: string; variant: "primary" | "muted" }[];
  recommended: boolean;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={cn(
        "group relative flex flex-col gap-4 rounded-xl border p-5 text-left transition-all duration-200 hover:scale-[1.01]",
        recommended
          ? "border-indigo-500/40 bg-indigo-950/20 hover:border-indigo-500/60 hover:bg-indigo-950/30 shadow-lg shadow-indigo-500/5"
          : "border-zinc-800 bg-zinc-900/50 hover:border-zinc-700 hover:bg-zinc-900/80",
      )}
    >
      <div className="flex items-center gap-3">
        <div
          className={cn(
            "flex h-10 w-10 items-center justify-center rounded-xl border",
            recommended
              ? "border-indigo-500/30 bg-indigo-600/20"
              : "border-zinc-700 bg-zinc-800/50",
          )}
        >
          <Icon
            size={20}
            className={recommended ? "text-indigo-400" : "text-zinc-400"}
          />
        </div>
        <div className="flex-1 min-w-0">
          <p className="text-sm font-semibold text-zinc-100">{title}</p>
          <p className="text-xs text-zinc-500">{subtitle}</p>
        </div>
        <IconArrowRight
          size={16}
          className={cn(
            "shrink-0 transition-transform group-hover:translate-x-0.5",
            recommended ? "text-indigo-400" : "text-zinc-600",
          )}
        />
      </div>

      <p className="text-xs text-zinc-400 leading-relaxed">{description}</p>

      <div className="flex flex-wrap gap-1.5">
        {badges.map((badge) => (
          <span
            key={badge.label}
            className={cn(
              "inline-flex items-center gap-1 rounded-full px-2.5 py-1 text-[10px] font-semibold",
              badge.variant === "primary"
                ? "bg-indigo-600/20 text-indigo-300 ring-1 ring-inset ring-indigo-600/30"
                : "bg-zinc-800 text-zinc-400 ring-1 ring-inset ring-zinc-700",
            )}
          >
            {badge.variant === "primary" && <IconBolt size={10} />}
            {badge.label}
          </span>
        ))}
      </div>
    </button>
  );
}

export function StepChoosePath({ onChoose }: StepChoosePathProps) {
  const t = useTranslations("onboarding.stepChoosePath");

  return (
    <div className="space-y-5">
      <div className="text-center space-y-1">
        <h2 className="text-lg font-bold text-zinc-100">{t("title")}</h2>
        <p className="text-xs text-zinc-500">{t("subtitle")}</p>
      </div>

      <div className="grid grid-cols-1 gap-3">
        <PathCard
          title={t("gatewayTitle")}
          subtitle={t("gatewaySubtitle")}
          description={t("gatewayDescription")}
          icon={IconPlugConnected}
          recommended
          badges={[
            { label: t("gatewayBadge"), variant: "primary" },
            { label: t("gatewayTime"), variant: "muted" },
          ]}
          onClick={() => onChoose("gateway")}
        />

        <PathCard
          title={t("trackerTitle")}
          subtitle={t("trackerSubtitle")}
          description={t("trackerDescription")}
          icon={IconCode}
          recommended={false}
          badges={[{ label: t("trackerBadge"), variant: "muted" }]}
          onClick={() => onChoose("tracker")}
        />
      </div>
    </div>
  );
}
