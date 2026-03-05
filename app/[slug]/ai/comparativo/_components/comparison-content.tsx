"use client";

import { useState, useRef } from "react";
import Link from "next/link";
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
import { resolvePeriodDays } from "@/utils/resolve-period-days";
import type { IDateFilter, DashboardPeriod } from "@/interfaces/dashboard.interface";
import type { IFixedCost, IVariableCost } from "@/interfaces/cost.interface";
import type {
  IComparisonResult,
  IComparisonFinding,
  IComparisonAction,
  IMetricVariation,
} from "@/interfaces/ai.interface";

const PERIOD_PRESETS: { value: DashboardPeriod; label: string }[] = [
  { value: "today", label: "Hoje" },
  { value: "yesterday", label: "Ontem" },
  { value: "7d", label: "7 dias" },
  { value: "this_month", label: "Este mês" },
  { value: "30d", label: "30 dias" },
  { value: "90d", label: "90 dias" },
];

const ALL_SECTIONS = [
  { key: "overview", label: "Visão Geral" },
  { key: "channels", label: "Canais" },
  { key: "finance", label: "Financeiro" },
  { key: "pages", label: "Páginas" },
  { key: "recurrence", label: "Recorrência" },
  { key: "costs", label: "Custos" },
  { key: "events", label: "Eventos" },
];

