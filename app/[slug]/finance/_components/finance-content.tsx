"use client";

import { Suspense } from "react";
import { useFinancial } from "@/hooks/queries/use-financial";
import { useDaily } from "@/hooks/queries/use-daily";
import { useOrganization } from "@/components/providers/organization-provider";
import { IDateFilter } from "@/interfaces/dashboard.interface";
import { PeriodFilter } from "@/app/[slug]/_components/period-filter";
import { FinanceKpiCards } from "./finance-kpi-cards";
import { RevenueLineChart } from "./revenue-line-chart";
import { FinanceBreakdownTable } from "./finance-breakdown-table";
import { ProfitLossWaterfall } from "@/app/[slug]/costs/_components/profit-loss-waterfall";
import {
  IconAlertTriangle,
  IconInfoCircle,
  IconChevronDown,
  IconChevronUp,
} from "@tabler/icons-react";
import { useState } from "react";

interface FinanceContentProps {
  filter: IDateFilter;
}

const PL_STEPS = [
  {
    label: "Receita Bruta",
    desc: "Total bruto de pagamentos confirmados no período.",
  },
  {
    label: "− Descontos",
    desc: "Cupons e descontos enviados via campo discount no evento de pagamento.",
    positive: false,
  },
  {
    label: "− Custos Variáveis",
    desc: "Percentuais configurados na plataforma (impostos, comissões etc.) aplicados sobre a receita.",
    positive: false,
  },
  {
    label: "= Lucro Operacional",
    desc: "Resultado após descontos e custos variáveis configurados.",
    highlight: true,
  },
  {
    label: "− Custos Fixos",
    desc: "Valores mensais fixos configurados na plataforma, rateados proporcionalmente ao período.",
    positive: false,
  },
  {
    label: "= Lucro Líquido",
    desc: "O que de fato sobrou após todos os custos deduzidos.",
    highlight: true,
  },
  { label: "Margem Líquida", desc: "Lucro Líquido ÷ Receita Bruta × 100." },
];

export function FinanceContent({ filter }: FinanceContentProps) {
  const { organization } = useOrganization();
  const orgId = organization?.id;
  const [showExplanation, setShowExplanation] = useState(false);

  const { data: financial, isPending: financialLoading } = useFinancial(
    orgId,
    filter,
  );
  const { data: dailyResult, isPending: dailyLoading } = useDaily(
    orgId,
    filter,
  );

  const pl = financial?.pl ?? null;
  const periodDays = financial?.periodDays ?? 30;
  const isSubMonth = periodDays < 30;

  return (
    <div className="space-y-4">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-lg font-bold text-zinc-100">Financeiro</h1>
          <p className="text-xs text-zinc-500">
            Receita, custos, resultado e oportunidades do período
          </p>
        </div>
        <Suspense>
          <PeriodFilter filter={filter} />
        </Suspense>
      </div>

      {pl && isSubMonth && pl.totalFixedCostsInCents > 0 && (
        <div className="flex items-start gap-2.5 rounded-xl border border-amber-500/20 bg-amber-500/5 px-4 py-3">
          <IconAlertTriangle
            size={15}
            className="text-amber-400 mt-0.5 shrink-0"
          />
          <p className="text-xs text-amber-300">
            Custos fixos estão sendo rateados proporcionalmente ao período
            selecionado ({periodDays} dia{periodDays !== 1 ? "s" : ""} de 30).
            Para visualizar o P&L completo mensal, selecione um período de 30
            dias.
          </p>
        </div>
      )}

      <FinanceKpiCards data={financial} isLoading={financialLoading} />

      <ProfitLossWaterfall pl={pl} isLoading={financialLoading} />

      <RevenueLineChart data={dailyResult?.rows} pl={pl} isLoading={dailyLoading} />

      <div className="grid grid-cols-1 xl:grid-cols-2 gap-4">
        <FinanceBreakdownTable
          title="Receita por Método de Pagamento"
          subtitle="Distribuição do faturamento por forma de pagamento"
          rows={
            financial?.byPaymentMethod.map((r) => ({
              name: r.method,
              payments: r.payments,
              revenue: r.revenue,
              percentage: r.percentage,
            })) ?? []
          }
          isLoading={financialLoading}
        />
        <FinanceBreakdownTable
          title="Receita por Categoria"
          subtitle="Distribuição do faturamento por categoria de produto"
          rows={
            financial?.byCategory.map((r) => ({
              name: r.category,
              payments: r.payments,
              revenue: r.revenue,
              percentage: r.percentage,
            })) ?? []
          }
          isLoading={financialLoading}
        />
      </div>

      <div className="rounded-xl border border-zinc-800 bg-zinc-900/30 overflow-hidden">
        <button
          onClick={() => setShowExplanation((v) => !v)}
          className="w-full flex items-center justify-between px-5 py-3.5 hover:bg-zinc-800/30 transition-colors"
        >
          <div className="flex items-center gap-2">
            <IconInfoCircle size={15} className="text-zinc-500" />
            <span className="text-sm font-medium text-zinc-300">
              Como funciona o P&L
            </span>
          </div>
          {showExplanation ? (
            <IconChevronUp size={14} className="text-zinc-500" />
          ) : (
            <IconChevronDown size={14} className="text-zinc-500" />
          )}
        </button>

        {showExplanation && (
          <div className="px-5 pb-5 space-y-3 border-t border-zinc-800">
            <p className="text-xs text-zinc-500 pt-4">
              O P&L calcula o resultado financeiro real do negócio a partir dos
              eventos de pagamento coletados.
            </p>
            <div className="space-y-2">
              {PL_STEPS.map((step) => (
                <div
                  key={step.label}
                  className={`flex gap-3 rounded-lg px-3 py-2.5 ${step.highlight ? "bg-zinc-800/50 border border-zinc-700/50" : ""}`}
                >
                  <div className="min-w-[160px]">
                    <span
                      className={`text-xs font-semibold font-mono ${step.positive === false ? "text-red-400" : step.highlight ? "text-indigo-300" : "text-zinc-300"}`}
                    >
                      {step.label}
                    </span>
                  </div>
                  <span className="text-xs text-zinc-500">{step.desc}</span>
                </div>
              ))}
            </div>
            <div className="rounded-lg bg-zinc-800/50 border border-zinc-700/50 px-3 py-2.5 space-y-1">
              <p className="text-xs font-semibold text-zinc-400">
                Sobre custos variáveis segmentados
              </p>
              <p className="text-xs text-zinc-500">
                Cada custo variável pode ser configurado para incidir apenas
                sobre a receita de um método de pagamento específico ou tipo de
                cobrança. Configure seus custos em{" "}
                <strong className="text-zinc-400">Custos</strong>.
              </p>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
