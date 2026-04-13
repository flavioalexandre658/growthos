"use client";

import { useTranslations } from "next-intl";
import { Link } from "@/i18n/routing";
import { IconSparkles, IconArrowRight } from "@tabler/icons-react";

interface DemoModeBannerProps {
  module:
    | "dashboard"
    | "finance"
    | "events"
    | "customers"
    | "channels"
    | "costs"
    | "mrr"
    | "subscriptions"
    | "tracker"
    | "pages";
  slug: string;
}

const TRACKER_MODULES = new Set(["events", "channels", "tracker", "pages"]);

export function DemoModeBanner({ module, slug }: DemoModeBannerProps) {
  const t = useTranslations("dashboard.demoBanner");

  return (
    <div className="flex flex-wrap items-center justify-between gap-3 border border-indigo-500/20 rounded-xl bg-gradient-to-r from-indigo-950/60 to-violet-950/40 px-4 py-3">
      <div className="flex items-center gap-2.5 min-w-0">
        <IconSparkles size={16} className="shrink-0 text-indigo-400" />
        <p className="text-xs text-indigo-200">
          <span className="font-semibold">{t("title")}</span>
          <span className="ml-1.5 text-indigo-300/80">
            {t(`${module}Description`)}
          </span>
        </p>
      </div>
      <div className="flex items-center gap-2 shrink-0">
        {TRACKER_MODULES.has(module) && (
          <Link
            href={`/${slug}/settings/installation`}
            className="flex items-center gap-1 rounded-md border border-indigo-500/20 bg-indigo-500/10 px-2.5 py-1 text-xs font-medium text-indigo-300 transition-colors hover:bg-indigo-500/20"
          >
            {t("installTracker")}
          </Link>
        )}
        <Link
          href={`/${slug}/settings/integrations`}
          className="flex items-center gap-1 rounded-md bg-indigo-500 px-2.5 py-1 text-xs font-medium text-white transition-colors hover:bg-indigo-400"
        >
          {t("connectGateway")}
          <IconArrowRight size={11} />
        </Link>
      </div>
    </div>
  );
}
