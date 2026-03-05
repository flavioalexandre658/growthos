"use client";

import { useState, useRef, useMemo, useEffect, useCallback } from "react";
import Link from "next/link";
import {
  IconSparkles,
  IconRefresh,
  IconBrain,
  IconChartBar,
  IconTrendingUp,
  IconPlayerPlay,
  IconAlertTriangle,
  IconCheck,
  IconChevronDown,
  IconChevronRight,
  IconHistory,
  IconCircleCheck,
  IconInfoCircle,
  IconClock,
} from "@tabler/icons-react";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { useOrganization } from "@/components/providers/organization-provider";
import { useFunnel } from "@/hooks/queries/use-funnel";
import { useFixedCosts } from "@/hooks/queries/use-fixed-costs";
import { useVariableCosts } from "@/hooks/queries/use-variable-costs";
import { useRevenueSegments } from "@/hooks/queries/use-revenue-segments";
import { useTopProducts } from "@/hooks/queries/use-top-products";
import { useChannels } from "@/hooks/queries/use-channels";
import { buildProfitAndLoss } from "@/utils/build-pl";
import { cn } from "@/lib/utils";
import dayjs from "dayjs";
import relativeTime from "dayjs/plugin/relativeTime";
import "dayjs/locale/pt-br";
import type { IFixedCost, IVariableCost } from "@/interfaces/cost.interface";
import type {
  IAnalysisResult,
  IAnalysisFinding,
  IAnalysisAction,
  IAnalysisDiagnosis,
  IAnalysisHistoryEntry,
} from "@/interfaces/ai.interface";

dayjs.extend(relativeTime);
dayjs.locale("pt-br");

const DEFAULT_FILTER = { period: "30d" as const };

function getHistoryKey(orgId: string) {
  return `growthOS:ai:history:${orgId}`;
}

function getActionsKey(orgId: string) {
  return `growthOS:ai:actions:${orgId}`;
}

function loadHistory(orgId: string): IAnalysisHistoryEntry[] {
  if (typeof window === "undefined") return [];
  try {
    const raw = localStorage.getItem(getHistoryKey(orgId));
    return raw ? (JSON.parse(raw) as IAnalysisHistoryEntry[]) : [];
  } catch {
    return [];
  }
}

function saveHistory(orgId: string, entries: IAnalysisHistoryEntry[]) {
  if (typeof window === "undefined") return;
  localStorage.setItem(getHistoryKey(orgId), JSON.stringify(entries.slice(0, 5)));
}

function loadDoneActions(orgId: string): Record<string, string> {
  if (typeof window === "undefined") return {};
  try {
    const raw = localStorage.getItem(getActionsKey(orgId));
    return raw ? (JSON.parse(raw) as Record<string, string>) : {};
  } catch {
    return {};
  }
}

function saveDoneActions(orgId: string, done: Record<string, string>) {
  if (typeof window === "undefined") return;
  localStorage.setItem(getActionsKey(orgId), JSON.stringify(done));
}

function ScoreGauge({ score, label }: { score: number; label: string }) {
  const radius = 52;
  const circumference = Math.PI * radius;
  const strokeLength = (score / 100) * circumference;

  const color =
    score >= 70 ? "#10b981" : score >= 40 ? "#f59e0b" : "#ef4444";

  return (
    <div className="flex flex-col items-center justify-center gap-2">
      <div className="relative w-32 h-20 overflow-hidden">
        <svg width="128" height="80" viewBox="0 0 128 80" fill="none">
          <path
            d="M 12 76 A 52 52 0 0 1 116 76"
            stroke="#27272a"
            strokeWidth="12"
            fill="none"
            strokeLinecap="round"
          />
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
        style={{
          color,
          backgroundColor: `${color}18`,
          border: `1px solid ${color}30`,
        }}
      >
        {label}
      </span>
    </div>
  );
}

