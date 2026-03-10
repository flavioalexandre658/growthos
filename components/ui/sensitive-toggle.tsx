"use client";

import { useTranslations } from "next-intl";
import { IconEyeOff, IconEye } from "@tabler/icons-react";
import { cn } from "@/lib/utils";
import { useSensitiveMode } from "@/hooks/use-sensitive-mode";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";

export function SensitiveToggle() {
  const t = useTranslations("sensitiveMode");
  const { isSensitive, toggle } = useSensitiveMode();

  return (
    <TooltipProvider delayDuration={200}>
      <Tooltip>
        <TooltipTrigger asChild>
          <button
            onClick={toggle}
            className={cn(
              "flex h-7 w-7 items-center justify-center rounded-md transition-colors",
              isSensitive
                ? "bg-amber-950/40 text-amber-400 hover:bg-amber-950/60"
                : "text-zinc-600 hover:bg-zinc-800 hover:text-zinc-400"
            )}
          >
            {isSensitive ? <IconEyeOff size={15} /> : <IconEye size={15} />}
          </button>
        </TooltipTrigger>
        <TooltipContent side="bottom" className="text-xs">
          {isSensitive ? t("disable") : t("enable")}
        </TooltipContent>
      </Tooltip>
    </TooltipProvider>
  );
}
