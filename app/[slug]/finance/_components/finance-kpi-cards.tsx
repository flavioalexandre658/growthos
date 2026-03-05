"use client";

import Link from "next/link";
import { IFinancialData } from "@/interfaces/dashboard.interface";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { fmtBRLDecimal, fmtInt } from "@/utils/format";
import {
  IconCurrencyDollar,
  IconWallet,
  IconAlertTriangle,
  IconReceipt,
  IconMinus,
  IconRepeat,
  IconShoppingBag,
  IconTrendingUp,
  IconTrendingDown,
  IconCalculator,
  IconChartPie,
  IconArrowRight,
  IconInfoCircle,
} from "@tabler/icons-react";
import type { IProfitAndLoss } from "@/interfaces/cost.interface";

function computeVariation(current: number, previous: number) {
  const pct = ((current - previous) / previous) * 100;
  return { abs: Math.abs(pct), isUp: pct > 0 };
}

interface VariationBadgeProps {
  current: number;
  previous: number | undefined;
}

function VariationBadge({ current, previous }: VariationBadgeProps) {
  if (!previous || previous === 0) return null;
  const { abs, isUp } = computeVariation(current, previous);
  if (abs < 0.5) {
    return (
      <span className="flex items-center gap-0.5 rounded-md bg-zinc-800/60 px-1.5 py-0.5 text-[10px] font-mono font-medium text-zinc-500">
        <IconMinus size={9} />
        0%
      </span>
    );
  }
  return (
    <span
      className={`flex items-center gap-0.5 rounded-md px-1.5 py-0.5 text-[10px] font-mono font-medium ${
        isUp ? "bg-emerald-950/60 text-emerald-400" : "bg-rose-950/60 text-rose-400"
      }`}
    >
      {isUp ? <IconTrendingUp size={9} /> : <IconTrendingDown size={9} />}
      {isUp ? "+" : "-"}{abs.toFixed(1)}%
    </span>
  );
}

interface KpiCardProps {
  label: string;
  value: string;
  previousLabel?: string;
  subLabel?: string;
  icon: React.ElementType;
  color: string;
  bgColor: string;
  current?: number;
  previous?: number;
  hero?: boolean;
  tooltip?: string;
}

function KpiCard({ label, value, previousLabel, subLabel, icon: Icon, color, bgColor, current, previous, hero, tooltip }: KpiCardProps) {
  const hasPrev = previous !== undefined && previous > 0 && current !== undefined;

  const variationBadge = hasPrev && current !== undefined && previous !== undefined ? (
    <VariationBadge current={current} previous={previous} />
  ) : null;

  return (
    <div className={`rounded-xl border border-zinc-800 bg-zinc-900/50 p-3 sm:p-4 flex flex-col gap-1 ${hero ? "sm:col-span-2" : ""}`}>
      <div className="flex items-center justify-between gap-1 min-w-0">
        <div className="flex items-center gap-1 min-w-0">
          <span className="text-[10px] font-semibold uppercase tracking-tight sm:tracking-widest text-zinc-500 truncate min-w-0">
            {label}
          </span>
          {tooltip && (
            <TooltipProvider delayDuration={100}>
              <Tooltip>
                <TooltipTrigger asChild>
                  <button
                    type="button"
                    className="shrink-0 text-zinc-700 hover:text-zinc-400 transition-colors focus:outline-none"
                    aria-label={`Informação sobre ${label}`}
                  >
                    <IconInfoCircle size={11} />
                  </button>
                </TooltipTrigger>
                <TooltipContent
                  side="top"
                  className="max-w-[220px] bg-zinc-800 border-zinc-700 text-zinc-200 text-xs leading-relaxed"
                >
                  {tooltip}
                </TooltipContent>
              </Tooltip>
            </TooltipProvider>
          )}
        </div>
        <div className={`flex h-5 w-5 sm:h-6 sm:w-6 items-center justify-center rounded-md shrink-0 ${bgColor}`}>
          <Icon size={11} className={color} />
        </div>
      </div>
      <div className="flex flex-col gap-1 sm:flex-row sm:items-baseline sm:gap-1.5">
        <span className={`font-bold font-mono leading-none whitespace-nowrap ${color} ${hero ? "text-xl sm:text-2xl" : "text-base sm:text-lg"}`}>
          {value}
        </span>
        {variationBadge && <span className="flex">{variationBadge}</span>}
      </div>
      {hasPrev && previousLabel && (
        <p className="text-[9px] sm:text-[10px] text-zinc-600 leading-tight truncate">
          vs {previousLabel} anterior
        </p>
      )}
      {!hasPrev && subLabel && (
        <p className="text-[9px] sm:text-[10px] text-zinc-600 leading-tight">{subLabel}</p>
      )}
      {hasPrev && !previousLabel && subLabel && (
        <p className="text-[9px] sm:text-[10px] text-zinc-600 leading-tight">{subLabel}</p>
      )}
    </div>
  );
}