function FindingCard({ finding }: { finding: IAnalysisFinding }) {
  const config = {
    critical: {
      accent: "border-red-500/40 bg-red-950/20",
      left: "bg-red-500",
      badge: "bg-red-500/15 text-red-400 border-red-500/30",
      label: "Crítico",
      icon: <IconAlertTriangle size={13} className="text-red-400" />,
    },
    warning: {
      accent: "border-amber-500/40 bg-amber-950/10",
      left: "bg-amber-500",
      badge: "bg-amber-500/15 text-amber-400 border-amber-500/30",
      label: "Atenção",
      icon: <IconInfoCircle size={13} className="text-amber-400" />,
    },
    good: {
      accent: "border-emerald-500/40 bg-emerald-950/10",
      left: "bg-emerald-500",
      badge: "bg-emerald-500/15 text-emerald-400 border-emerald-500/30",
      label: "Bom",
      icon: <IconCircleCheck size={13} className="text-emerald-400" />,
    },
  }[finding.severity];

  return (
    <div className={cn("relative rounded-lg border overflow-hidden", config.accent)}>
      <div className={cn("absolute left-0 top-0 bottom-0 w-0.5", config.left)} />
      <div className="pl-4 pr-3 py-3">
        <div className="flex items-start justify-between gap-2 mb-1">
          <div className="flex items-center gap-1.5">
            {config.icon}
            <span className="text-xs font-semibold text-zinc-200">{finding.title}</span>
          </div>
          <span
            className={cn(
              "shrink-0 text-[10px] font-bold px-1.5 py-0.5 rounded-md border",
              config.badge,
            )}
          >
            {config.label}
          </span>
        </div>
        <p className="text-base font-black text-zinc-100 leading-tight mb-1">{finding.metric}</p>
        <p className="text-[11px] text-zinc-500 leading-relaxed">{finding.description}</p>
      </div>
    </div>
  );
}

function DiagnosisItem({ diagnosis }: { diagnosis: IAnalysisDiagnosis }) {
  const [open, setOpen] = useState(false);

  const config = {
    critical: { color: "text-red-400", bg: "bg-red-500/15 border-red-500/30", label: "Crítico" },
    warning: { color: "text-amber-400", bg: "bg-amber-500/15 border-amber-500/30", label: "Atenção" },
    info: { color: "text-indigo-400", bg: "bg-indigo-500/15 border-indigo-500/30", label: "Info" },
  }[diagnosis.severity];

  return (
    <div className="rounded-lg border border-zinc-800 overflow-hidden">
      <button
        onClick={() => setOpen((v) => !v)}
        className="w-full flex items-center justify-between gap-3 px-4 py-3 text-left hover:bg-zinc-800/30 transition-colors"
      >
        <div className="flex items-center gap-2.5 min-w-0">
          {open ? (
            <IconChevronDown size={14} className="text-zinc-500 shrink-0" />
          ) : (
            <IconChevronRight size={14} className="text-zinc-500 shrink-0" />
          )}
          <span className="text-sm font-semibold text-zinc-200 truncate">{diagnosis.title}</span>
        </div>
        <span
          className={cn(
            "shrink-0 text-[10px] font-bold px-1.5 py-0.5 rounded-md border",
            config.bg,
            config.color,
          )}
        >
          {config.label}
        </span>
      </button>
      {open && (
        <div className="px-4 pb-4 pt-1 border-t border-zinc-800/60">
          <p className="text-xs text-zinc-400 leading-relaxed">{diagnosis.content}</p>
        </div>
      )}
    </div>
  );
}

