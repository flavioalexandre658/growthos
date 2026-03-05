"use client";

import { Skeleton } from "@/components/ui/skeleton";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { fmtBRLDecimal } from "@/utils/format";
import {
  IconTrendingUp,
  IconTrendingDown,
  IconUsers,
  IconReceipt,
  IconAlertCircle,
  IconCurrencyDollar,
  IconHeartHandshake,
  IconMinus,
  IconArrowUpRight,
  IconZoomMoney,
  IconRefresh,
  IconCalendarStats,
  IconChartBar,
  IconInfoCircle,
} from "@tabler/icons-react";
import type { IMrrOverview } from "@/interfaces/mrr.interface";

function computeVariation(current: number, previous: number) {
  const pct = ((current - previous) / previous) * 100;
  return { abs: Math.abs(pct), isUp: pct > 0 };
}

interface VariationBadgeProps {
  current: number;
  previous: number | undefined;
  invertColors?: boolean;
}

function VariationBadge({ current, previous, invertColors = false }: VariationBadgeProps) {
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
  const positive = invertColors ? !isUp : isUp;
  return (
    <span
      className={`flex items-center gap-0.5 rounded-md px-1.5 py-0.5 text-[10px] font-mono font-medium ${
        positive ? "bg-emerald-950/60 text-emerald-400" : "bg-rose-950/60 text-rose-400"
      }`}
    >
      {isUp ? <IconTrendingUp size={9} /> : <IconTrendingDown size={9} />}
      {isUp ? "+" : "-"}{abs.toFixed(1)}%
    </span>
  );
}

function BlockHeader({ label, muted }: { label: string; muted?: string }) {
  return (
    <div className="flex items-baseline gap-2 px-0.5 pt-1">
      <p className="text-[10px] font-semibold uppercase tracking-widest text-zinc-600">
        {label}
      </p>
      {muted && (
        <p className="text-[10px] text-zinc-700">{muted}</p>
      )}
    </div>
  );
}

interface KpiCardProps {
  label: string;
  value: string;
  subLabel?: string;
  icon: React.ElementType;
  color: string;
  bgColor: string;
  current?: number;
  previous?: number;
  invertColors?: boolean;
  hero?: boolean;
  tooltip: string;
}

function KpiCard({
  label,
  value,
  subLabel,
  icon: Icon,
  color,
  bgColor,
  current,
  previous,
  invertColors,
  hero,
  tooltip,
}: KpiCardProps) {
  const hasPrev = previous !== undefined && previous > 0 && current !== undefined;
  return (
    <div
      className={`rounded-xl border border-zinc-800 bg-zinc-900/50 p-4 flex flex-col gap-1.5 ${
        hero ? "sm:col-span-2" : ""
      }`}
    >
      <div className="flex items-center justify-between gap-1">
        <div className="flex items-center gap-1 min-w-0">
          <span className="text-[10px] font-semibold uppercase tracking-widest text-zinc-500 truncate">
            {label}
          </span>
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
        </div>
        <div
          className={`flex h-6 w-6 items-center justify-center rounded-md shrink-0 ${bgColor}`}
        >
          <Icon size={12} className={color} />
        </div>
      </div>

      <div className="flex items-baseline gap-1.5 flex-wrap min-w-0">
        <span
          className={`font-bold font-mono leading-none whitespace-nowrap ${color} ${
            hero ? "text-xl sm:text-2xl" : "text-base sm:text-lg"
          }`}
        >
          {value}
        </span>
        {hasPrev && current !== undefined && previous !== undefined && (
          <VariationBadge current={current} previous={previous} invertColors={invertColors} />
        )}
      </div>

      {hasPrev && (
        <p className="text-[10px] text-zinc-600 leading-tight truncate">
          Comparado ao período anterior
        </p>
      )}
      {!hasPrev && subLabel && (
        <p className="text-[10px] text-zinc-600 leading-tight">{subLabel}</p>
      )}
    </div>
  );
}

function SkeletonCard({ hero }: { hero?: boolean }) {
  return (
    <div
      className={`rounded-xl border border-zinc-800 bg-zinc-900/50 p-4 flex flex-col gap-1.5 ${
        hero ? "sm:col-span-2" : ""
      }`}
    >
      <div className="flex items-center justify-between">
        <Skeleton className="h-3 w-20 bg-zinc-800" />
        <Skeleton className="h-6 w-6 rounded-md bg-zinc-800" />
      </div>
      <div className="flex items-baseline gap-1.5">
        <Skeleton className={`bg-zinc-800 ${hero ? "h-8 w-32" : "h-6 w-24"}`} />
        <Skeleton className="h-4 w-10 bg-zinc-800 rounded-md" />
      </div>
      <Skeleton className="h-3 w-32 bg-zinc-800/60 rounded" />
    </div>
  );
}

