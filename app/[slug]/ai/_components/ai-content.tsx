"use client";

import { useState, useRef, useMemo } from "react";
import {
  IconSparkles,
  IconRefresh,
  IconChevronDown,
  IconChevronUp,
  IconPlayerPlay,
  IconBrain,
  IconChartBar,
  IconTrendingUp,
} from "@tabler/icons-react";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { useOrganization } from "@/components/providers/organization-provider";
import { useFunnel } from "@/hooks/queries/use-funnel";
import { useFixedCosts } from "@/hooks/queries/use-fixed-costs";
import { useVariableCosts } from "@/hooks/queries/use-variable-costs";
import { useRevenueSegments } from "@/hooks/queries/use-revenue-segments";
import { buildProfitAndLoss } from "@/utils/build-pl";
import { ComparisonDialog } from "@/app/[slug]/costs/_components/comparison-dialog";
import type { IFixedCost, IVariableCost } from "@/interfaces/cost.interface";

const DEFAULT_FILTER = { period: "30d" as const };

export function AiContent() {
  const { organization } = useOrganization();
  const orgId = organization?.id;

  const { data: funnel, isPending: funnelLoading } = useFunnel(orgId, DEFAULT_FILTER);
  const { data: fixedCosts, isPending: fixedLoading } = useFixedCosts(orgId);
  const { data: variableCosts, isPending: varLoading } = useVariableCosts(orgId);
  const { data: revenueSegments, isPending: segmentsLoading } = useRevenueSegments(orgId, DEFAULT_FILTER);

  const [analysis, setAnalysis] = useState("");
  const [isStreaming, setIsStreaming] = useState(false);
  const [isExpanded, setIsExpanded] = useState(true);
  const [comparisonOpen, setComparisonOpen] = useState(false);
  const abortRef = useRef<AbortController | null>(null);

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
      revenueSegments ?? undefined
    );
  }, [funnel, fixedCosts, variableCosts, isDataLoading, revenueSegments]);

  const handleAnalyze = async () => {
    if (!pl || !funnel) return;
    if (abortRef.current) abortRef.current.abort();
    abortRef.current = new AbortController();

    setAnalysis("");
    setIsStreaming(true);
    setIsExpanded(true);

    const data = {
      pl: {
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
      },
      funil: {
        steps: funnel.steps.map((s) => ({ etapa: s.label, valor: s.value })),
        taxas: funnel.rates.map((r) => ({ taxa: r.label, valor: r.value })),
        ticket_medio: funnel.ticketMedio,
        ...(funnel.checkoutAbandoned !== undefined && { checkout_abandonado: funnel.checkoutAbandoned }),
      },
      periodo: DEFAULT_FILTER,
    };

    try {
      const res = await fetch("/api/ai/analyze", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ type: "analysis", orgName: organization?.name ?? "", data }),
        signal: abortRef.current.signal,
      });

      if (!res.ok || !res.body) throw new Error("Erro ao conectar com IA");

      const reader = res.body.getReader();
      const decoder = new TextDecoder();

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        setAnalysis((prev) => prev + decoder.decode(value, { stream: true }));
      }
    } catch (err: unknown) {
      if (err instanceof Error && err.name !== "AbortError") {
        setAnalysis("Erro ao obter análise. Verifique a configuração do GEMINI_API_KEY.");
      }
    } finally {
      setIsStreaming(false);
    }
  };

  const canAnalyze = !isDataLoading && pl && funnel;

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
          disabled={!canAnalyze || isStreaming}
          className="group flex flex-col items-start gap-3 rounded-xl border border-zinc-800 bg-zinc-900/50 p-5 text-left transition-all hover:border-indigo-600/40 hover:bg-indigo-600/5 disabled:opacity-50 disabled:cursor-not-allowed"
        >
          <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-indigo-600/20 group-hover:bg-indigo-600/30 transition-colors">
            <IconChartBar size={20} className="text-indigo-400" />
          </div>
          <div>
            <p className="text-sm font-semibold text-zinc-100">Análise Completa</p>
            <p className="mt-0.5 text-xs text-zinc-500">
              P&L, funil, custos e oportunidades de melhoria
            </p>
          </div>
          <div className="flex items-center gap-1.5 text-xs font-semibold text-indigo-400">
            <IconPlayerPlay size={12} />
            {isStreaming ? "Analisando..." : "Executar"}
          </div>
        </button>

        <button
          onClick={() => setComparisonOpen(true)}
          disabled={!canAnalyze}
          className="group flex flex-col items-start gap-3 rounded-xl border border-zinc-800 bg-zinc-900/50 p-5 text-left transition-all hover:border-emerald-600/40 hover:bg-emerald-600/5 disabled:opacity-50 disabled:cursor-not-allowed"
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
        </button>

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
        <div className="space-y-4">
          <Skeleton className="h-6 w-48 bg-zinc-800" />
          <Skeleton className="h-32 w-full rounded-xl bg-zinc-800" />
        </div>
      )}

      {analysis && (
        <div className="rounded-xl border border-zinc-800 bg-zinc-900/50 overflow-hidden">
          <div className="flex items-center justify-between p-5 border-b border-zinc-800">
            <div className="flex items-center gap-2">
              <IconSparkles size={16} className="text-indigo-400" />
              <h3 className="text-sm font-bold text-zinc-100">Resultado da Análise</h3>
            </div>
            <div className="flex items-center gap-2">
              {!isStreaming && (
                <Button
                  size="sm"
                  variant="outline"
                  onClick={handleAnalyze}
                  className="border-zinc-700 text-zinc-300 hover:bg-zinc-800 h-7 gap-1.5 text-xs"
                >
                  <IconRefresh size={12} />
                  Refazer
                </Button>
              )}
            </div>
          </div>

          <div className="p-5">
            <div
              className={`prose prose-invert prose-sm max-w-none text-zinc-300 overflow-hidden transition-all duration-300 ${isExpanded ? "max-h-none" : "max-h-48"}`}
              style={{ lineHeight: "1.7" }}
              dangerouslySetInnerHTML={{
                __html: analysis
                  .replace(/^### (.+)$/gm, '<h3 class="text-zinc-100 font-bold text-sm mt-4 mb-2">$1</h3>')
                  .replace(/^## (.+)$/gm, '<h2 class="text-zinc-100 font-bold text-base mt-5 mb-2">$1</h2>')
                  .replace(/^# (.+)$/gm, '<h1 class="text-zinc-100 font-bold text-lg mt-5 mb-2">$1</h1>')
                  .replace(/\*\*(.+?)\*\*/g, '<strong class="text-zinc-100">$1</strong>')
                  .replace(/^- (.+)$/gm, '<li class="ml-4 list-disc text-zinc-300">$1</li>')
                  .replace(/^(\d+)\. (.+)$/gm, '<li class="ml-4 list-decimal text-zinc-300"><span>$2</span></li>')
                  .replace(/\n\n/g, '</p><p class="mb-2">')
                  .replace(/^(.+)$(?!\n<\/)/gm, (m) => m.startsWith("<") ? m : `<p class="mb-2">${m}</p>`),
              }}
            />
            {!isStreaming && (
              <button
                onClick={() => setIsExpanded((v) => !v)}
                className="mt-3 flex items-center gap-1 text-xs text-indigo-400 hover:text-indigo-300 transition-colors"
              >
                {isExpanded ? <><IconChevronUp size={13} /> Mostrar menos</> : <><IconChevronDown size={13} /> Ver análise completa</>}
              </button>
            )}
            {isStreaming && (
              <span className="inline-block w-1.5 h-4 bg-indigo-400 animate-pulse ml-0.5 rounded-sm" />
            )}
          </div>
        </div>
      )}

      <ComparisonDialog
        open={comparisonOpen}
        onOpenChange={setComparisonOpen}
        orgName={organization?.name ?? ""}
        pl={pl ?? undefined}
      />
    </div>
  );
}
