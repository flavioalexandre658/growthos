"use client";

import { useState, useRef } from "react";
import Link from "next/link";
import { useTranslations } from "next-intl";
import {
  IconSparkles,
  IconCalendar,
  IconChevronDown,
  IconChevronRight,
  IconArrowLeft,
  IconTrendingUp,
  IconTrendingDown,
  IconMinus,
  IconAlertTriangle,
  IconCircleCheck,
  IconInfoCircle,
  IconBrain,
  IconPlayerPlay,
  IconClock,
} from "@tabler/icons-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { useOrganization } from "@/components/providers/organization-provider";
import { getFunnel } from "@/actions/dashboard/get-funnel.action";
import { getChannels } from "@/actions/dashboard/get-channels.action";
import { getDaily } from "@/actions/dashboard/get-daily.action";
import { getLandingPages } from "@/actions/dashboard/get-landing-pages.action";
import { getFinancial } from "@/actions/dashboard/get-financial.action";
import { getFixedCosts } from "@/actions/costs/get-fixed-costs.action";
import { getVariableCosts } from "@/actions/costs/get-variable-costs.action";
import { getRevenueSegments } from "@/actions/dashboard/get-revenue-segments.action";
import { getMrrOverview } from "@/actions/dashboard/get-mrr-overview.action";
import { getEvents } from "@/actions/events/get-events.action";
import { buildProfitAndLoss } from "@/utils/build-pl";
import { fmtCurrency } from "@/utils/format";
import { resolvePeriodDays } from "@/utils/resolve-period-days";
import type { IDateFilter, DashboardPeriod } from "@/interfaces/dashboard.interface";
import type { IFixedCost, IVariableCost } from "@/interfaces/cost.interface";
import type {
  IComparisonResult,
  IComparisonFinding,
  IComparisonAction,
  IMetricVariation,
} from "@/interfaces/ai.interface";

const PERIOD_PRESETS: { value: DashboardPeriod; key: string }[] = [
  { value: "today", key: "today" },
  { value: "yesterday", key: "yesterday" },
  { value: "7d", key: "7d" },
  { value: "this_month", key: "thisMonth" },
  { value: "30d", key: "30d" },
  { value: "90d", key: "90d" },
];

const ALL_SECTIONS = [
  { key: "overview" },
  { key: "channels" },
  { key: "finance" },
  { key: "pages" },
  { key: "recurrence" },
  { key: "costs" },
  { key: "events" },
];

function formatPct(value: number): string {
  return `${value.toFixed(2)}%`;
}

function calcVariation(a: number, b: number): string {
  if (b === 0) return a > 0 ? "+∞%" : "0%";
  const pct = ((a - b) / Math.abs(b)) * 100;
  const sign = pct >= 0 ? "+" : "";
  return `${sign}${pct.toLocaleString("pt-BR", { minimumFractionDigits: 1, maximumFractionDigits: 1 })}%`;
}

function getPeriodLabel(filter: IDateFilter, t: (key: string) => string): string {
  if (filter.start_date && filter.end_date) {
    return `${filter.start_date} → ${filter.end_date}`;
  }
  const preset = PERIOD_PRESETS.find((p) => p.value === filter.period);
  return preset ? t(`comparison.periodPresets.${preset.key}`) : filter.period ?? "";
}

