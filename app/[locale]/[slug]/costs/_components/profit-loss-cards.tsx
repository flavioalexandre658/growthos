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
  IconCurrencyDollar,
  IconWallet,
  IconReceipt,
  IconPercentage,
  IconInfoCircle,
} from "@tabler/icons-react";
import type { IProfitAndLoss } from "@/interfaces/cost.interface";

interface PLCardProps {
  label: string;
  value: string;
  icon: React.ElementType;
  color: string;
  bgColor: string;
  subLabel?: string;
  tooltip: string;
}

function PLCard({ label, value, icon: Icon, color, bgColor, subLabel, tooltip }: PLCardProps) {
  return (
    <div className="rounded-xl border border-zinc-800 bg-zinc-900/50 p-4 flex flex-col gap-3">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-1 min-w-0">
          <span className="text-[11px] font-semibold uppercase tracking-widest text-zinc-500 truncate">
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
        <div className={`flex h-7 w-7 items-center justify-center rounded-lg shrink-0 ${bgColor}`}>
          <Icon size={14} className={color} />
        </div>
      </div>
      <span className={`text-lg sm:text-2xl font-bold font-mono whitespace-nowrap ${color}`}>{value}</span>
      {subLabel && <span className="text-[10px] text-zinc-600">{subLabel}</span>}
    </div>
  );
}

function PLCardSkeleton() {
  return (
    <div className="rounded-xl border border-zinc-800 bg-zinc-900/50 p-4 flex flex-col gap-3">
      <div className="flex items-center justify-between">
        <Skeleton className="h-3 w-24 bg-zinc-800" />
        <Skeleton className="h-7 w-7 rounded-lg bg-zinc-800" />
      </div>
      <Skeleton className="h-8 w-36 bg-zinc-800" />
    </div>
  );
}

interface ProfitLossCardsProps {
  pl: IProfitAndLoss | null;
  isLoading: boolean;
}

export function ProfitLossCards({ pl, isLoading }: ProfitLossCardsProps) {
  if (isLoading) {
    return (
      <div className="grid grid-cols-2 gap-3 lg:grid-cols-3 xl:grid-cols-6">
        {Array.from({ length: 6 }).map((_, i) => <PLCardSkeleton key={i} />)}
      </div>
    );
  }

  const cards: PLCardProps[] = [
    {
      label: "Receita Bruta",
      value: fmtBRLDecimal((pl?.grossRevenueInCents ?? 0) / 100),
      icon: IconCurrencyDollar,
      color: "text-emerald-400",
      bgColor: "bg-emerald-600/20",
      tooltip: "Total de pagamentos recebidos no período, antes de qualquer desconto ou custo. É a linha de topo do DRE.",
    },
    {
      label: "Custos Variáveis",
      value: fmtBRLDecimal((pl?.totalVariableCostsInCents ?? 0) / 100),
      icon: IconReceipt,
      color: "text-orange-400",
      bgColor: "bg-orange-600/20",
      subLabel: `${pl?.variableCostsBreakdown.length ?? 0} itens`,
      tooltip: "Soma dos custos que variam com a receita — taxas de gateway, comissões, impostos sobre vendas. Configurados como % da receita bruta.",
    },
    {
      label: "Lucro Operacional",
      value: fmtBRLDecimal((pl?.operatingProfitInCents ?? 0) / 100),
      icon: IconWallet,
      color: "text-cyan-400",
      bgColor: "bg-cyan-600/20",
      subLabel: "Receita − Variáveis",
      tooltip: "Receita Bruta menos os custos variáveis. Representa o que sobra antes de pagar as despesas fixas mensais.",
    },
    {
      label: "Custos Fixos",
      value: fmtBRLDecimal((pl?.totalFixedCostsInCents ?? 0) / 100),
      icon: IconTrendingDown,
      color: "text-red-400",
      bgColor: "bg-red-600/20",
      subLabel: pl?.periodDays && pl.periodDays < 30
        ? `${pl.fixedCostsBreakdown.length ?? 0} itens · rateado ${pl.periodDays}d`
        : `${pl?.fixedCostsBreakdown.length ?? 0} itens`,
      tooltip: "Despesas mensais independentes do volume de vendas. Quando o período é menor que 30 dias, o valor é rateado proporcionalmente.",
    },
    {
      label: "Lucro Líquido",
      value: fmtBRLDecimal((pl?.netProfitInCents ?? 0) / 100),
      icon: (pl?.netProfitInCents ?? 0) >= 0 ? IconTrendingUp : IconTrendingDown,
      color: (pl?.netProfitInCents ?? 0) >= 0 ? "text-indigo-400" : "text-red-400",
      bgColor: (pl?.netProfitInCents ?? 0) >= 0 ? "bg-indigo-600/20" : "bg-red-600/20",
      subLabel: "Receita − Variáveis − Fixos",
      tooltip: "O que sobra de fato no caixa após deduzir todos os custos. Negativo significa que o negócio está gastando mais do que fatura.",
    },
    {
      label: "Margem Líquida",
      value: `${pl?.marginPercent ?? 0}%`,
      icon: IconPercentage,
      color: (pl?.marginPercent ?? 0) >= 0 ? "text-amber-400" : "text-red-400",
      bgColor: (pl?.marginPercent ?? 0) >= 0 ? "bg-amber-600/20" : "bg-red-600/20",
      tooltip: "Lucro Líquido dividido pela Receita Bruta, em percentual. Uma margem acima de 20% é considerada saudável para SaaS.",
    },
  ];

  return (
    <div className="grid grid-cols-2 gap-3 lg:grid-cols-3 xl:grid-cols-6">
      {cards.map((card) => <PLCard key={card.label} {...card} />)}
    </div>
  );
}
