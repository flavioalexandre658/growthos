"use client";

import { useTranslations } from "next-intl";
import { Link } from "@/i18n/routing";
import { IconAlertTriangle, IconArrowRight } from "@tabler/icons-react";
import { useBilling } from "@/hooks/queries/use-billing";
import { formatRevenueLimit } from "@/utils/plans";

interface RevenueLimitBannerProps {
  slug: string;
}

export function RevenueLimitBanner({ slug }: RevenueLimitBannerProps) {
  const t = useTranslations("dashboard.revenueLimitBanner");
  const { data: billing } = useBilling();

  if (!billing) return null;
  if (billing.revenue.percentage < 100) return null;
  if (billing.revenue.limitInCents === Infinity) return null;

  const limitLabel = formatRevenueLimit(billing.revenue.limitInCents);

  return (
    <div className="flex items-center justify-between gap-3 border-b border-red-500/20 bg-red-500/10 px-4 py-2.5">
      <div className="flex items-center gap-2 min-w-0">
        <IconAlertTriangle size={14} className="shrink-0 text-red-400" />
        <p className="truncate text-xs text-red-300">
          <span className="font-semibold">{t("title")}</span>
          <span className="text-red-400/80 ml-1.5">
            {t("description", { plan: billing.plan.name, limit: limitLabel })}
          </span>
        </p>
      </div>
      <Link
        href={`/${slug}/settings/billing`}
        className="flex shrink-0 items-center gap-1 rounded-md bg-red-500/20 px-2.5 py-1 text-xs font-medium text-red-300 transition-colors hover:bg-red-500/30"
      >
        {t("upgrade")}
        <IconArrowRight size={11} />
      </Link>
    </div>
  );
}