function formatBRL(cents: number): string {
  return `R$ ${(cents / 100).toLocaleString("pt-BR", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
}

function formatPct(value: number): string {
  return `${value.toFixed(2)}%`;
}

function calcVariation(a: number, b: number): string {
  if (b === 0) return a > 0 ? "+∞%" : "0%";
  const pct = ((a - b) / Math.abs(b)) * 100;
  const sign = pct >= 0 ? "+" : "";
  return `${sign}${pct.toLocaleString("pt-BR", { minimumFractionDigits: 1, maximumFractionDigits: 1 })}%`;
}

function getPeriodLabel(filter: IDateFilter): string {
  if (filter.start_date && filter.end_date) {
    return `${filter.start_date} → ${filter.end_date}`;
  }
  return PERIOD_PRESETS.find((p) => p.value === filter.period)?.label ?? filter.period ?? "Período";
}

async function fetchAndFormatSection(
  orgId: string,
  section: string,
  filter: IDateFilter,
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
          receita_bruta: formatBRL(revenue),
          ticket_medio: formatBRL(ticket),
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
        receita: formatBRL(c.revenue ?? 0),
        ticket_medio: formatBRL(c.ticket_medio ?? 0),
        conversao: c.conversion_rate,
      }));
      const totalRevenue = result.totalRevenue ?? 0;
      return {
        formatted: { canais: topChannels, receita_total: formatBRL(totalRevenue) },
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
          receita_bruta: formatBRL(pl.grossRevenueInCents),
          custos_variaveis: formatBRL(pl.totalVariableCostsInCents),
          lucro_operacional: formatBRL(pl.operatingProfitInCents),
          custos_fixos: formatBRL(pl.totalFixedCostsInCents),
          lucro_liquido: formatBRL(pl.netProfitInCents),
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
        receita: formatBRL(p.revenue ?? 0),
        conversao: p.conversion_rate,
      }));
      const totalRevenue = result.totalRevenue ?? 0;
      return {
        formatted: { paginas: topPages, receita_total: formatBRL(totalRevenue) },
        metrics: { receita_total: totalRevenue },
      };
    }
    case "recurrence": {
      const mrr = await getMrrOverview(orgId, filter);
      return {
        formatted: {
          mrr: formatBRL(mrr?.mrr ?? 0),
          arr: formatBRL(mrr?.arr ?? 0),
          assinaturas_ativas: mrr?.activeSubscriptions ?? 0,
          arpu: formatBRL(mrr?.arpu ?? 0),
          churn_rate: formatPct(mrr?.churnRate ?? 0),
          ltv_estimado: formatBRL(mrr?.estimatedLtv ?? 0),
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
      const fixedItems = fixedList.map((c) => ({ nome: c.name, valor: formatBRL(c.amountInCents) }));
      const variableItems = variableList.map((c) => ({
        nome: c.name,
        valor: c.type === "PERCENTAGE" ? `${c.amountInCents / 100}%` : formatBRL(c.amountInCents),
        aplica_em: c.applyTo,
      }));
      return {
        formatted: {
          custos_fixos: formatBRL(pl.totalFixedCostsInCents),
          custos_variaveis: formatBRL(pl.totalVariableCostsInCents),
          custo_total: formatBRL(totalCosts),
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
): IMetricVariation[] {
  const metricDefs: Record<string, { label: string; isCurrency: boolean; higherIsBetter: boolean }[]> = {
    overview: [
      { label: "Visitas", isCurrency: false, higherIsBetter: true },
      { label: "Cadastros", isCurrency: false, higherIsBetter: true },
      { label: "Pagamentos", isCurrency: false, higherIsBetter: true },
      { label: "Receita Bruta", isCurrency: true, higherIsBetter: true },
      { label: "Ticket Médio", isCurrency: true, higherIsBetter: true },
      { label: "Taxa de Conversão (%)", isCurrency: false, higherIsBetter: true },
    ],
    channels: [
      { label: "Receita Total", isCurrency: true, higherIsBetter: true },
    ],
    finance: [
      { label: "Receita Bruta", isCurrency: true, higherIsBetter: true },
      { label: "Lucro Líquido", isCurrency: true, higherIsBetter: true },
      { label: "Custos Totais", isCurrency: true, higherIsBetter: false },
      { label: "Margem (%)", isCurrency: false, higherIsBetter: true },
    ],
    pages: [
      { label: "Receita Total", isCurrency: true, higherIsBetter: true },
    ],
    recurrence: [
      { label: "MRR", isCurrency: true, higherIsBetter: true },
      { label: "ARR", isCurrency: true, higherIsBetter: true },
      { label: "Assinaturas Ativas", isCurrency: false, higherIsBetter: true },
      { label: "ARPU", isCurrency: true, higherIsBetter: true },
      { label: "Churn Rate (%)", isCurrency: false, higherIsBetter: false },
      { label: "LTV Estimado", isCurrency: true, higherIsBetter: true },
    ],
    costs: [
      { label: "Custos Fixos", isCurrency: true, higherIsBetter: false },
      { label: "Custos Variáveis", isCurrency: true, higherIsBetter: false },
      { label: "Custo Total", isCurrency: true, higherIsBetter: false },
      { label: "Margem (%)", isCurrency: false, higherIsBetter: true },
    ],
    events: [
      { label: "Total de Eventos", isCurrency: false, higherIsBetter: true },
      { label: "Pagamentos", isCurrency: false, higherIsBetter: true },
      { label: "Cadastros", isCurrency: false, higherIsBetter: true },
      { label: "Pageviews", isCurrency: false, higherIsBetter: true },
      { label: "Checkouts Iniciados", isCurrency: false, higherIsBetter: true },
      { label: "Edições", isCurrency: false, higherIsBetter: true },
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
    const def = defs[i] ?? { label: key, isCurrency: false, higherIsBetter: true };
    const vA = metricsA[key] ?? 0;
    const vB = metricsB[key] ?? 0;
    const delta = vB === 0 ? (vA > 0 ? Infinity : 0) : ((vA - vB) / Math.abs(vB)) * 100;
    const isPositive = def.higherIsBetter ? delta >= 0 : delta <= 0;
    const varStr = calcVariation(vA, vB);
    const fmt = def.isCurrency ? formatBRL : (v: number) => v.toLocaleString("pt-BR", { maximumFractionDigits: 2 });
    return {
      label: def.label,
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
            {opt.label}
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
          Datas
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
  const config = {
    positivo: {
      accent: "border-emerald-500/40 bg-emerald-950/20",
      left: "bg-emerald-500",
      badge: "bg-emerald-500/15 text-emerald-400 border-emerald-500/30",
      label: "Positivo",
      icon: <IconCircleCheck size={13} className="text-emerald-400" />,
    },
    atencao: {
      accent: "border-amber-500/40 bg-amber-950/10",
      left: "bg-amber-500",
      badge: "bg-amber-500/15 text-amber-400 border-amber-500/30",
      label: "Atenção",
      icon: <IconInfoCircle size={13} className="text-amber-400" />,
    },
    critico: {
      accent: "border-red-500/40 bg-red-950/20",
      left: "bg-red-500",
      badge: "bg-red-500/15 text-red-400 border-red-500/30",
      label: "Crítico",
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
  const [open, setOpen] = useState(false);

  return (
    <div className="rounded-lg border border-zinc-800 overflow-hidden">
      <button
        onClick={() => setOpen((v) => !v)}
        className="w-full flex items-center justify-between gap-3 px-4 py-3 text-left hover:bg-zinc-800/30 transition-colors"
      >
        <div className="flex items-center gap-2">
          {open ? <IconChevronDown size={14} className="text-zinc-500 shrink-0" /> : <IconChevronRight size={14} className="text-zinc-500 shrink-0" />}
          <span className="text-sm font-semibold text-zinc-200">Diagnóstico</span>
        </div>
        <span className="text-[10px] font-bold px-1.5 py-0.5 rounded-md border bg-indigo-500/15 text-indigo-400 border-indigo-500/30 shrink-0">
          Análise
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
  const prazoConfig = {
    imediato: { label: "Imediato", color: "text-red-400 bg-red-500/15 border-red-500/30" },
    esta_semana: { label: "Esta semana", color: "text-amber-400 bg-amber-500/15 border-amber-500/30" },
    este_mes: { label: "Este mês", color: "text-zinc-400 bg-zinc-500/15 border-zinc-500/30" },
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
            Impacto estimado: {action.impacto_estimado}
          </span>
        </div>
      </div>
    </div>
  );
}

const VEREDICTO_CONFIG = {
  crescimento: { label: "Crescimento", color: "#10b981", bg: "bg-emerald-950/20 border-emerald-700/40" },
  estabilidade: { label: "Estabilidade", color: "#6366f1", bg: "bg-indigo-950/20 border-indigo-700/40" },
  declinio: { label: "Declínio", color: "#ef4444", bg: "bg-red-950/20 border-red-700/40" },
  anomalia: { label: "Anomalia", color: "#f59e0b", bg: "bg-amber-950/20 border-amber-700/40" },
};

export function ComparisonContent() {
  const { organization } = useOrganization();
  const orgId = organization?.id;
  const slug = organization?.slug ?? "";

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

    const la = getPeriodLabel(filterA);
    const lb = getPeriodLabel(filterB);
    setLabelA(la);
    setLabelB(lb);

    try {
      const [sectionA, sectionB] = await Promise.all([
        fetchAndFormatSection(orgId, section, filterA),
        fetchAndFormatSection(orgId, section, filterB),
      ]);

      const vars = buildVariations(section, sectionA.metrics, sectionB.metrics);
      setVariations(vars);

      const sectionLabel = ALL_SECTIONS.find((s) => s.key === section)?.label ?? section;

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
        throw new Error(errBody.error ?? "Erro ao conectar com a IA");
      }

      const parsed = (await res.json()) as IComparisonResult;
      setResult(parsed);
      setConfigCollapsed(true);
    } catch (err: unknown) {
      if (err instanceof Error && err.name !== "AbortError") {
        setError(err.message ?? "Erro desconhecido.");
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
          Análise com IA
        </Link>
        <span className="text-zinc-700">/</span>
        <div className="flex items-center gap-2">
          <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-emerald-600/20 ring-1 ring-inset ring-emerald-600/30">
            <IconTrendingUp size={14} className="text-emerald-400" />
          </div>
          <div>
            <h1 className="text-lg font-bold text-zinc-100">Comparativo com IA</h1>
            <p className="text-xs text-zinc-500">Compare dois períodos e obtenha diagnóstico estruturado</p>
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
            <span className="text-sm font-semibold text-zinc-200">Configuração</span>
            {result && (
              <span className="text-[10px] font-semibold text-zinc-500 bg-zinc-800 px-1.5 py-0.5 rounded">
                {ALL_SECTIONS.find((s) => s.key === section)?.label} · {labelA} vs {labelB}
              </span>
            )}
          </div>
          {configCollapsed ? <IconChevronRight size={14} className="text-zinc-600" /> : <IconChevronDown size={14} className="text-zinc-600" />}
        </button>

        {!configCollapsed && (
          <div className="px-5 pb-5 space-y-5 border-t border-zinc-800/60">
            <div className="pt-4">
              <p className="text-xs font-semibold text-zinc-400 uppercase tracking-wider mb-2">Seção</p>
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
                    {s.label}
                  </button>
                ))}
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 p-4 rounded-xl border border-zinc-800 bg-zinc-900/30">
              <PeriodPicker label="Período A" filter={filterA} onChange={setFilterA} />
              <PeriodPicker label="Período B" filter={filterB} onChange={setFilterB} />
            </div>

            <Button
              onClick={handleCompare}
              disabled={isLoading || !orgId}
              className="w-full bg-emerald-600 hover:bg-emerald-500 text-white gap-2"
            >
              <IconSparkles size={15} />
              {isLoading ? "Comparando..." : "Comparar com IA"}
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
            <p className="text-sm font-semibold text-zinc-200">Comparando períodos...</p>
            <p className="text-xs text-zinc-500 mt-1">A IA está analisando as variações e identificando padrões</p>
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
            <p className="text-sm font-semibold text-red-300">Erro na comparação</p>
            <p className="text-xs text-red-400/80 mt-0.5">{error}</p>
          </div>
        </div>
      )}

      {variations.length > 0 && !isLoading && (
        <div className="space-y-3">
          <p className="text-xs font-semibold text-zinc-500 uppercase tracking-wider">
            Variação de Métricas — {labelA} vs {labelB}
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
                  <p className="text-xs font-semibold text-zinc-400 uppercase tracking-wider">Veredicto</p>
                  {veredicto && (
                    <span
                      className="text-xs font-bold px-2 py-0.5 rounded-full"
                      style={{ color: veredicto.color, backgroundColor: `${veredicto.color}18`, border: `1px solid ${veredicto.color}30` }}
                    >
                      {veredicto.label}
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
                <p className="text-xs font-semibold text-zinc-500 uppercase tracking-wider mb-3">Achados</p>
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
                <p className="text-xs font-semibold text-zinc-500 uppercase tracking-wider mb-3">Plano de Ação</p>
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
            <p className="text-sm font-semibold text-zinc-400">Pronto para comparar</p>
            <p className="text-xs text-zinc-600 mt-1 max-w-xs">
              Selecione a seção e os dois períodos acima, depois clique em &ldquo;Comparar com IA&rdquo;
            </p>
          </div>
          <div className="mt-2 text-xs text-zinc-600 space-y-1">
            <p>A IA receberá valores em reais com variações pré-calculadas</p>
            <p>e retornará análise estruturada com achados e plano de ação</p>
          </div>
        </div>
      )}

      <div className="flex items-center justify-center pt-2">
        <Link href={`/${slug}/ai`} className="flex items-center gap-1.5 text-xs text-zinc-600 hover:text-zinc-400 transition-colors">
          <IconPlayerPlay size={11} />
          Ir para Análise Completa
        </Link>
      </div>
    </div>
  );
}
