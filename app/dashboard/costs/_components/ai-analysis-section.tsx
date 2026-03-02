"use client";

import { useState, useRef } from "react";
import { IconSparkles, IconRefresh, IconChevronDown, IconChevronUp } from "@tabler/icons-react";
import { Button } from "@/components/ui/button";
import { ComparisonDialog } from "./comparison-dialog";
import type { IProfitAndLoss } from "@/interfaces/cost.interface";
import type { IGenericFunnelData } from "@/interfaces/dashboard.interface";
import type { IDateFilter } from "@/interfaces/dashboard.interface";

interface AiAnalysisSectionProps {
  pl: IProfitAndLoss;
  funnel: IGenericFunnelData;
  filter: IDateFilter;
  orgName: string;
}

export function AiAnalysisSection({
  pl,
  funnel,
  filter,
  orgName,
}: AiAnalysisSectionProps) {
  const [analysis, setAnalysis] = useState("");
  const [isStreaming, setIsStreaming] = useState(false);
  const [isExpanded, setIsExpanded] = useState(false);
  const [comparisonOpen, setComparisonOpen] = useState(false);
  const abortRef = useRef<AbortController | null>(null);

  const handleAnalyze = async () => {
    if (abortRef.current) abortRef.current.abort();
    abortRef.current = new AbortController();

    setAnalysis("");
    setIsStreaming(true);
    setIsExpanded(true);

    const data = {
      pl: {
        receita_bruta: `R$ ${(pl.grossRevenueInCents / 100).toFixed(2)}`,
        custos_fixos: `R$ ${(pl.totalFixedCostsInCents / 100).toFixed(2)}`,
        custos_variaveis: `R$ ${(pl.totalVariableCostsInCents / 100).toFixed(2)}`,
        lucro_bruto: `R$ ${(pl.grossProfitInCents / 100).toFixed(2)}`,
        lucro_real: `R$ ${(pl.realProfitInCents / 100).toFixed(2)}`,
        margem: `${pl.marginPercent}%`,
        detalhamento_fixos: pl.fixedCostsBreakdown.map((c) => ({
          nome: c.name,
          valor: c.type === "PERCENTAGE" ? `${(c.amountInCents / 100).toFixed(2)}%` : `R$ ${(c.calculatedInCents / 100).toFixed(2)}`,
        })),
        detalhamento_variaveis: pl.variableCostsBreakdown.map((c) => ({
          nome: c.name,
          valor: c.type === "PERCENTAGE" ? `${(c.amountInCents / 100).toFixed(2)}%` : `R$ ${(c.calculatedInCents / 100).toFixed(2)}`,
        })),
      },
      funil: {
        steps: funnel.steps.map((s) => ({ etapa: s.label, valor: s.value })),
        taxas: funnel.rates.map((r) => ({ taxa: r.label, valor: r.value })),
        ticket_medio: funnel.ticketMedio,
        margem_api: funnel.margin,
      },
      periodo: filter,
    };

    try {
      const res = await fetch("/api/ai/analyze", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ type: "analysis", orgName, data }),
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

  return (
    <div className="rounded-xl border border-zinc-800 bg-zinc-900/50 overflow-hidden">
      <div className="flex items-center justify-between p-5 border-b border-zinc-800">
        <div>
          <h3 className="text-sm font-bold text-zinc-100 flex items-center gap-2">
            <IconSparkles size={16} className="text-indigo-400" />
            Análise com IA
          </h3>
          <p className="text-xs text-zinc-500 mt-0.5">
            Gemini analisa seus custos e identifica oportunidades de melhoria
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Button
            size="sm"
            variant="outline"
            onClick={() => setComparisonOpen(true)}
            className="border-zinc-700 text-zinc-300 hover:bg-zinc-800 h-8 gap-1.5 text-xs"
          >
            <IconRefresh size={13} />
            Comparar Períodos
          </Button>
          <Button
            size="sm"
            onClick={handleAnalyze}
            disabled={isStreaming}
            className="bg-indigo-600 hover:bg-indigo-500 text-white h-8 gap-1.5 text-xs"
          >
            <IconSparkles size={13} />
            {isStreaming ? "Analisando..." : "Analisar com IA"}
          </Button>
        </div>
      </div>

      {analysis && (
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
                .replace(/^(.+)$(?!\n<\/)/gm, (m) => m.startsWith('<') ? m : `<p class="mb-2">${m}</p>`),
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
      )}

      <ComparisonDialog
        open={comparisonOpen}
        onOpenChange={setComparisonOpen}
        orgName={orgName}
        pl={pl}
      />
    </div>
  );
}