async function fetchAndFormatSection(
  orgId: string,
  section: string,
  filter: IDateFilter,
  locale: string,
  currency: string,
): Promise<{ formatted: Record<string, unknown>; metrics: Record<string, number> }> {
  switch (section) {
    case "overview": {
      const [funnel] = await Promise.all([getFunnel(orgId, filter), getDaily(orgId, filter)]);
      const steps: Record<string, number> = {};
      funnel?.steps.forEach((s) => { steps[s.key] = s.value; });
      const revenue = funnel?.revenue ?? 0;
      const purchases = steps["purchase"] ?? 0;
      const signups = steps["signup"] ?? 0;
      const visits = steps["pageview"] ?? 0;
      const convRate = visits > 0 ? purchases / visits : 0;
      const ticket = purchases > 0 ? revenue / purchases : 0;
      return {
        formatted: {
          visitas: visits,
          cadastros: signups,
          edicoes: steps["edit"] ?? 0,
          checkout_iniciado: steps["checkout_started"] ?? 0,
          pagamentos: purchases,
          receita_bruta: fmtCurrency(revenue / 100, locale, currency),
          ticket_medio: fmtCurrency(ticket / 100, locale, currency),
          taxa_conversao: formatPct(convRate * 100),
          checkout_abandonado: funnel?.checkoutAbandoned ?? 0,
        },
        metrics: { visitas: visits, cadastros: signups, pagamentos: purchases, receita_bruta: revenue, ticket_medio: ticket, taxa_conversao: convRate * 100 },
      };
    }
    case "channels": {
      const result = await getChannels(orgId, { ...filter, limit: 20 });
      const topChannels = (result.data ?? []).slice(0, 10).map((c) => ({
        canal: c.channel,
        visitas: c.steps["pageview"] ?? 0,
        pagamentos: c.steps["purchase"] ?? 0,
        receita: fmtCurrency((c.revenue ?? 0) / 100, locale, currency),
        ticket_medio: fmtCurrency((c.ticket_medio ?? 0) / 100, locale, currency),
        conversao: c.conversion_rate,
      }));
      const totalRevenue = result.totalRevenue ?? 0;
      return {
        formatted: { canais: topChannels, receita_total: fmtCurrency(totalRevenue / 100, locale, currency) },
        metrics: { receita_total: totalRevenue },
      };
    }
    case "finance": {
      const [financial, funnel, fixed, variable, segments] = await Promise.all([
        getFinancial(orgId, filter),
        getFunnel(orgId, filter),
        getFixedCosts(orgId),
        getVariableCosts(orgId),
        getRevenueSegments(orgId, filter),
      ]);
      const periodDays = resolvePeriodDays(filter);
      const eventCosts = financial?.totalDiscountsInCents ?? 0;
      const pl = buildProfitAndLoss(
        funnel?.revenue ?? 0,
        (fixed ?? []) as IFixedCost[],
        (variable ?? []) as IVariableCost[],
        periodDays,
        segments,
        eventCosts,
      );
      return {
        formatted: {
          receita_bruta: fmtCurrency(pl.grossRevenueInCents / 100, locale, currency),
          custos_variaveis: fmtCurrency(pl.totalVariableCostsInCents / 100, locale, currency),
          lucro_operacional: fmtCurrency(pl.operatingProfitInCents / 100, locale, currency),
          custos_fixos: fmtCurrency(pl.totalFixedCostsInCents / 100, locale, currency),
          lucro_liquido: fmtCurrency(pl.netProfitInCents / 100, locale, currency),
          margem_liquida: `${pl.marginPercent}%`,
        },
        metrics: {
          receita_bruta: pl.grossRevenueInCents,
          lucro_liquido: pl.netProfitInCents,
          custos_totais: pl.totalFixedCostsInCents + pl.totalVariableCostsInCents,
          margem: pl.marginPercent,
        },
      };
    }
    case "pages": {
      const result = await getLandingPages(orgId, { ...filter, limit: 20 });
      const topPages = (result.data ?? []).slice(0, 10).map((p) => ({
        url: p.page,
        visitas: p.steps["pageview"] ?? 0,
        pagamentos: p.steps["purchase"] ?? 0,
        receita: fmtCurrency((p.revenue ?? 0) / 100, locale, currency),
        conversao: p.conversion_rate,
      }));
      const totalRevenue = result.totalRevenue ?? 0;
      return {
        formatted: { paginas: topPages, receita_total: fmtCurrency(totalRevenue / 100, locale, currency) },
        metrics: { receita_total: totalRevenue },
      };
    }
    case "recurrence": {
      const mrr = await getMrrOverview(orgId, filter);
      return {
        formatted: {
          mrr: fmtCurrency((mrr?.mrr ?? 0) / 100, locale, currency),
          arr: fmtCurrency((mrr?.arr ?? 0) / 100, locale, currency),
          assinaturas_ativas: mrr?.activeSubscriptions ?? 0,
          arpu: fmtCurrency((mrr?.arpu ?? 0) / 100, locale, currency),
          churn_rate: formatPct(mrr?.churnRate ?? 0),
          ltv_estimado: fmtCurrency((mrr?.estimatedLtv ?? 0) / 100, locale, currency),
          crescimento_mrr: formatPct(mrr?.mrrGrowthRate ?? 0),
        },
        metrics: {
          mrr: mrr?.mrr ?? 0,
          arr: mrr?.arr ?? 0,
          assinaturas_ativas: mrr?.activeSubscriptions ?? 0,
          arpu: mrr?.arpu ?? 0,
          churn_rate: mrr?.churnRate ?? 0,
          ltv_estimado: mrr?.estimatedLtv ?? 0,
        },
      };
    }
    case "costs": {
      const [fixedCostsList, variableCostsList, financial, segments] = await Promise.all([
        getFixedCosts(orgId),
        getVariableCosts(orgId),
        getFinancial(orgId, filter),
        getRevenueSegments(orgId, filter),
      ]);
      const periodDays = resolvePeriodDays(filter);
      const grossRevenue = financial?.grossRevenueInCents ?? 0;
      const totalDiscounts = financial?.totalDiscountsInCents ?? 0;
      const fixedList = (fixedCostsList ?? []) as IFixedCost[];
      const variableList = (variableCostsList ?? []) as IVariableCost[];
      const pl = buildProfitAndLoss(grossRevenue, fixedList, variableList, periodDays, segments ?? {}, totalDiscounts);
      const totalCosts = pl.totalFixedCostsInCents + pl.totalVariableCostsInCents;
      const fixedItems = fixedList.map((c) => ({ nome: c.name, valor: fmtCurrency(c.amountInCents / 100, locale, currency) }));
      const variableItems = variableList.map((c) => ({
        nome: c.name,
        valor: c.type === "PERCENTAGE" ? `${c.amountInCents / 100}%` : fmtCurrency(c.amountInCents / 100, locale, currency),
        aplica_em: c.applyTo,
      }));
      return {
        formatted: {
          custos_fixos: fmtCurrency(pl.totalFixedCostsInCents / 100, locale, currency),
          custos_variaveis: fmtCurrency(pl.totalVariableCostsInCents / 100, locale, currency),
          custo_total: fmtCurrency(totalCosts / 100, locale, currency),
          margem: formatPct(pl.marginPercent),
          impacto_na_receita: formatPct(grossRevenue > 0 ? (totalCosts / grossRevenue) * 100 : 0),
          itens_fixos: fixedItems,
          itens_variaveis: variableItems,
        },
        metrics: {
          custos_fixos: pl.totalFixedCostsInCents,
          custos_variaveis: pl.totalVariableCostsInCents,
          custo_total: totalCosts,
          margem: pl.marginPercent,
        },
      };
    }
    case "events": {
      const result = await getEvents(orgId, { ...filter, limit: 100 });
      const total = result.pagination.total;
      const byType: Record<string, number> = {};
      result.data.forEach((e) => {
        byType[e.eventType] = (byType[e.eventType] ?? 0) + 1;
      });
      const purchases = byType["purchase"] ?? 0;
      const signups = byType["signup"] ?? 0;
      const pageviews = byType["pageview"] ?? 0;
      const checkouts = byType["checkout_started"] ?? 0;
      const edits = byType["edit"] ?? 0;
      return {
        formatted: {
          total_eventos: total,
          pagamentos: purchases,
          cadastros: signups,
          pageviews: pageviews,
          checkouts_iniciados: checkouts,
          edicoes: edits,
        },
        metrics: {
          total_eventos: total,
          pagamentos: purchases,
          cadastros: signups,
          pageviews: pageviews,
          checkouts_iniciados: checkouts,
          edicoes: edits,
        },
      };
    }
    default:
      return { formatted: {}, metrics: {} };
  }
}

