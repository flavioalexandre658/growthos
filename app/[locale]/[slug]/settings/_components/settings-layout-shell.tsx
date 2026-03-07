"use client";

import { useTranslations } from "next-intl";
import { SettingsNav } from "./settings-nav";

interface SettingsLayoutShellProps {
  slug: string;
  children: React.ReactNode;
}

export function SettingsLayoutShell({
  slug,
  children,
}: SettingsLayoutShellProps) {
  const t = useTranslations("settings.layout");

  return (
    <div className="p-5 lg:p-6 space-y-4">
      <div>
        <h1 className="text-lg font-bold text-zinc-100">{t("title")}</h1>
        <p className="text-xs text-zinc-500">
          {t("subtitle")}
        </p>
      </div>

      <div className="flex flex-col lg:flex-row lg:gap-8 lg:items-start">
        <SettingsNav slug={slug} />
        <div className="flex-1 min-w-0">{children}</div>
      </div>
    </div>
  );
}
