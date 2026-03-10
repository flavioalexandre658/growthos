"use client";

import { useTranslations } from "next-intl";
import { IconEye, IconEyeOff } from "@tabler/icons-react";
import { cn } from "@/lib/utils";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { getStepColor } from "@/utils/step-colors";

interface StepOption {
  eventType: string;
  label: string;
}

export interface StepVisibilityToggleProps {
  steps: StepOption[];
  hiddenKeys: Set<string>;
  onToggle: (eventType: string) => void;
}

export function StepVisibilityToggle({
  steps,
  hiddenKeys,
  onToggle,
}: StepVisibilityToggleProps) {
  const t = useTranslations("dashboard.overview");
  const hiddenCount = steps.filter((s) => hiddenKeys.has(s.eventType)).length;
  const allStepKeys = steps.map((s) => s.eventType);

  return (
    <Popover>
      <PopoverTrigger asChild>
        <button
          className={cn(
            "flex items-center gap-1.5 rounded-lg border px-2.5 py-1.5 text-xs font-medium transition-colors",
            hiddenCount > 0
              ? "border-amber-800/40 bg-amber-950/20 text-amber-400 hover:bg-amber-950/30"
              : "border-zinc-800 bg-zinc-900/80 text-zinc-400 hover:text-zinc-100 hover:border-zinc-600"
          )}
          title={t("stepsVisibleTitle")}
        >
          <IconEye size={13} />
          <span className="hidden sm:inline">{t("stepsButton")}</span>
          {hiddenCount > 0 && (
            <span className="flex h-4 w-4 items-center justify-center rounded-full bg-amber-600/30 text-[9px] font-bold text-amber-300">
              {hiddenCount}
            </span>
          )}
        </button>
      </PopoverTrigger>
      <PopoverContent
        className="w-52 border-zinc-800 bg-zinc-900/95 p-2 shadow-xl backdrop-blur-sm"
        align="end"
        sideOffset={6}
      >
        <p className="px-1.5 pb-2 text-[10px] font-semibold uppercase tracking-wider text-zinc-600">
          {t("stepsVisibleTitle")}
        </p>
        <div className="space-y-0.5">
          {steps.map((step) => {
            const isHidden = hiddenKeys.has(step.eventType);
            const color = getStepColor(step.eventType, allStepKeys).hex;
            return (
              <button
                key={step.eventType}
                onClick={() => onToggle(step.eventType)}
                className={cn(
                  "flex w-full items-center gap-2.5 rounded-md px-2 py-1.5 text-left text-xs transition-colors",
                  isHidden
                    ? "text-zinc-600 hover:bg-zinc-800/60 hover:text-zinc-400"
                    : "text-zinc-300 hover:bg-zinc-800/60"
                )}
              >
                <span
                  className="h-2 w-2 shrink-0 rounded-full"
                  style={{ backgroundColor: isHidden ? "rgba(113,113,122,0.3)" : color }}
                />
                <span className="flex-1 truncate">{step.label}</span>
                {isHidden ? (
                  <IconEyeOff size={12} className="shrink-0 text-zinc-600" />
                ) : (
                  <IconEye size={12} className="shrink-0 text-zinc-500" />
                )}
              </button>
            );
          })}
        </div>
        {hiddenCount > 0 && (
          <>
            <div className="my-1.5 border-t border-zinc-800" />
            <button
              onClick={() =>
                steps.forEach((s) => {
                  if (hiddenKeys.has(s.eventType)) onToggle(s.eventType);
                })
              }
              className="flex w-full items-center gap-2 rounded-md px-2 py-1.5 text-xs text-indigo-400 hover:bg-zinc-800/60 transition-colors"
            >
              <IconEye size={12} className="shrink-0" />
              {t("showAll")}
            </button>
          </>
        )}
      </PopoverContent>
    </Popover>
  );
}