function buildVariations(
  section: string,
  metricsA: Record<string, number>,
  metricsB: Record<string, number>,
  t: (key: string) => string,
  locale: string,
  currency: string,
): IMetricVariation[] {
  const metricDefs: Record<string, { labelKey: string; isCurrency: boolean; higherIsBetter: boolean }[]> = {
    overview: [
      { labelKey: "visits", isCurrency: false, higherIsBetter: true },
      { labelKey: "signups", isCurrency: false, higherIsBetter: true },
      { labelKey: "payments", isCurrency: false, higherIsBetter: true },
      { labelKey: "grossRevenue", isCurrency: true, higherIsBetter: true },
      { labelKey: "averageTicket", isCurrency: true, higherIsBetter: true },
      { labelKey: "conversionRate", isCurrency: false, higherIsBetter: true },
    ],
    channels: [
      { labelKey: "totalRevenue", isCurrency: true, higherIsBetter: true },
    ],
    finance: [
      { labelKey: "grossRevenue", isCurrency: true, higherIsBetter: true },
      { labelKey: "netProfit", isCurrency: true, higherIsBetter: true },
      { labelKey: "totalCosts", isCurrency: true, higherIsBetter: false },
      { labelKey: "marginPercent", isCurrency: false, higherIsBetter: true },
    ],
    pages: [
      { labelKey: "totalRevenue", isCurrency: true, higherIsBetter: true },
    ],
    recurrence: [
      { labelKey: "mrr", isCurrency: true, higherIsBetter: true },
      { labelKey: "arr", isCurrency: true, higherIsBetter: true },
      { labelKey: "activeSubscriptions", isCurrency: false, higherIsBetter: true },
      { labelKey: "arpu", isCurrency: true, higherIsBetter: true },
      { labelKey: "churnRatePercent", isCurrency: false, higherIsBetter: false },
      { labelKey: "estimatedLtv", isCurrency: true, higherIsBetter: true },
    ],
    costs: [
      { labelKey: "fixedCosts", isCurrency: true, higherIsBetter: false },
      { labelKey: "variableCosts", isCurrency: true, higherIsBetter: false },
      { labelKey: "totalCost", isCurrency: true, higherIsBetter: false },
      { labelKey: "marginPercent", isCurrency: false, higherIsBetter: true },
    ],
    events: [
      { labelKey: "totalEvents", isCurrency: false, higherIsBetter: true },
      { labelKey: "payments", isCurrency: false, higherIsBetter: true },
      { labelKey: "signups", isCurrency: false, higherIsBetter: true },
      { labelKey: "pageviews", isCurrency: false, higherIsBetter: true },
      { labelKey: "checkoutsStarted", isCurrency: false, higherIsBetter: true },
      { labelKey: "edits", isCurrency: false, higherIsBetter: true },
    ],
  };

  const metricKeys: Record<string, string[]> = {
    overview: ["visitas", "cadastros", "pagamentos", "receita_bruta", "ticket_medio", "taxa_conversao"],
    channels: ["receita_total"],
    finance: ["receita_bruta", "lucro_liquido", "custos_totais", "margem"],
    pages: ["receita_total"],
    recurrence: ["mrr", "arr", "assinaturas_ativas", "arpu", "churn_rate", "ltv_estimado"],
    costs: ["custos_fixos", "custos_variaveis", "custo_total", "margem"],
    events: ["total_eventos", "pagamentos", "cadastros", "pageviews", "checkouts_iniciados", "edicoes"],
  };

  const defs = metricDefs[section] ?? [];
  const keys = metricKeys[section] ?? [];

  return keys.map((key, i) => {
    const def = defs[i] ?? { labelKey: key, isCurrency: false, higherIsBetter: true };
    const label = t(`comparison.metricLabels.${def.labelKey}`);
    const vA = metricsA[key] ?? 0;
    const vB = metricsB[key] ?? 0;
    const delta = vB === 0 ? (vA > 0 ? Infinity : 0) : ((vA - vB) / Math.abs(vB)) * 100;
    const isPositive = def.higherIsBetter ? delta >= 0 : delta <= 0;
    const varStr = calcVariation(vA, vB);
    const fmt = def.isCurrency ? (v: number) => fmtCurrency(v / 100, locale, currency) : (v: number) => v.toLocaleString("pt-BR", { maximumFractionDigits: 2 });
    return {
      label,
      valueA: vA,
      valueB: vB,
      formattedA: fmt(vA),
      formattedB: fmt(vB),
      variation: varStr,
      isPositive,
      isCurrency: def.isCurrency,
    };
  }).filter((m) => m.valueA > 0 || m.valueB > 0);
}

