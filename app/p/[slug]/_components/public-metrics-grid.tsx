import {
  IconUsers,
  IconPercentage,
  IconCurrencyDollar,
} from "@tabler/icons-react";
import type { IPublicMetrics, IPublicOrgData } from "@/interfaces/public-page.interface";

interface PublicMetricsGridProps {
  metrics: IPublicMetrics;
  org: IPublicOrgData;
}

interface MetricCardProps {
  label: string;
  value: string | number;
  subLabel?: string;
  icon: React.ElementType;
  color: string;
  bgColor: string;
}

function MetricCard({
  label,
  value,
  subLabel,
  icon: Icon,
  color,
  bgColor,
}: MetricCardProps) {
  return (
    <div className="rounded-xl border border-zinc-800/80 bg-zinc-900/40 px-3 py-2.5 sm:px-4 sm:py-3 flex items-center gap-3">
      <div className={`flex h-8 w-8 items-center justify-center rounded-lg shrink-0 ${bgColor}`}>
        <Icon size={14} className={color} />
      </div>
      <div className="min-w-0">
        <span className={`text-lg sm:text-xl font-bold font-mono leading-none whitespace-nowrap ${color}`}>
          {typeof value === "number"
            ? new Intl.NumberFormat("pt-BR").format(value)
            : value}
        </span>
        <p className="text-[10px] text-zinc-600 leading-tight mt-0.5 truncate">
          {subLabel ?? label}
        </p>
      </div>
    </div>
  );
}

export function PublicMetricsGrid({ metrics, org }: PublicMetricsGridProps) {
  const cards = [];

  if (metrics.activeSubscriptions !== null && metrics.activeSubscriptions !== undefined) {
    const arpuSuffix =
      metrics.arpu !== null && metrics.arpu !== undefined
        ? typeof metrics.arpu.value === "number"
          ? ` · ${new Intl.NumberFormat(org.locale, {
              style: "currency",
              currency: org.currency,
              maximumFractionDigits: 0,
            }).format(metrics.arpu.value / 100)} ARPU`
          : ` · ${String(metrics.arpu.value)} ARPU`
        : "";

    cards.push(
      <MetricCard
        key="subs"
        label="Assinantes"
        value={
          typeof metrics.activeSubscriptions.value === "number"
            ? metrics.activeSubscriptions.value
            : String(metrics.activeSubscriptions.value)
        }
        subLabel={`assinantes ativos${arpuSuffix}`}
        icon={IconUsers}
        color="text-violet-400"
        bgColor="bg-violet-950/50"
      />,
    );
  }

  if (metrics.churnRate !== null && metrics.churnRate !== undefined) {
    cards.push(
      <MetricCard
        key="churn"
        label="Churn"
        value={`${metrics.churnRate.toFixed(1)}%`}
        subLabel="churn mensal"
        icon={IconPercentage}
        color="text-zinc-300"
        bgColor="bg-zinc-800/60"
      />,
    );
  }

  if (
    metrics.arpu !== null &&
    metrics.arpu !== undefined &&
    (metrics.activeSubscriptions === null || metrics.activeSubscriptions === undefined)
  ) {
    const arpuValue =
      typeof metrics.arpu.value === "number"
        ? new Intl.NumberFormat(org.locale, {
            style: "currency",
            currency: org.currency,
            maximumFractionDigits: 0,
          }).format(metrics.arpu.value / 100)
        : String(metrics.arpu.value);

    cards.push(
      <MetricCard
        key="arpu"
        label="ARPU"
        value={arpuValue}
        subLabel="receita média por assinante"
        icon={IconCurrencyDollar}
        color="text-emerald-400"
        bgColor="bg-emerald-950/50"
      />,
    );
  }

  if (cards.length === 0) return null;

  return (
    <div
      className={`grid gap-3 ${
        cards.length === 1 ? "grid-cols-1" : "grid-cols-2"
      }`}
    >
      {cards}
    </div>
  );
}