interface MrrKpiCardsProps {
  data: IMrrOverview | null | undefined;
  isLoading: boolean;
}

export function MrrKpiCards({ data, isLoading }: MrrKpiCardsProps) {
  if (isLoading) {
    return (
      <div className="space-y-3">
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
          {Array.from({ length: 4 }).map((_, i) => (
            <SkeletonCard key={i} />
          ))}
        </div>
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
          <SkeletonCard hero />
          {Array.from({ length: 3 }).map((_, i) => (
            <SkeletonCard key={i} />
          ))}
        </div>
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
          {Array.from({ length: 4 }).map((_, i) => (
            <SkeletonCard key={i} />
          ))}
        </div>
      </div>
    );
  }

  const mrr = data?.mrr ?? 0;
  const arr = data?.arr ?? 0;
  const activeSubscriptions = data?.activeSubscriptions ?? 0;
  const arpu = data?.arpu ?? 0;
  const churnRate = data?.churnRate ?? 0;
  const revenueChurnRate = data?.revenueChurnRate ?? 0;
  const estimatedLtv = data?.estimatedLtv ?? 0;
  const mrrGrowthRate = data?.mrrGrowthRate ?? 0;
  const totalPeriodRevenue = data?.totalPeriodRevenue ?? 0;
  const totalPaymentCount = data?.totalPaymentCount ?? 0;
  const renewalSubscriptions = data?.renewalSubscriptions ?? 0;
  const nrr = data?.nrr ?? 0;
  const forecastNext30dRevenue = data?.forecastNext30dRevenue ?? 0;
  const forecastNext30dCount = data?.forecastNext30dCount ?? 0;

  const isGrowthPositive = mrrGrowthRate >= 0;
  const isNrrPositive = nrr >= 100;

  return (
    <div className="space-y-3">
      <BlockHeader label="Snapshot Atual" muted="— independente do filtro de data" />
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        <KpiCard
          label="MRR"
          value={fmtBRLDecimal(mrr / 100)}
          subLabel="Receita mensal recorrente"
          icon={IconCurrencyDollar}
          color="text-cyan-400"
          bgColor="bg-cyan-600/20"
          current={mrr}
          previous={data?.previousMrr}
          tooltip="Monthly Recurring Revenue — soma do valor mensal normalizado de todas as assinaturas ativas agora. Não muda com o filtro de data."
        />
        <KpiCard
          label="ARR"
          value={fmtBRLDecimal(arr / 100)}
          subLabel="MRR × 12"
          icon={IconReceipt}
          color="text-violet-400"
          bgColor="bg-violet-600/20"
          current={arr}
          previous={data?.previousArr}
          tooltip="Annual Recurring Revenue — projeção anual da receita recorrente atual. Calculado como MRR × 12."
        />
        <KpiCard
          label="Assinantes"
          value={String(activeSubscriptions)}
          subLabel="Ativos agora"
          icon={IconUsers}
          color="text-amber-400"
          bgColor="bg-amber-600/20"
          current={activeSubscriptions}
          previous={data?.previousActiveSubscriptions}
          tooltip="Total de assinaturas com status ativo ou em trial no momento. Snapshot atual, não filtrado por período."
        />
        <KpiCard
          label="ARPU"
          value={fmtBRLDecimal(arpu / 100)}
          subLabel="Por assinante/mês"
          icon={IconHeartHandshake}
          color="text-indigo-400"
          bgColor="bg-indigo-600/20"
          current={arpu}
          previous={data?.previousArpu}
          tooltip="Average Revenue Per User — MRR dividido pelo número de assinantes ativos. Indica o valor médio que cada cliente gera por mês."
        />
      </div>

      <BlockHeader label="Período Selecionado" muted="— muda com o filtro de data" />
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        <KpiCard
          hero
          label="Receita no Período"
          value={fmtBRLDecimal(totalPeriodRevenue / 100)}
          subLabel={`${totalPaymentCount} pagamento${totalPaymentCount !== 1 ? "s" : ""} no período`}
          icon={IconZoomMoney}
          color="text-emerald-400"
          bgColor="bg-emerald-600/20"
          current={totalPeriodRevenue}
          previous={data?.previousPeriodRevenue}
          tooltip="Soma de todos os pagamentos recebidos dentro do período filtrado. Inclui renovações e novas assinaturas. É o caixa que realmente entrou."
        />
        <KpiCard
          label="Renovações"
          value={String(renewalSubscriptions)}
          subLabel={`${totalPaymentCount} cobranças no período`}
          icon={IconRefresh}
          color="text-sky-400"
          bgColor="bg-sky-600/20"
          tooltip="Número de assinaturas existentes (criadas antes do período) que tiveram um pagamento registrado dentro do filtro de data selecionado."
        />
        <KpiCard
          label="NRR"
          value={`${nrr}%`}
          subLabel={nrr >= 100 ? "Expansão supera churn" : "Churn supera expansão"}
          icon={isNrrPositive ? IconArrowUpRight : IconTrendingDown}
          color={isNrrPositive ? "text-emerald-400" : "text-rose-400"}
          bgColor={isNrrPositive ? "bg-emerald-600/20" : "bg-rose-600/20"}
          current={nrr}
          previous={data?.previousNrr}
          tooltip="Net Revenue Retention — mede se a receita da base existente está crescendo. Acima de 100% significa que upgrades e expansão compensam os cancelamentos. Abaixo de 100% é sinal de perda de receita."
        />
      </div>

      <BlockHeader label="Saúde" />
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        <KpiCard
          label="Churn Rate"
          value={`${churnRate}%`}
          subLabel="Assinantes cancelados"
          icon={IconAlertCircle}
          color="text-rose-400"
          bgColor="bg-rose-600/20"
          current={churnRate}
          previous={data?.previousChurnRate}
          invertColors
          tooltip="Percentual de assinantes que cancelaram no período em relação à base ativa. Quanto menor, mais saudável é a retenção."
        />
        <KpiCard
          label="Churn Receita"
          value={`${revenueChurnRate}%`}
          subLabel="MRR perdido"
          icon={IconTrendingDown}
          color="text-red-400"
          bgColor="bg-red-600/20"
          current={revenueChurnRate}
          previous={data?.previousRevenueChurnRate}
          invertColors
          tooltip="Percentual do MRR perdido por cancelamentos no período. Diferente do Churn Rate: um cliente com plano caro cancelando pesa mais aqui."
        />
        <KpiCard
          label="Crescimento MRR"
          value={`${mrrGrowthRate > 0 ? "+" : ""}${mrrGrowthRate}%`}
          subLabel="Net MRR Growth Rate"
          icon={isGrowthPositive ? IconChartBar : IconTrendingDown}
          color={isGrowthPositive ? "text-emerald-400" : "text-rose-400"}
          bgColor={isGrowthPositive ? "bg-emerald-600/20" : "bg-rose-600/20"}
          tooltip="Taxa de crescimento líquido do MRR: (MRR novo + expansão − churn − contração) ÷ MRR inicial. Positivo = negócio crescendo."
        />
        <KpiCard
          label="LTV Est."
          value={fmtBRLDecimal(estimatedLtv / 100)}
          subLabel="Valor vitalício estimado"
          icon={IconTrendingUp}
          color="text-indigo-400"
          bgColor="bg-indigo-600/20"
          current={estimatedLtv}
          previous={data?.previousEstimatedLtv}
          tooltip="Lifetime Value estimado — valor total médio que um assinante gera durante todo o relacionamento. Calculado como ARPU ÷ Churn Rate."
        />
      </div>

      <BlockHeader label="Previsão" />
      <div className="grid grid-cols-1 gap-3">
        <div className="rounded-xl border border-zinc-800 bg-zinc-900/50 p-4 flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex items-center gap-3">
            <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-teal-600/20 shrink-0">
              <IconCalendarStats size={14} className="text-teal-400" />
            </div>
            <div className="min-w-0">
              <div className="flex items-center gap-1">
                <p className="text-[10px] font-semibold uppercase tracking-widest text-zinc-500">
                  Previsão próximos 30 dias
                </p>
                <TooltipProvider delayDuration={100}>
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <button
                        type="button"
                        className="shrink-0 text-zinc-700 hover:text-zinc-400 transition-colors focus:outline-none"
                        aria-label="Informação sobre Previsão"
                      >
                        <IconInfoCircle size={11} />
                      </button>
                    </TooltipTrigger>
                    <TooltipContent
                      side="top"
                      className="max-w-[220px] bg-zinc-800 border-zinc-700 text-zinc-200 text-xs leading-relaxed"
                    >
                      Soma do valor das assinaturas ativas cuja próxima data de cobrança cai dentro dos próximos 30 dias. Útil para projetar o caixa de curto prazo.
                    </TooltipContent>
                  </Tooltip>
                </TooltipProvider>
              </div>
              <p className="text-[10px] text-zinc-600 mt-0.5">
                {forecastNext30dCount} renovação{forecastNext30dCount !== 1 ? "ões" : ""} esperada{forecastNext30dCount !== 1 ? "s" : ""}
              </p>
            </div>
          </div>
          <span className="font-bold font-mono text-lg sm:text-xl text-teal-400 sm:text-right whitespace-nowrap">
            {fmtBRLDecimal(forecastNext30dRevenue / 100)}
          </span>
        </div>
      </div>
    </div>
  );
}