function buildVariationsPayload(variations: IMetricVariation[]): Record<string, string> {
  const result: Record<string, string> = {};
  variations.forEach((v) => {
    const key = v.label.toLowerCase().replace(/\s+/g, "_").replace(/[^a-z0-9_]/g, "");
    result[key] = v.variation;
  });
  return result;
}

interface PeriodPickerProps {
  label: string;
  filter: IDateFilter;
  onChange: (filter: IDateFilter) => void;
}

function PeriodPicker({ label, filter, onChange }: PeriodPickerProps) {
  const t = useTranslations("ai");
  const [showCustom, setShowCustom] = useState(!!(filter.start_date && filter.end_date));
  const activePeriod = !filter.start_date ? (filter.period ?? "30d") : null;

  return (
    <div className="space-y-2">
      <p className="text-xs font-semibold text-zinc-400 uppercase tracking-wider">{label}</p>
      <div className="flex flex-wrap gap-1">
        {PERIOD_PRESETS.map((opt) => (
          <button
            key={opt.value}
            onClick={() => { setShowCustom(false); onChange({ period: opt.value }); }}
            className={cn(
              "px-2.5 py-1 rounded-md text-xs font-semibold transition-all",
              activePeriod === opt.value
                ? "bg-indigo-600 text-white"
                : "bg-zinc-800 text-zinc-400 hover:text-zinc-100",
            )}
          >
            {t(`comparison.periodPresets.${opt.key}`)}
          </button>
        ))}
        <button
          onClick={() => setShowCustom((v) => !v)}
          className={cn(
            "flex items-center gap-1 px-2.5 py-1 rounded-md text-xs font-semibold transition-all",
            showCustom ? "bg-indigo-600 text-white" : "bg-zinc-800 text-zinc-400 hover:text-zinc-100",
          )}
        >
          <IconCalendar size={11} />
          {t("comparison.dates")}
        </button>
      </div>
      {showCustom && (
        <div className="flex items-center gap-2">
          <input
            type="date"
            value={filter.start_date ?? ""}
            onChange={(e) => onChange({ start_date: e.target.value, end_date: filter.end_date })}
            className="h-7 rounded-lg border border-zinc-700 bg-zinc-900 px-2 text-xs text-zinc-200 focus:outline-none focus:border-indigo-500 [color-scheme:dark]"
          />
          <span className="text-zinc-600 text-xs">→</span>
          <input
            type="date"
            value={filter.end_date ?? ""}
            onChange={(e) => onChange({ start_date: filter.start_date, end_date: e.target.value })}
            className="h-7 rounded-lg border border-zinc-700 bg-zinc-900 px-2 text-xs text-zinc-200 focus:outline-none focus:border-indigo-500 [color-scheme:dark]"
          />
        </div>
      )}
    </div>
  );
}