function ActionCard({
  action,
  done,
  onToggle,
}: {
  action: IAnalysisAction;
  done: boolean;
  onToggle: () => void;
}) {
  const roiConfig = {
    alto: { label: "ROI Alto", color: "text-emerald-400 bg-emerald-500/15 border-emerald-500/30" },
    medio: { label: "ROI Médio", color: "text-amber-400 bg-amber-500/15 border-amber-500/30" },
    baixo: { label: "ROI Baixo", color: "text-zinc-400 bg-zinc-500/15 border-zinc-500/30" },
  }[action.roi];

  return (
    <div
      className={cn(
        "rounded-xl border p-4 transition-all",
        done
          ? "border-zinc-800/50 bg-zinc-900/30 opacity-60"
          : "border-zinc-800 bg-zinc-900/50 hover:border-zinc-700",
      )}
    >
      <div className="flex items-start gap-3">
        <div
          className={cn(
            "flex h-7 w-7 shrink-0 items-center justify-center rounded-full text-xs font-black",
            done
              ? "bg-emerald-600/20 text-emerald-400"
              : "bg-indigo-600/20 text-indigo-400",
          )}
        >
          {done ? <IconCheck size={14} /> : `#${action.priority}`}
        </div>
        <div className="flex-1 min-w-0">
          <div className="flex flex-wrap items-center gap-2 mb-1.5">
            <p className={cn("text-sm font-bold text-zinc-100", done && "line-through text-zinc-500")}>
              {action.title}
            </p>
            <span className={cn("text-[10px] font-bold px-1.5 py-0.5 rounded-md border", roiConfig.color)}>
              {roiConfig.label}
            </span>
          </div>
          <p className="text-xs text-zinc-400 leading-relaxed mb-2">{action.description}</p>
          <div className="flex items-center justify-between gap-2 flex-wrap">
            <span className="text-[11px] font-semibold text-indigo-400 bg-indigo-500/10 border border-indigo-500/20 px-2 py-0.5 rounded-md">
              Impacto estimado: {action.impact}
            </span>
            <Button
              size="sm"
              variant="ghost"
              onClick={onToggle}
              className={cn(
                "h-6 text-[11px] gap-1 px-2",
                done
                  ? "text-zinc-500 hover:text-zinc-300"
                  : "text-emerald-500 hover:text-emerald-300 hover:bg-emerald-500/10",
              )}
            >
              {done ? (
                <>
                  <IconRefresh size={11} />
                  Desfazer
                </>
              ) : (
                <>
                  <IconCheck size={11} />
                  Marcar como feito
                </>
              )}
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}

function HistoryItem({
  entry,
  onRestore,
}: {
  entry: IAnalysisHistoryEntry;
  onRestore: (result: IAnalysisResult) => void;
}) {
  const scoreColor =
    entry.score >= 70 ? "text-emerald-400 bg-emerald-500/15 border-emerald-500/30" :
    entry.score >= 40 ? "text-amber-400 bg-amber-500/15 border-amber-500/30" :
    "text-red-400 bg-red-500/15 border-red-500/30";

  return (
    <div className="flex items-center gap-3 rounded-lg border border-zinc-800 bg-zinc-900/30 px-3 py-2.5 hover:bg-zinc-800/40 transition-colors">
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2 mb-0.5">
          <span className={cn("text-[11px] font-bold px-1.5 py-0.5 rounded-md border", scoreColor)}>
            {entry.score}/100
          </span>
          <span className="text-[10px] text-zinc-600 flex items-center gap-1">
            <IconClock size={10} />
            {dayjs(entry.timestamp).fromNow()}
          </span>
        </div>
        <p className="text-[11px] text-zinc-400 truncate">{entry.summary}</p>
        <div className="flex gap-2 mt-1">
          {entry.findingsCounts.critical > 0 && (
            <span className="text-[10px] text-red-400">{entry.findingsCounts.critical} crítico</span>
          )}
          {entry.findingsCounts.warning > 0 && (
            <span className="text-[10px] text-amber-400">{entry.findingsCounts.warning} atenção</span>
          )}
          {entry.findingsCounts.good > 0 && (
            <span className="text-[10px] text-emerald-400">{entry.findingsCounts.good} bom</span>
          )}
        </div>
      </div>
      <Button
        size="sm"
        variant="ghost"
        onClick={() => onRestore(entry.result)}
        className="h-7 text-[11px] px-2 text-zinc-400 hover:text-zinc-100 shrink-0"
      >
        Ver
      </Button>
    </div>
  );
}

function AnalysisResults({
  result,
  orgId,
  onRerun,
  isRunning,
}: {
  result: IAnalysisResult;
  orgId: string;
  onRerun: () => void;
  isRunning: boolean;
}) {
  const [doneActions, setDoneActions] = useState<Record<string, string>>(() =>
    loadDoneActions(orgId),
  );

  const toggleAction = useCallback(
    (title: string) => {
      setDoneActions((prev) => {
        const next = { ...prev };
        if (next[title]) {
          delete next[title];
        } else {
          next[title] = new Date().toISOString();
        }
        saveDoneActions(orgId, next);
        return next;
      });
    },
    [orgId],
  );

  const critical = result.findings.filter((f) => f.severity === "critical");
  const warning = result.findings.filter((f) => f.severity === "warning");
  const good = result.findings.filter((f) => f.severity === "good");

  return (
    <div className="space-y-5">
      <div className="rounded-xl border border-zinc-800 bg-zinc-900/50 overflow-hidden">
        <div className="flex items-center justify-between p-4 border-b border-zinc-800">
          <div className="flex items-center gap-2">
            <IconSparkles size={15} className="text-indigo-400" />
            <span className="text-sm font-bold text-zinc-100">Resultado da Análise</span>
          </div>
          <Button
            size="sm"
            variant="outline"
            onClick={onRerun}
            disabled={isRunning}
            className="border-zinc-700 text-zinc-300 hover:bg-zinc-800 h-7 gap-1.5 text-xs"
          >
            <IconRefresh size={12} />
            Refazer
          </Button>
        </div>

        <div className="p-5">
          <div className="flex flex-col sm:flex-row items-center gap-6 mb-5 pb-5 border-b border-zinc-800">
            <div className="shrink-0">
              <ScoreGauge score={result.score} label={result.scoreLabel} />
            </div>
            <div>
              <p className="text-xs font-semibold text-zinc-400 uppercase tracking-wider mb-1">
                Resumo Executivo
              </p>
              <p className="text-sm text-zinc-200 leading-relaxed">{result.summary}</p>
            </div>
          </div>

          {result.findings.length > 0 && (
            <div className="mb-5">
              <p className="text-xs font-semibold text-zinc-500 uppercase tracking-wider mb-3">
                Achados
              </p>
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
                {[...critical, ...warning, ...good].map((finding, i) => (
                  <FindingCard key={i} finding={finding} />
                ))}
              </div>
            </div>
          )}

          {result.diagnoses.length > 0 && (
            <div className="mb-5">
              <p className="text-xs font-semibold text-zinc-500 uppercase tracking-wider mb-3">
                Diagnóstico
              </p>
              <div className="space-y-2">
                {result.diagnoses.map((diag, i) => (
                  <DiagnosisItem key={i} diagnosis={diag} />
                ))}
              </div>
            </div>
          )}

          {result.actions.length > 0 && (
            <div>
              <p className="text-xs font-semibold text-zinc-500 uppercase tracking-wider mb-3">
                Plano de Ação
              </p>
              <div className="space-y-3">
                {result.actions.map((action, i) => (
                  <ActionCard
                    key={i}
                    action={action}
                    done={!!doneActions[action.title]}
                    onToggle={() => toggleAction(action.title)}
                  />
                ))}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

export function AiContent() {
  const { organization } = useOrganization();
  const orgId = organization?.id;

  const { data: funnel, isPending: funnelLoading } = useFunnel(orgId, DEFAULT_FILTER);
  const { data: fixedCosts, isPending: fixedLoading } = useFixedCosts(orgId);
  const { data: variableCosts, isPending: varLoading } = useVariableCosts(orgId);
  const { data: revenueSegments, isPending: segmentsLoading } = useRevenueSegments(orgId, DEFAULT_FILTER);
  const { data: topProducts } = useTopProducts(orgId, DEFAULT_FILTER);
  const { data: channelsResult } = useChannels(orgId, { period: "30d", limit: 10 });

  const [result, setResult] = useState<IAnalysisResult | null>(null);
  const [isRunning, setIsRunning] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [history, setHistory] = useState<IAnalysisHistoryEntry[]>([]);
  const [showHistory, setShowHistory] = useState(false);
  const abortRef = useRef<AbortController | null>(null);

  useEffect(() => {
    if (orgId) {
      setHistory(loadHistory(orgId));
    }
  }, [orgId]);

  const isDataLoading = funnelLoading || fixedLoading || varLoading || segmentsLoading;

  const pl = useMemo(() => {
    if (isDataLoading) return null;
    if (!funnel) return null;
    if (!fixedCosts?.length && !variableCosts?.length) return null;
    return buildProfitAndLoss(
      funnel.revenue ?? 0,
      (fixedCosts ?? []) as IFixedCost[],
      (variableCosts ?? []) as IVariableCost[],
      30,
      revenueSegments ?? undefined,
    );
  }, [funnel, fixedCosts, variableCosts, isDataLoading, revenueSegments]);

  const handleAnalyze = async () => {
    if (!orgId) return;
    if (abortRef.current) abortRef.current.abort();
    abortRef.current = new AbortController();

    setResult(null);
    setError(null);
    setIsRunning(true);

    const plData = pl
      ? {
          receita_bruta: `R$ ${(pl.grossRevenueInCents / 100).toFixed(2)}`,
          custos_variaveis: `R$ ${(pl.totalVariableCostsInCents / 100).toFixed(2)}`,
          lucro_operacional: `R$ ${(pl.operatingProfitInCents / 100).toFixed(2)}`,
          custos_fixos: `R$ ${(pl.totalFixedCostsInCents / 100).toFixed(2)}`,
          lucro_liquido: `R$ ${(pl.netProfitInCents / 100).toFixed(2)}`,
          margem_liquida: `${pl.marginPercent}%`,
          periodo_dias: pl.periodDays,
          detalhamento_fixos: pl.fixedCostsBreakdown.map((c) => ({
            nome: c.name,
            valor_mensal: `R$ ${(c.amountInCents / 100).toFixed(2)}/mês`,
            valor_periodo: `R$ ${(c.calculatedInCents / 100).toFixed(2)}`,
          })),
          detalhamento_variaveis: pl.variableCostsBreakdown.map((c) => ({
            nome: c.name,
            percentual: `${(c.amountInCents / 100).toFixed(2)}%`,
            aplicado_sobre: c.applyTo === "all" ? "toda receita" : `${c.applyTo} = ${c.applyToValue}`,
            receita_base: `R$ ${(c.appliedRevenueInCents / 100).toFixed(2)}`,
            valor_calculado: `R$ ${(c.calculatedInCents / 100).toFixed(2)}`,
          })),
        }
      : null;

    const funnelData = funnel
      ? {
          steps: funnel.steps.map((s) => ({ etapa: s.label, valor: s.value })),
          taxas: funnel.rates.map((r) => ({ taxa: r.label, valor: r.value })),
          ticket_medio: funnel.ticketMedio,
          ...(funnel.checkoutAbandoned !== undefined && {
            checkout_abandonado: funnel.checkoutAbandoned,
          }),
        }
      : null;

    const topChannels = channelsResult?.data
      ?.slice(0, 5)
      .map((c) => ({
        canal: c.channel,
        receita: `R$ ${(c.revenue / 100).toFixed(2)}`,
        conversao: c.conversion_rate,
        ticket_medio: `R$ ${(c.ticket_medio / 100).toFixed(2)}`,
      }));

    const topProds = topProducts?.slice(0, 5).map((p) => ({
      produto: p.productName,
      receita: `R$ ${(p.revenueInCents / 100).toFixed(2)}`,
      pagamentos: p.purchases,
    }));

    const perfil = organization?.aiProfile
      ? {
          segmento: organization.aiProfile.segment,
          modelo: organization.aiProfile.model,
          regime_tributario: organization.aiProfile.taxRegime,
          meta_mensal: organization.aiProfile.monthlyGoal
            ? `R$ ${organization.aiProfile.monthlyGoal.toFixed(2)}`
            : undefined,
        }
      : null;

    const data: Record<string, unknown> = {
      ...(plData && { pl: plData }),
      ...(funnelData && { funil: funnelData }),
      ...(topChannels?.length && { top_canais: topChannels }),
      ...(topProds?.length && { top_produtos: topProds }),
      ...(perfil && { perfil }),
      periodo: DEFAULT_FILTER,
    };

    try {
      const res = await fetch("/api/ai/analyze", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          type: "analysis",
          orgName: organization?.name ?? "",
          language: organization?.language ?? "pt-BR",
          currency: organization?.currency ?? "BRL",
          country: organization?.country ?? "BR",
          data,
        }),
        signal: abortRef.current.signal,
      });

      if (!res.ok) {
        const errBody = await res.json().catch(() => ({}));
        throw new Error((errBody as { error?: string }).error ?? "Erro ao conectar com a IA");
      }

      const parsed = (await res.json()) as IAnalysisResult;
      setResult(parsed);

      if (orgId) {
        const entry: IAnalysisHistoryEntry = {
          id: crypto.randomUUID(),
          timestamp: new Date().toISOString(),
          score: parsed.score,
          scoreLabel: parsed.scoreLabel,
          summary: parsed.summary,
          findingsCounts: {
            critical: parsed.findings.filter((f) => f.severity === "critical").length,
            warning: parsed.findings.filter((f) => f.severity === "warning").length,
            good: parsed.findings.filter((f) => f.severity === "good").length,
          },
          actionsCount: parsed.actions.length,
          result: parsed,
        };

        const updatedHistory = [entry, ...loadHistory(orgId)].slice(0, 5);
        saveHistory(orgId, updatedHistory);
        setHistory(updatedHistory);
      }
    } catch (err: unknown) {
      if (err instanceof Error && err.name !== "AbortError") {
        setError(err.message ?? "Erro desconhecido ao obter análise.");
      }
    } finally {
      setIsRunning(false);
    }
  };

  const canAnalyze = !isDataLoading && (pl || funnel);

  return (
    <div className="space-y-6">
      <div>
        <div className="flex items-center gap-2.5">
          <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-indigo-600/20 ring-1 ring-inset ring-indigo-600/30">
            <IconBrain size={16} className="text-indigo-400" />
          </div>
          <div>
            <h1 className="text-lg font-bold text-zinc-100">Análise com IA</h1>
            <p className="text-xs text-zinc-500">
              Insights inteligentes sobre performance, custos e oportunidades
            </p>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
        <button
          onClick={handleAnalyze}
          disabled={!canAnalyze || isRunning}
          className="group flex flex-col items-start gap-3 rounded-xl border border-zinc-800 bg-zinc-900/50 p-5 text-left transition-all hover:border-indigo-600/40 hover:bg-indigo-600/5 disabled:opacity-50 disabled:cursor-not-allowed"
        >
          <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-indigo-600/20 group-hover:bg-indigo-600/30 transition-colors">
            <IconChartBar size={20} className="text-indigo-400" />
          </div>
          <div>
            <p className="text-sm font-semibold text-zinc-100">Análise Completa</p>
            <p className="mt-0.5 text-xs text-zinc-500">
              P&L, funil, canais, produtos e oportunidades de melhoria
            </p>
          </div>
          <div className="flex items-center gap-1.5 text-xs font-semibold text-indigo-400">
            <IconPlayerPlay size={12} />
            {isRunning ? "Analisando..." : "Executar"}
          </div>
        </button>

        <Link
          href={`/${organization?.slug ?? ""}/ai/comparativo`}
          className="group flex flex-col items-start gap-3 rounded-xl border border-zinc-800 bg-zinc-900/50 p-5 text-left transition-all hover:border-emerald-600/40 hover:bg-emerald-600/5"
        >
          <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-emerald-600/20 group-hover:bg-emerald-600/30 transition-colors">
            <IconTrendingUp size={20} className="text-emerald-400" />
          </div>
          <div>
            <p className="text-sm font-semibold text-zinc-100">Comparar Períodos</p>
            <p className="mt-0.5 text-xs text-zinc-500">
              Compare métricas entre dois períodos distintos
            </p>
          </div>
          <div className="flex items-center gap-1.5 text-xs font-semibold text-emerald-400">
            <IconPlayerPlay size={12} />
            Comparar
          </div>
        </Link>

        <div className="flex flex-col items-start gap-3 rounded-xl border border-dashed border-zinc-700/50 bg-zinc-900/20 p-5 text-left">
          <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-zinc-800/50">
            <IconSparkles size={20} className="text-zinc-600" />
          </div>
          <div>
            <p className="text-sm font-semibold text-zinc-500">Em Breve</p>
            <p className="mt-0.5 text-xs text-zinc-600">
              Previsões, alertas automáticos e relatórios agendados
            </p>
          </div>
        </div>
      </div>

      {isDataLoading && (
        <div className="space-y-3">
          <Skeleton className="h-6 w-48 bg-zinc-800" />
          <Skeleton className="h-32 w-full rounded-xl bg-zinc-800" />
        </div>
      )}

      {isRunning && !result && (
        <div className="rounded-xl border border-indigo-800/40 bg-indigo-950/20 p-8 flex flex-col items-center gap-4">
          <div className="flex h-14 w-14 items-center justify-center rounded-full bg-indigo-600/20 ring-2 ring-indigo-600/30 ring-offset-2 ring-offset-transparent">
            <IconBrain size={28} className="text-indigo-400 animate-pulse" />
          </div>
          <div className="text-center">
            <p className="text-sm font-semibold text-zinc-200">Analisando seus dados...</p>
            <p className="text-xs text-zinc-500 mt-1">
              A IA está processando P&L, funil, canais e produtos
            </p>
          </div>
          <div className="flex gap-1">
            {[0, 1, 2].map((i) => (
              <div
                key={i}
                className="h-1.5 w-1.5 rounded-full bg-indigo-400 animate-bounce"
                style={{ animationDelay: `${i * 150}ms` }}
              />
            ))}
          </div>
        </div>
      )}

      {error && (
        <div className="rounded-xl border border-red-800/40 bg-red-950/20 p-4 flex items-start gap-3">
          <IconAlertTriangle size={16} className="text-red-400 shrink-0 mt-0.5" />
          <div>
            <p className="text-sm font-semibold text-red-300">Erro na análise</p>
            <p className="text-xs text-red-400/80 mt-0.5">{error}</p>
          </div>
        </div>
      )}

      {result && (
        <AnalysisResults
          result={result}
          orgId={orgId ?? ""}
          onRerun={handleAnalyze}
          isRunning={isRunning}
        />
      )}

      {history.length > 0 && (
        <div className="rounded-xl border border-zinc-800 bg-zinc-900/30 overflow-hidden">
          <button
            onClick={() => setShowHistory((v) => !v)}
            className="w-full flex items-center justify-between px-5 py-3 hover:bg-zinc-800/30 transition-colors"
          >
            <div className="flex items-center gap-2">
              <IconHistory size={14} className="text-zinc-500" />
              <span className="text-xs font-semibold text-zinc-400">
                Histórico de Análises ({history.length})
              </span>
            </div>
            {showHistory ? (
              <IconChevronDown size={14} className="text-zinc-600" />
            ) : (
              <IconChevronRight size={14} className="text-zinc-600" />
            )}
          </button>
          {showHistory && (
            <div className="px-4 pb-4 space-y-2">
              {history.map((entry) => (
                <HistoryItem
                  key={entry.id}
                  entry={entry}
                  onRestore={(r) => setResult(r)}
                />
              ))}
            </div>
          )}
        </div>
      )}

    </div>
  );
}