function BlockHeader({ label }: { label: string }) {
  return (
    <p className="text-[10px] font-semibold uppercase tracking-widest text-zinc-600 px-1 pt-1">
      {label}
    </p>
  );
}

function SkeletonCard({ hero }: { hero?: boolean }) {
  return (
    <div className={`rounded-xl border border-zinc-800 bg-zinc-900/50 p-3 sm:p-4 flex flex-col gap-1.5 ${hero ? "sm:col-span-2" : ""}`}>
      <div className="flex items-center justify-between">
        <Skeleton className="h-3 w-20 bg-zinc-800" />
        <Skeleton className="h-6 w-6 rounded-md bg-zinc-800" />
      </div>
      <div className="flex items-baseline gap-1.5">
        <Skeleton className={`bg-zinc-800 ${hero ? "h-9 w-36" : "h-6 w-28"}`} />
        <Skeleton className="h-4 w-10 bg-zinc-800 rounded-md" />
      </div>
      <Skeleton className="h-3 w-32 bg-zinc-800/60 rounded" />
    </div>
  );
}

interface FinanceKpiCardsProps {
  data: IFinancialData | null | undefined;
  isLoading: boolean;
  slug: string;
}

export function FinanceKpiCards({ data, isLoading, slug }: FinanceKpiCardsProps) {
  if (isLoading) {
    return (
      <div className="space-y-3">
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
          <SkeletonCard hero />
          {Array.from({ length: 3 }).map((_, i) => <SkeletonCard key={i} />)}
        </div>
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
          {Array.from({ length: 3 }).map((_, i) => <SkeletonCard key={i} />)}
        </div>
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
          {Array.from({ length: 3 }).map((_, i) => <SkeletonCard key={i} />)}
        </div>
      </div>
    );
  }

  const gross = data?.grossRevenueInCents ?? 0;
  const recurring = data?.revenueByBillingType?.recurring ?? 0;
  const oneTime = data?.revenueByBillingType?.oneTime ?? 0;
  const recurringPct = gross > 0 ? ((recurring / gross) * 100).toFixed(1) : "0";
  const oneTimePct = gross > 0 ? ((oneTime / gross) * 100).toFixed(1) : "0";

  const pl: IProfitAndLoss | null = data?.pl ?? null;
  const periodDays = data?.periodDays ?? 30;
  const isSubMonth = periodDays < 30;

  const prevGross = data?.previousGrossRevenueInCents;
  const prevRecurring = data?.previousRecurringRevenueInCents;
  const prevOneTime = data?.previousOneTimeRevenueInCents;
  const prevTicket = data?.previousAverageTicketInCents;
  const prevNetProfit = data?.previousNetProfitInCents;
  const prevMargin = data?.previousMarginPercent;
  const prevLost = data?.previousLostRevenueInCents;
  const lostRevenue = data?.lostRevenueInCents ?? 0;
  const abandonedCount = lostRevenue > 0 ? Math.round(lostRevenue / (data?.averageTicketInCents ?? 1)) : 0;

  return (
    <div className="space-y-3">
      <BlockHeader label="Receita" />
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        <KpiCard
          hero
          label="Receita Bruta"
          value={fmtBRLDecimal(gross / 100)}
          previousLabel={prevGross !== undefined ? fmtBRLDecimal(prevGross / 100) : undefined}
          icon={IconCurrencyDollar}
          color="text-emerald-400"
          bgColor="bg-emerald-600/20"
          current={gross}
          previous={prevGross}
        />
        <KpiCard
          label="Recorrente"
          value={fmtBRLDecimal(recurring / 100)}
          previousLabel={prevRecurring !== undefined ? fmtBRLDecimal(prevRecurring / 100) : undefined}
          subLabel={`${recurringPct}% do total`}
          icon={IconRepeat}
          color="text-cyan-400"
          bgColor="bg-cyan-600/20"
          current={recurring}
          previous={prevRecurring}
          tooltip="Receita proveniente de assinaturas e cobranças recorrentes no período."
        />
        <KpiCard
          label="Avulso"
          value={fmtBRLDecimal(oneTime / 100)}
          previousLabel={prevOneTime !== undefined ? fmtBRLDecimal(prevOneTime / 100) : undefined}
          subLabel={`${oneTimePct}% do total`}
          icon={IconShoppingBag}
          color="text-sky-400"
          bgColor="bg-sky-600/20"
          current={oneTime}
          previous={prevOneTime}
          tooltip="Receita de vendas únicas, não ligadas a assinaturas."
        />
        <KpiCard
          label="Ticket Médio"
          value={fmtBRLDecimal((data?.averageTicketInCents ?? 0) / 100)}
          previousLabel={prevTicket !== undefined ? fmtBRLDecimal(prevTicket / 100) : undefined}
          subLabel={`${data?.totalPayments ?? 0} pagamentos`}
          icon={IconReceipt}
          color="text-violet-400"
          bgColor="bg-violet-600/20"
          current={data?.averageTicketInCents ?? 0}
          previous={prevTicket}
          tooltip="Valor médio por transação no período. Calculado como Receita Bruta ÷ número de pagamentos."
        />
      </div>

      <BlockHeader label="Custos" />
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
        <KpiCard
          label="Descontos"
          value={fmtBRLDecimal((pl?.eventCostsInCents ?? 0) / 100)}
          subLabel="cupons do período"
          icon={IconWallet}
          color="text-rose-400"
          bgColor="bg-rose-600/20"
          tooltip="Valor total de cupons e descontos aplicados em pagamentos no período. Reduz a receita líquida."
        />
        <KpiCard
          label="Custos Variáveis"
          value={fmtBRLDecimal((pl?.totalVariableCostsInCents ?? 0) / 100)}
          subLabel="% configurados sobre receita"
          icon={IconCalculator}
          color="text-orange-400"
          bgColor="bg-orange-600/20"
          tooltip="Custos que crescem proporcionalmente à receita — como taxas de gateway, comissões e impostos. Calculados como percentual da receita bruta."
        />
        <KpiCard
          label="Custos Fixos"
          value={fmtBRLDecimal((pl?.totalFixedCostsInCents ?? 0) / 100)}
          subLabel={isSubMonth ? `rateado ${periodDays}d de 30` : "valor mensal"}
          icon={IconCalculator}
          color="text-red-400"
          bgColor="bg-red-600/20"
          tooltip="Despesas mensais que não variam com a receita — como ferramentas, salários e aluguel. Rateadas proporcionalmente quando o período é menor que um mês."
        />
      </div>

      <BlockHeader label="Resultado" />
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
        <KpiCard
          label="Lucro Operacional"
          value={fmtBRLDecimal((pl?.operatingProfitInCents ?? 0) / 100)}
          subLabel="receita − descontos − variáveis"
          icon={IconTrendingUp}
          color={(pl?.operatingProfitInCents ?? 0) >= 0 ? "text-indigo-400" : "text-red-400"}
          bgColor={(pl?.operatingProfitInCents ?? 0) >= 0 ? "bg-indigo-600/20" : "bg-red-600/20"}
          tooltip="Receita Bruta menos descontos e custos variáveis. Mostra a saúde operacional antes dos custos fixos."
        />
        <KpiCard
          label="Lucro Líquido"
          value={fmtBRLDecimal((pl?.netProfitInCents ?? 0) / 100)}
          previousLabel={prevNetProfit !== undefined ? fmtBRLDecimal(prevNetProfit / 100) : undefined}
          subLabel="após todos os custos"
          icon={IconChartPie}
          color={(pl?.netProfitInCents ?? 0) >= 0 ? "text-emerald-400" : "text-red-400"}
          bgColor={(pl?.netProfitInCents ?? 0) >= 0 ? "bg-emerald-600/20" : "bg-red-600/20"}
          current={pl?.netProfitInCents}
          previous={prevNetProfit}
          tooltip="O que sobra depois de descontar todos os custos (variáveis + fixos + descontos) da receita bruta. É o lucro real do período."
        />
        <KpiCard
          label="Margem Líquida"
          value={`${(pl?.marginPercent ?? 0).toFixed(1)}%`}
          previousLabel={prevMargin !== undefined ? `${prevMargin.toFixed(1)}%` : undefined}
          subLabel="lucro líquido / receita bruta"
          icon={IconReceipt}
          color={(pl?.marginPercent ?? 0) >= 0 ? "text-amber-400" : "text-red-400"}
          bgColor={(pl?.marginPercent ?? 0) >= 0 ? "bg-amber-600/20" : "bg-red-600/20"}
          current={pl?.marginPercent}
          previous={prevMargin}
          tooltip="Percentual da receita bruta que se converte em lucro líquido. Acima de 20% é saudável para SaaS."
        />
      </div>

      {lostRevenue > 0 && (
        <>
          <BlockHeader label="Oportunidade" />
          <div className="rounded-xl border border-rose-500/25 bg-rose-950/20 p-4 flex flex-col sm:flex-row sm:items-center gap-4">
            <div className="flex items-start gap-3 flex-1 min-w-0">
              <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-rose-600/20 border border-rose-500/20 mt-0.5">
                <IconAlertTriangle size={18} className="text-rose-400" />
              </div>
              <div className="min-w-0">
                <div className="flex items-baseline gap-2 flex-wrap">
                  <span className="text-2xl font-bold font-mono text-rose-300">
                    {fmtBRLDecimal(lostRevenue / 100)}
                  </span>
                  {prevLost !== undefined && prevLost > 0 && (
                    <VariationBadge current={lostRevenue} previous={prevLost} />
                  )}
                  <span className="text-xs text-rose-400/80 font-semibold uppercase tracking-wider">em receita perdida</span>
                </div>
                <p className="text-xs text-zinc-500 mt-0.5">
                  {fmtInt(abandonedCount)} checkout{abandonedCount !== 1 ? "s" : ""} abandonado{abandonedCount !== 1 ? "s" : ""} no período
                  {prevLost !== undefined && prevLost > 0 && (
                    <> · comparado a {fmtBRLDecimal(prevLost / 100)} no período anterior</>
                  )}
                </p>
              </div>
            </div>
            <Link
              href={`/${slug}/events?event_types=checkout_abandoned`}
              className="flex items-center gap-1.5 shrink-0 rounded-lg border border-rose-500/30 bg-rose-500/10 px-3 py-2 text-xs font-medium text-rose-300 hover:bg-rose-500/20 transition-colors"
            >
              Ver análise de abandono
              <IconArrowRight size={13} />
            </Link>
          </div>
        </>
      )}
    </div>
  );
}