function ScoreGauge({ score, label }: { score: number; label: string }) {
  const radius = 52;
  const circumference = Math.PI * radius;
  const strokeLength = (score / 100) * circumference;
  const color = score >= 70 ? "#10b981" : score >= 40 ? "#f59e0b" : "#ef4444";

  return (
    <div className="flex flex-col items-center justify-center gap-2">
      <div className="relative w-32 h-20 overflow-hidden">
        <svg width="128" height="80" viewBox="0 0 128 80" fill="none">
          <path d="M 12 76 A 52 52 0 0 1 116 76" stroke="#27272a" strokeWidth="12" fill="none" strokeLinecap="round" />
          <path
            d="M 12 76 A 52 52 0 0 1 116 76"
            stroke={color}
            strokeWidth="12"
            fill="none"
            strokeLinecap="round"
            strokeDasharray={`${strokeLength} ${circumference}`}
            style={{ transition: "stroke-dasharray 1s ease" }}
          />
        </svg>
        <div className="absolute inset-0 flex flex-col items-center justify-end pb-1">
          <span className="text-2xl font-black text-zinc-100 leading-none">{score}</span>
          <span className="text-[10px] text-zinc-500 leading-none">/100</span>
        </div>
      </div>
      <span
        className="text-xs font-bold px-2.5 py-0.5 rounded-full"
        style={{ color, backgroundColor: `${color}18`, border: `1px solid ${color}30` }}
      >
        {label}
      </span>
    </div>
  );
}

function MetricVariationCard({ metric, labelA, labelB }: { metric: IMetricVariation; labelA: string; labelB: string }) {
  const maxVal = Math.max(metric.valueA, metric.valueB, 1);
  const barA = (metric.valueA / maxVal) * 100;
  const barB = (metric.valueB / maxVal) * 100;
  const color = metric.isPositive ? "#10b981" : "#ef4444";
  const VariationIcon = metric.isPositive ? IconTrendingUp : metric.variation === "0%" ? IconMinus : IconTrendingDown;

  return (
    <div className="rounded-lg border border-zinc-800 bg-zinc-900/50 p-4 space-y-3">
      <div className="flex items-center justify-between gap-2">
        <span className="text-xs font-semibold text-zinc-300">{metric.label}</span>
        <div
          className="flex items-center gap-1 text-xs font-bold px-2 py-0.5 rounded-md"
          style={{ color, backgroundColor: `${color}18`, border: `1px solid ${color}30` }}
        >
          <VariationIcon size={11} />
          {metric.variation}
        </div>
      </div>

      <div className="space-y-1.5">
        <div className="space-y-0.5">
          <div className="flex items-center justify-between text-[10px] text-zinc-500">
            <span>{labelA}</span>
            <span className="font-semibold text-zinc-300">{metric.formattedA}</span>
          </div>
          <div className="h-1.5 w-full rounded-full bg-zinc-800">
            <div
              className="h-1.5 rounded-full transition-all duration-500"
              style={{ width: `${barA}%`, backgroundColor: "#6366f1" }}
            />
          </div>
        </div>
        <div className="space-y-0.5">
          <div className="flex items-center justify-between text-[10px] text-zinc-500">
            <span>{labelB}</span>
            <span className="font-semibold text-zinc-300">{metric.formattedB}</span>
          </div>
          <div className="h-1.5 w-full rounded-full bg-zinc-800">
            <div
              className="h-1.5 rounded-full transition-all duration-500"
              style={{ width: `${barB}%`, backgroundColor: "#3f3f46" }}
            />
          </div>
        </div>
      </div>
    </div>
  );
}

function ComparisonFindingCard({ finding }: { finding: IComparisonFinding }) {
  const t = useTranslations("ai");

  const config = {
    positivo: {
      accent: "border-emerald-500/40 bg-emerald-950/20",
      left: "bg-emerald-500",
      badge: "bg-emerald-500/15 text-emerald-400 border-emerald-500/30",
      label: t("comparison.findingSeverity.positive"),
      icon: <IconCircleCheck size={13} className="text-emerald-400" />,
    },
    atencao: {
      accent: "border-amber-500/40 bg-amber-950/10",
      left: "bg-amber-500",
      badge: "bg-amber-500/15 text-amber-400 border-amber-500/30",
      label: t("comparison.findingSeverity.warning"),
      icon: <IconInfoCircle size={13} className="text-amber-400" />,
    },
    critico: {
      accent: "border-red-500/40 bg-red-950/20",
      left: "bg-red-500",
      badge: "bg-red-500/15 text-red-400 border-red-500/30",
      label: t("comparison.findingSeverity.critical"),
      icon: <IconAlertTriangle size={13} className="text-red-400" />,
    },
  }[finding.severidade];

  return (
    <div className={cn("relative rounded-lg border overflow-hidden", config.accent)}>
      <div className={cn("absolute left-0 top-0 bottom-0 w-0.5", config.left)} />
      <div className="pl-4 pr-3 py-3 space-y-1.5">
        <div className="flex items-start justify-between gap-2">
          <div className="flex items-center gap-1.5">
            {config.icon}
            <span className="text-xs font-semibold text-zinc-200">{finding.titulo}</span>
          </div>
          <span className={cn("shrink-0 text-[10px] font-bold px-1.5 py-0.5 rounded-md border", config.badge)}>
            {config.label}
          </span>
        </div>
        <div className="flex items-center gap-2 text-xs">
          <span className="text-zinc-500">{finding.valor_b}</span>
          <span className="text-zinc-600">→</span>
          <span className="font-bold text-zinc-100">{finding.valor_a}</span>
          <span
            className="font-bold text-[11px]"
            style={{ color: finding.severidade === "positivo" ? "#10b981" : finding.severidade === "critico" ? "#ef4444" : "#f59e0b" }}
          >
            {finding.variacao}
          </span>
        </div>
        <p className="text-[11px] text-zinc-500 leading-relaxed">{finding.interpretacao}</p>
      </div>
    </div>
  );
}

