"use client";

import Link from "next/link";
import { useParams } from "next/navigation";
import { Skeleton } from "@/components/ui/skeleton";
import { fmtBRLDecimal } from "@/utils/format";
import {
  IconAlertTriangle,
  IconTrendingUp,
  IconTrendingDown,
  IconShoppingCartX,
  IconArrowNarrowRight,
  IconBulb,
  IconCircleCheckFilled,
} from "@tabler/icons-react";
import type { IGenericFunnelData } from "@/interfaces/dashboard.interface";

interface Alert {
  id: string;
  type: "warning" | "success" | "info" | "danger";
  icon: React.ElementType;
  title: string;
  description: string;
  linkHref?: string;
  linkLabel?: string;
}

interface DashboardAlertsProps {
  data: IGenericFunnelData | null | undefined;
  isLoading: boolean;
}

const TYPE_STYLES = {
  danger:  { bg: "bg-rose-950/40",   border: "border-rose-900/40",   icon: "text-rose-400",   title: "text-rose-300"   },
  warning: { bg: "bg-amber-950/40",  border: "border-amber-900/40",  icon: "text-amber-400",  title: "text-amber-300"  },
  success: { bg: "bg-emerald-950/40",border: "border-emerald-900/40",icon: "text-emerald-400",title: "text-emerald-300" },
  info:    { bg: "bg-indigo-950/40", border: "border-indigo-900/40", icon: "text-indigo-400", title: "text-indigo-300"  },
};

function buildAlerts(data: IGenericFunnelData, slug: string): Alert[] {
  const alerts: Alert[] = [];

  const prevMap = new Map(
    (data.previousSteps ?? []).map((s) => [s.key, s.value])
  );

  const abandonedCount = data.checkoutAbandoned ?? 0;
  if (abandonedCount > 0) {
    const avgTicketCents =
      data.revenue > 0
        ? data.revenue /
          Math.max(
            data.steps.find((s) => s.key === "payment" || s.key === "payments")?.value ?? 1,
            1
          )
        : 0;
    const lostRevenue = abandonedCount * avgTicketCents;
    alerts.push({
      id: "abandoned",
      type: "danger",
      icon: IconShoppingCartX,
      title: `${abandonedCount} carrinhos abandonados`,
      description: `~${fmtBRLDecimal(lostRevenue / 100)} em receita potencial perdida no período`,
      linkHref: `/${slug}/events?event_types=checkout_abandoned`,
      linkLabel: "Ver abandonos",
    });
  }

  const revenueChange =
    data.previousRevenue && data.previousRevenue > 0
      ? ((data.revenue - data.previousRevenue) / data.previousRevenue) * 100
      : null;

  if (revenueChange !== null && Math.abs(revenueChange) >= 5) {
    const isUp = revenueChange > 0;
    alerts.push({
      id: "revenue-trend",
      type: isUp ? "success" : "warning",
      icon: isUp ? IconTrendingUp : IconTrendingDown,
      title: isUp
        ? `Receita cresceu ${revenueChange.toFixed(0)}% vs período anterior`
        : `Receita caiu ${Math.abs(revenueChange).toFixed(0)}% vs período anterior`,
      description: isUp
        ? `De ${fmtBRLDecimal((data.previousRevenue ?? 0) / 100)} para ${fmtBRLDecimal(data.revenue / 100)}`
        : `De ${fmtBRLDecimal((data.previousRevenue ?? 0) / 100)} para ${fmtBRLDecimal(data.revenue / 100)} — verifique os canais`,
    });
  }

  const nonPageviewSteps = data.steps.filter((s) => s.key !== "pageview");
  let worstRate = Infinity;
  let worstLabel = "";
  let worstFromLabel = "";
  for (let i = 0; i < nonPageviewSteps.length - 1; i++) {
    const from = nonPageviewSteps[i];
    const to = nonPageviewSteps[i + 1];
    if (from.value <= 0) continue;
    const rate = (to.value / from.value) * 100;
    if (rate < worstRate) {
      worstRate = rate;
      worstFromLabel = from.label;
      worstLabel = to.label;
    }
  }
  if (worstRate < 30 && worstLabel) {
    alerts.push({
      id: "bottleneck",
      type: "warning",
      icon: IconAlertTriangle,
      title: `Gargalo: ${worstFromLabel} → ${worstLabel}`,
      description: `Apenas ${worstRate.toFixed(0)}% de conversão nessa etapa — maior oportunidade de melhora`,
    });
  }

  const stepsWithGrowth = nonPageviewSteps.filter((s) => {
    const prev = prevMap.get(s.key);
    if (!prev || prev === 0) return false;
    return ((s.value - prev) / prev) * 100 >= 20;
  });
  if (stepsWithGrowth.length > 0) {
    const best = stepsWithGrowth[0];
    const prev = prevMap.get(best.key) ?? 1;
    const pct = ((best.value - prev) / prev) * 100;
    alerts.push({
      id: "growth-step",
      type: "success",
      icon: IconCircleCheckFilled,
      title: `${best.label} cresceu ${pct.toFixed(0)}% vs período anterior`,
      description: `De ${prev} para ${best.value} — etapa com melhor desempenho`,
    });
  }

  if (alerts.length === 0) {
    alerts.push({
      id: "ok",
      type: "info",
      icon: IconBulb,
      title: "Tudo dentro do esperado",
      description: "Nenhuma anomalia detectada no período. Métricas estáveis.",
    });
  }

  return alerts;
}

export function DashboardAlerts({ data, isLoading }: DashboardAlertsProps) {
  const { slug } = useParams<{ slug: string }>();

  return (
    <div className="rounded-xl border border-zinc-800 bg-zinc-900/50 p-5 flex flex-col gap-4">
      <div className="flex items-center gap-2">
        <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-amber-600/15">
          <IconBulb size={14} className="text-amber-400" />
        </div>
        <div>
          <h3 className="text-sm font-bold text-zinc-100">Alertas & Oportunidades</h3>
          <p className="text-[11px] text-zinc-500">Insights automáticos do período</p>
        </div>
      </div>

      {isLoading ? (
        <div className="space-y-2.5">
          {Array.from({ length: 3 }).map((_, i) => (
            <Skeleton key={i} className="h-16 w-full bg-zinc-800 rounded-lg" />
          ))}
        </div>
      ) : !data ? (
        <div className="flex flex-1 items-center justify-center py-6">
          <p className="text-xs text-zinc-700">Sem dados disponíveis</p>
        </div>
      ) : (
        <div className="space-y-2.5">
          {buildAlerts(data, slug).map((alert) => {
            const styles = TYPE_STYLES[alert.type];
            const Icon = alert.icon;
            return (
              <div
                key={alert.id}
                className={`rounded-lg border px-3.5 py-3 ${styles.bg} ${styles.border}`}
              >
                <div className="flex items-start gap-2.5">
                  <Icon size={14} className={`${styles.icon} mt-0.5 shrink-0`} />
                  <div className="flex-1 min-w-0">
                    <p className={`text-xs font-semibold ${styles.title}`}>
                      {alert.title}
                    </p>
                    <p className="text-[11px] text-zinc-500 mt-0.5 leading-relaxed">
                      {alert.description}
                    </p>
                    {alert.linkHref && (
                      <Link
                        href={alert.linkHref}
                        className={`inline-flex items-center gap-1 text-[11px] font-medium mt-1.5 ${styles.icon} hover:opacity-80 transition-opacity`}
                      >
                        {alert.linkLabel}
                        <IconArrowNarrowRight size={11} />
                      </Link>
                    )}
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
