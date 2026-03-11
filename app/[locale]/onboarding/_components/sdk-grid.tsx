"use client";

import { useState } from "react";
import { useTranslations } from "next-intl";
import { cn } from "@/lib/utils";
import { getSdksByCategory, type SdkCategory, type SdkDefinition } from "./sdk-data";

interface SdkGridProps {
  onSelect: (sdk: SdkDefinition) => void;
}

const TABS: SdkCategory[] = ["web", "server"];

export function SdkGrid({ onSelect }: SdkGridProps) {
  const t = useTranslations("onboarding.stepInstallTracker.sdkGrid");
  const [activeTab, setActiveTab] = useState<SdkCategory>("web");
  const sdks = getSdksByCategory(activeTab);

  return (
    <div className="space-y-3">
      <div className="flex items-center gap-1 rounded-lg bg-zinc-900/60 border border-zinc-800 p-1 w-fit">
        {TABS.map((tab) => (
          <button
            key={tab}
            onClick={() => setActiveTab(tab)}
            className={cn(
              "px-4 py-1.5 rounded-md text-xs font-semibold transition-all",
              activeTab === tab
                ? "bg-indigo-600 text-white shadow-sm"
                : "text-zinc-500 hover:text-zinc-300 hover:bg-zinc-800/60",
            )}
          >
            {t(`tabs.${tab}`)}
          </button>
        ))}
      </div>

      <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
        {sdks.map((sdk) => {
          const Icon = sdk.icon;
          return (
            <button
              key={sdk.id}
              onClick={() => onSelect(sdk)}
              className="group flex flex-col items-center gap-2 rounded-xl border border-zinc-800 bg-zinc-900/40 px-3 py-4 transition-all hover:border-indigo-500/40 hover:bg-zinc-900/70 hover:shadow-lg hover:shadow-indigo-950/20"
            >
              <Icon
                size={28}
                className="text-zinc-400 transition-colors group-hover:text-indigo-400"
              />
              <span className="text-xs font-medium text-zinc-400 transition-colors group-hover:text-zinc-200">
                {sdk.name}
              </span>
            </button>
          );
        })}
      </div>
    </div>
  );
}