function DiagnosisSection({ text }: { text: string }) {
  const t = useTranslations("ai");
  const [open, setOpen] = useState(false);

  return (
    <div className="rounded-lg border border-zinc-800 overflow-hidden">
      <button
        onClick={() => setOpen((v) => !v)}
        className="w-full flex items-center justify-between gap-3 px-4 py-3 text-left hover:bg-zinc-800/30 transition-colors"
      >
        <div className="flex items-center gap-2">
          {open ? <IconChevronDown size={14} className="text-zinc-500 shrink-0" /> : <IconChevronRight size={14} className="text-zinc-500 shrink-0" />}
          <span className="text-sm font-semibold text-zinc-200">{t("comparison.diagnosis")}</span>
        </div>
        <span className="text-[10px] font-bold px-1.5 py-0.5 rounded-md border bg-indigo-500/15 text-indigo-400 border-indigo-500/30 shrink-0">
          {t("comparison.analysis")}
        </span>
      </button>
      {open && (
        <div className="px-4 pb-4 pt-1 border-t border-zinc-800/60 space-y-3">
          {text.split("\n\n").map((para, i) => (
            <p key={i} className="text-xs text-zinc-400 leading-relaxed">{para}</p>
          ))}
        </div>
      )}
    </div>
  );
}

function ComparisonActionCard({ action }: { action: IComparisonAction }) {
  const t = useTranslations("ai");

  const prazoConfig = {
    imediato: { label: t("comparison.actionDeadline.immediate"), color: "text-red-400 bg-red-500/15 border-red-500/30" },
    esta_semana: { label: t("comparison.actionDeadline.thisWeek"), color: "text-amber-400 bg-amber-500/15 border-amber-500/30" },
    este_mes: { label: t("comparison.actionDeadline.thisMonth"), color: "text-zinc-400 bg-zinc-500/15 border-zinc-500/30" },
  }[action.prazo] ?? { label: action.prazo, color: "text-zinc-400 bg-zinc-500/15 border-zinc-500/30" };

  return (
    <div className="rounded-xl border border-zinc-800 bg-zinc-900/50 p-4 hover:border-zinc-700 transition-all">
      <div className="flex items-start gap-3">
        <div className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-indigo-600/20 text-xs font-black text-indigo-400">
          #{action.prioridade}
        </div>
        <div className="flex-1 min-w-0">
          <div className="flex flex-wrap items-center gap-2 mb-1.5">
            <p className="text-sm font-bold text-zinc-100">{action.titulo}</p>
            <span className={cn("text-[10px] font-bold px-1.5 py-0.5 rounded-md border flex items-center gap-1", prazoConfig.color)}>
              <IconClock size={9} />
              {prazoConfig.label}
            </span>
          </div>
          <p className="text-xs text-zinc-400 leading-relaxed mb-2">{action.acao}</p>
          <span className="text-[11px] font-semibold text-indigo-400 bg-indigo-500/10 border border-indigo-500/20 px-2 py-0.5 rounded-md">
            {t("comparison.estimatedImpact", { impact: action.impacto_estimado })}
          </span>
        </div>
      </div>
    </div>
  );
}

const VEREDICTO_CONFIG = {
  crescimento: { key: "growth", color: "#10b981", bg: "bg-emerald-950/20 border-emerald-700/40" },
  estabilidade: { key: "stability", color: "#6366f1", bg: "bg-indigo-950/20 border-indigo-700/40" },
  declinio: { key: "decline", color: "#ef4444", bg: "bg-red-950/20 border-red-700/40" },
  anomalia: { key: "anomaly", color: "#f59e0b", bg: "bg-amber-950/20 border-amber-700/40" },
};

