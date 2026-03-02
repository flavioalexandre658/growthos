"use client";

import { IFinancialData } from "@/interfaces/dashboard.interface";
import { Skeleton } from "@/components/ui/skeleton";
import { fmtBRLDecimal } from "@/utils/format";
import {
  IconCurrencyDollar,
  IconWallet,
  IconAlertTriangle,
  IconReceipt,
  IconMinus,
  IconRepeat,
  IconShoppingBag,
  IconTrendingUp,
  IconCalculator,
  IconChartPie,
} from "@tabler/icons-react";
import type { IProfitAndLoss } from "@/interfaces/cost.interface";

interface KpiCardProps {
  label: string;
  value: string;
  subLabel?: string;
  icon: React.ElementType;
  color: string;
  bgColor: string;
}

function KpiCard({ label, value, subLabel, icon: Icon, color, bgColor }: KpiCardProps) {
  return (
    <div className="rounded-xl border border-zinc-800 bg-zinc-900/50 p-4 flex flex-col gap-2">
      <div className="flex items-center justify-between">
        <span className="text-[10px] font-semibold uppercase tracking-widest text-zinc-500">
          {label}
        </span>
        <div className={`flex h-6 w-6 items-center justify-center rounded-md ${bgColor}`}>
          <Icon size={12} className={color} />
        </div>
      </div>
      <span className={`text-xl font-bold font-mono ${color}`}>{value}</span>
      {subLabel && (
        <span className="text-[10px] text-zinc-600">{subLabel}</span>
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

function SkeletonCard() {
  return (
    <div className="rounded-xl border border-zinc-800 bg-zinc-900/50 p-4 flex flex-col gap-2">
      <div className="flex items-center justify-between">
        <Skeleton className="h-3 w-20 bg-zinc-800" />
        <Skeleton className="h-6 w-6 rounded-md bg-zinc-800" />
      </div>
      <Skeleton className="h-7 w-28 bg-zinc-800" />
    </div>
  );
}

interface FinanceKpiCardsProps {
  data: IFinancialData | null | undefined;
  isLoading: boolean;
}

export function FinanceKpiCards({ data, isLoading }: FinanceKpiCardsProps) {
  if (isLoading) {
    return (
      <div className="space-y-3">
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
          {Array.from({ length: 4 }).map((_, i) => <SkeletonCard key={i} />)}
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

  return (
    <div className="space-y-3">
      <BlockHeader label="Receita" />
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        <KpiCard
          label="Receita Bruta"
          value={fmtBRLDecimal(gross / 100)}
          icon={IconCurrencyDollar}
          color="text-emerald-400"
          bgColor="bg-emerald-600/20"
        />
        <KpiCard
          label="Recorrente"
          value={fmtBRLDecimal(recurring / 100)}
          subLabel={`${recurringPct}% do total`}
          icon={IconRepeat}
          color="text-cyan-400"
          bgColor="bg-cyan-600/20"
        />
        <KpiCard
          label="Avulso"
          value={fmtBRLDecimal(oneTime / 100)}
          subLabel={`${oneTimePct}% do total`}
          icon={IconShoppingBag}
          color="text-sky-400"
          bgColor="bg-sky-600/20"
        />
        <KpiCard
          label="Ticket Médio"
          value={fmtBRLDecimal((data?.averageTicketInCents ?? 0) / 100)}
          subLabel={`${data?.totalPayments ?? 0} pagamentos`}
          icon={IconReceipt}
          color="text-violet-400"
          bgColor="bg-violet-600/20"
        />
      </div>

      <BlockHeader label="Custos" />
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
        <KpiCard
          label="Taxas + Descontos"
          value={fmtBRLDecimal((pl?.eventCostsInCents ?? 0) / 100)}
          subLabel="gateway + cupons do período"
          icon={IconWallet}
          color="text-rose-400"
          bgColor="bg-rose-600/20"
        />
        <KpiCard
          label="Custos Variáveis"
          value={fmtBRLDecimal((pl?.totalVariableCostsInCents ?? 0) / 100)}
          subLabel="% configurados sobre receita"
          icon={IconMinus}
          color="text-orange-400"
          bgColor="bg-orange-600/20"
        />
        <KpiCard
          label="Custos Fixos"
          value={fmtBRLDecimal((pl?.totalFixedCostsInCents ?? 0) / 100)}
          subLabel={isSubMonth ? `rateado ${periodDays}d de 30` : "valor mensal"}
          icon={IconCalculator}
          color="text-red-400"
          bgColor="bg-red-600/20"
        />
      </div>

      <BlockHeader label="Resultado" />
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
        <KpiCard
          label="Lucro Operacional"
          value={fmtBRLDecimal((pl?.operatingProfitInCents ?? 0) / 100)}
          subLabel="receita − taxas − variáveis"
          icon={IconTrendingUp}
          color={(pl?.operatingProfitInCents ?? 0) >= 0 ? "text-indigo-400" : "text-red-400"}
          bgColor={(pl?.operatingProfitInCents ?? 0) >= 0 ? "bg-indigo-600/20" : "bg-red-600/20"}
        />
        <KpiCard
          label="Lucro Líquido"
          value={fmtBRLDecimal((pl?.netProfitInCents ?? 0) / 100)}
          subLabel="após todos os custos"
          icon={IconChartPie}
          color={(pl?.netProfitInCents ?? 0) >= 0 ? "text-emerald-400" : "text-red-400"}
          bgColor={(pl?.netProfitInCents ?? 0) >= 0 ? "bg-emerald-600/20" : "bg-red-600/20"}
        />
        <KpiCard
          label="Margem Líquida"
          value={`${(pl?.marginPercent ?? 0).toFixed(1)}%`}
          subLabel="lucro líquido / receita bruta"
          icon={IconReceipt}
          color={(pl?.marginPercent ?? 0) >= 0 ? "text-amber-400" : "text-red-400"}
          bgColor={(pl?.marginPercent ?? 0) >= 0 ? "bg-amber-600/20" : "bg-red-600/20"}
        />
      </div>

      {(data?.lostRevenueInCents ?? 0) > 0 && (
        <>
          <BlockHeader label="Oportunidade" />
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
            <KpiCard
              label="Receita Perdida"
              value={fmtBRLDecimal((data?.lostRevenueInCents ?? 0) / 100)}
              subLabel="checkouts abandonados"
              icon={IconAlertTriangle}
              color="text-rose-400"
              bgColor="bg-rose-600/20"
            />
          </div>
        </>
      )}
    </div>
  );
}