export function ComparisonContent() {
  const t = useTranslations("ai");
  const { organization } = useOrganization();
  const orgId = organization?.id;
  const slug = organization?.slug ?? "";
  const locale = organization?.locale ?? "pt-BR";
  const currency = organization?.currency ?? "BRL";

  const [section, setSection] = useState("overview");
  const [filterA, setFilterA] = useState<IDateFilter>({ period: "today" });
  const [filterB, setFilterB] = useState<IDateFilter>({ period: "yesterday" });
  const [result, setResult] = useState<IComparisonResult | null>(null);
  const [variations, setVariations] = useState<IMetricVariation[]>([]);
  const [labelA, setLabelA] = useState("");
  const [labelB, setLabelB] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [configCollapsed, setConfigCollapsed] = useState(false);
  const abortRef = useRef<AbortController | null>(null);

  const handleCompare = async () => {
    if (!orgId) return;
    if (abortRef.current) abortRef.current.abort();
    abortRef.current = new AbortController();

    setResult(null);
    setError(null);
    setIsLoading(true);

    const la = getPeriodLabel(filterA, t);
    const lb = getPeriodLabel(filterB, t);
    setLabelA(la);
    setLabelB(lb);

    try {
      const [sectionA, sectionB] = await Promise.all([
        fetchAndFormatSection(orgId, section, filterA, locale, currency),
        fetchAndFormatSection(orgId, section, filterB, locale, currency),
      ]);

      const vars = buildVariations(section, sectionA.metrics, sectionB.metrics, t, locale, currency);
      setVariations(vars);

      const sectionLabel = t(`comparison.sections.${section}`);

      const payload = {
        type: "comparison",
        orgName: organization?.name ?? "sua empresa",
        language: organization?.language ?? "pt-BR",
        currency: organization?.currency ?? "BRL",
        country: organization?.country ?? "BR",
        data: {
          contexto: {
            organizacao: organization?.name ?? "sua empresa",
            secao: sectionLabel,
            periodo_a: { label: la },
            periodo_b: { label: lb },
          },
          periodo_a: sectionA.formatted,
          periodo_b: sectionB.formatted,
          variacoes_calculadas: buildVariationsPayload(vars),
        },
      };

      const res = await fetch("/api/ai/analyze", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
        signal: abortRef.current.signal,
      });

      if (!res.ok) {
        const errBody = await res.json().catch(() => ({})) as { error?: string };
        throw new Error(errBody.error ?? t("comparison.error.connectionError"));
      }

      const parsed = (await res.json()) as IComparisonResult;
      setResult(parsed);
      setConfigCollapsed(true);
    } catch (err: unknown) {
      if (err instanceof Error && err.name !== "AbortError") {
        setError(err.message ?? t("comparison.error.unknownError"));
      }
    } finally {
      setIsLoading(false);
    }
  };

  const veredicto = result ? (VEREDICTO_CONFIG[result.veredicto] ?? VEREDICTO_CONFIG.estabilidade) : null;

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-3">
        <Link
          href={`/${slug}/ai`}
          className="flex items-center gap-1.5 text-xs text-zinc-500 hover:text-zinc-300 transition-colors"
        >
          <IconArrowLeft size={13} />
          {t("comparison.breadcrumb")}
        </Link>
        <span className="text-zinc-700">/</span>
        <div className="flex items-center gap-2">
          <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-emerald-600/20 ring-1 ring-inset ring-emerald-600/30">
            <IconTrendingUp size={14} className="text-emerald-400" />
          </div>
          <div>
            <h1 className="text-lg font-bold text-zinc-100">{t("comparison.title")}</h1>
            <p className="text-xs text-zinc-500">{t("comparison.subtitle")}</p>
          </div>
        </div>
      </div>

      <div className="rounded-xl border border-zinc-800 bg-zinc-900/50 overflow-hidden">
        <button
          onClick={() => setConfigCollapsed((v) => !v)}
          className="w-full flex items-center justify-between px-5 py-3.5 hover:bg-zinc-800/30 transition-colors"
        >
          <div className="flex items-center gap-2">
            <IconBrain size={14} className="text-zinc-400" />
            <span className="text-sm font-semibold text-zinc-200">{t("comparison.configuration")}</span>
            {result && (
              <span className="text-[10px] font-semibold text-zinc-500 bg-zinc-800 px-1.5 py-0.5 rounded">
                {t(`comparison.sections.${section}`)} · {labelA} vs {labelB}
              </span>
            )}
          </div>
          {configCollapsed ? <IconChevronRight size={14} className="text-zinc-600" /> : <IconChevronDown size={14} className="text-zinc-600" />}
        </button>

        {!configCollapsed && (
          <div className="px-5 pb-5 space-y-5 border-t border-zinc-800/60">
            <div className="pt-4">
              <p className="text-xs font-semibold text-zinc-400 uppercase tracking-wider mb-2">{t("comparison.section")}</p>
              <div className="flex flex-wrap gap-1.5">
                {ALL_SECTIONS.map((s) => (
                  <button
                    key={s.key}
                    onClick={() => setSection(s.key)}
                    className={cn(
                      "px-3 py-1.5 rounded-lg text-xs font-semibold transition-all border",
                      section === s.key
                        ? "bg-indigo-600/20 border-indigo-600/40 text-indigo-300"
                        : "bg-zinc-900 border-zinc-700 text-zinc-400 hover:text-zinc-100 hover:border-zinc-600",
                    )}
                  >
                    {t(`comparison.sections.${s.key}`)}
                  </button>
                ))}
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 p-4 rounded-xl border border-zinc-800 bg-zinc-900/30">
              <PeriodPicker label={t("comparison.periodA")} filter={filterA} onChange={setFilterA} />
              <PeriodPicker label={t("comparison.periodB")} filter={filterB} onChange={setFilterB} />
            </div>

            <Button
              onClick={handleCompare}
              disabled={isLoading || !orgId}
              className="w-full bg-emerald-600 hover:bg-emerald-500 text-white gap-2"
            >
              <IconSparkles size={15} />
              {isLoading ? t("comparison.comparing") : t("comparison.compareWithAi")}
            </Button>
          </div>
        )}
      </div>

      {isLoading && (
        <div className="rounded-xl border border-emerald-800/40 bg-emerald-950/20 p-8 flex flex-col items-center gap-4">
          <div className="flex h-14 w-14 items-center justify-center rounded-full bg-emerald-600/20 ring-2 ring-emerald-600/30 ring-offset-2 ring-offset-transparent">
            <IconBrain size={28} className="text-emerald-400 animate-pulse" />
          </div>
          <div className="text-center">
            <p className="text-sm font-semibold text-zinc-200">{t("comparison.loading.title")}</p>
            <p className="text-xs text-zinc-500 mt-1">{t("comparison.loading.subtitle")}</p>
          </div>
          <div className="flex gap-1">
            {[0, 1, 2].map((i) => (
              <div key={i} className="h-1.5 w-1.5 rounded-full bg-emerald-400 animate-bounce" style={{ animationDelay: `${i * 150}ms` }} />
            ))}
          </div>
        </div>
      )}

      {error && (
        <div className="rounded-xl border border-red-800/40 bg-red-950/20 p-4 flex items-start gap-3">
          <IconAlertTriangle size={16} className="text-red-400 shrink-0 mt-0.5" />
          <div>
            <p className="text-sm font-semibold text-red-300">{t("comparison.error.title")}</p>
            <p className="text-xs text-red-400/80 mt-0.5">{error}</p>
          </div>
        </div>
      )}

      {variations.length > 0 && !isLoading && (
        <div className="space-y-3">
          <p className="text-xs font-semibold text-zinc-500 uppercase tracking-wider">
            {t("comparison.metricsVariation", { labelA, labelB })}
          </p>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
            {variations.map((v, i) => (
              <MetricVariationCard key={i} metric={v} labelA={labelA} labelB={labelB} />
            ))}
          </div>
        </div>
      )}

      {result && !isLoading && (
        <div className="rounded-xl border border-zinc-800 bg-zinc-900/50 overflow-hidden">
          <div className={cn("border-b border-zinc-800 p-5", veredicto?.bg)}>
            <div className="flex flex-col sm:flex-row items-center gap-6">
              <div className="shrink-0">
                <ScoreGauge score={result.score} label={result.scoreLabel} />
              </div>
              <div className="flex-1 space-y-2">
                <div className="flex items-center gap-2 flex-wrap">
                  <p className="text-xs font-semibold text-zinc-400 uppercase tracking-wider">{t("comparison.verdict")}</p>
                  {veredicto && (
                    <span
                      className="text-xs font-bold px-2 py-0.5 rounded-full"
                      style={{ color: veredicto.color, backgroundColor: `${veredicto.color}18`, border: `1px solid ${veredicto.color}30` }}
                    >
                      {t(`comparison.verdictLabels.${veredicto.key}`)}
                    </span>
                  )}
                </div>
                <p className="text-sm text-zinc-200 leading-relaxed">{result.resumo}</p>
              </div>
            </div>
          </div>

          <div className="p-5 space-y-5">
            {result.achados.length > 0 && (
              <div>
                <p className="text-xs font-semibold text-zinc-500 uppercase tracking-wider mb-3">{t("comparison.findings")}</p>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  {result.achados.map((finding, i) => (
                    <ComparisonFindingCard key={i} finding={finding} />
                  ))}
                </div>
              </div>
            )}

            {result.diagnostico && (
              <DiagnosisSection text={result.diagnostico} />
            )}

            {result.plano.length > 0 && (
              <div>
                <p className="text-xs font-semibold text-zinc-500 uppercase tracking-wider mb-3">{t("comparison.actionPlan")}</p>
                <div className="space-y-3">
                  {result.plano.map((action, i) => (
                    <ComparisonActionCard key={i} action={action} />
                  ))}
                </div>
              </div>
            )}
          </div>
        </div>
      )}

      {!result && !isLoading && !error && (
        <div className="rounded-xl border border-dashed border-zinc-700/50 bg-zinc-900/20 p-10 flex flex-col items-center gap-3 text-center">
          <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-zinc-800">
            <IconTrendingUp size={24} className="text-zinc-600" />
          </div>
          <div>
            <p className="text-sm font-semibold text-zinc-400">{t("comparison.readyToCompare.title")}</p>
            <p className="text-xs text-zinc-600 mt-1 max-w-xs">
              {t("comparison.readyToCompare.description")}
            </p>
          </div>
          <div className="mt-2 text-xs text-zinc-600 space-y-1">
            <p>{t("comparison.readyToCompare.hint1")}</p>
            <p>{t("comparison.readyToCompare.hint2")}</p>
          </div>
        </div>
      )}

      <div className="flex items-center justify-center pt-2">
        <Link href={`/${slug}/ai`} className="flex items-center gap-1.5 text-xs text-zinc-600 hover:text-zinc-400 transition-colors">
          <IconPlayerPlay size={11} />
          {t("comparison.goToFullAnalysis")}
        </Link>
      </div>
    </div>
  );
}
