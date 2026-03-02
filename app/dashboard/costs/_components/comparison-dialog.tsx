"use client";

import { useState, useRef } from "react";
import { IconSparkles, IconCalendar } from "@tabler/icons-react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
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
import { buildProfitAndLoss } from "@/utils/build-pl";
import type { IDateFilter, DashboardPeriod } from "@/interfaces/dashboard.interface";
import type { IProfitAndLoss } from "@/interfaces/cost.interface";
import type { IFixedCost, IVariableCost } from "@/interfaces/cost.interface";

type ComparisonSection = {
  key: string;
  label: string;
};

const ALL_SECTIONS: ComparisonSection[] = [
  { key: "overview", label: "Visão Geral" },
  { key: "channels", label: "Canais" },
  { key: "finance", label: "Financeiro" },
  { key: "landing-pages", label: "Landing Pages" },
];

const PERIOD_PRESETS: { value: DashboardPeriod; label: string }[] = [
  { value: "today", label: "Hoje" },
  { value: "yesterday", label: "Ontem" },
  { value: "7d", label: "7 dias" },
  { value: "this_month", label: "Este mês" },
  { value: "30d", label: "30 dias" },
  { value: "90d", label: "90 dias" },
];

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
            onClick={() => {
              setShowCustom(false);
              onChange({ period: opt.value });
            }}
            className={cn(
              "px-2.5 py-1 rounded-md text-xs font-semibold transition-all",
              activePeriod === opt.value
                ? "bg-indigo-600 text-white"
                : "bg-zinc-800 text-zinc-400 hover:text-zinc-100"
            )}
          >
            {opt.label}
          </button>
        ))}
        <button
          onClick={() => setShowCustom((v) => !v)}
          className={cn(
            "flex items-center gap-1 px-2.5 py-1 rounded-md text-xs font-semibold transition-all",
            showCustom ? "bg-indigo-600 text-white" : "bg-zinc-800 text-zinc-400 hover:text-zinc-100"
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
            className="h-7 rounded-lg border border-zinc-700 bg-zinc-900 px-2 text-[16px] sm:text-xs text-zinc-200 focus:outline-none focus:border-indigo-500 [color-scheme:dark]"
          />
          <span className="text-zinc-600 text-xs">→</span>
          <input
            type="date"
            value={filter.end_date ?? ""}
            onChange={(e) => onChange({ start_date: filter.start_date, end_date: e.target.value })}
            className="h-7 rounded-lg border border-zinc-700 bg-zinc-900 px-2 text-[16px] sm:text-xs text-zinc-200 focus:outline-none focus:border-indigo-500 [color-scheme:dark]"
          />
        </div>
      )}
    </div>
  );
}

function getPeriodLabel(filter: IDateFilter): string {
  if (filter.start_date && filter.end_date) {
    return `${filter.start_date} → ${filter.end_date}`;
  }
  const found = PERIOD_PRESETS.find((p) => p.value === filter.period);
  return found?.label ?? filter.period ?? "Período";
}

async function fetchSectionData(orgId: string, section: string, filter: IDateFilter) {
  switch (section) {
    case "overview": {
      const [funnel, daily] = await Promise.all([
        getFunnel(orgId, filter),
        getDaily(orgId, filter),
      ]);
      return { funnel, daily };
    }
    case "channels": {
      const channels = await getChannels(orgId, { ...filter, limit: 999 });
      return { channels: channels.data };
    }
    case "finance": {
      const [financial, funnel, fixed, variable] = await Promise.all([
        getFinancial(orgId, filter),
        getFunnel(orgId, filter),
        getFixedCosts(orgId),
        getVariableCosts(orgId),
      ]);
      const pl = buildProfitAndLoss(
        funnel?.revenue ?? 0,
        (fixed ?? []) as IFixedCost[],
        (variable ?? []) as IVariableCost[]
      );
      return { financial, pl };
    }
    case "landing-pages": {
      const pages = await getLandingPages(orgId, { ...filter, limit: 50 });
      return { landingPages: pages.data };
    }
    default:
      return {};
  }
}

interface ComparisonDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  orgName: string;
  pl?: IProfitAndLoss;
}

export function ComparisonDialog({
  open,
  onOpenChange,
  orgName,
  pl,
}: ComparisonDialogProps) {
  const { organization } = useOrganization();

  const [section, setSection] = useState("overview");
  const [filterA, setFilterA] = useState<IDateFilter>({ period: "this_month" });
  const [filterB, setFilterB] = useState<IDateFilter>({ period: "30d" });
  const [result, setResult] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const abortRef = useRef<AbortController | null>(null);

  const handleCompare = async () => {
    if (!organization?.id) return;
    if (abortRef.current) abortRef.current.abort();
    abortRef.current = new AbortController();

    setResult("");
    setIsLoading(true);

    const [dataA, dataB] = await Promise.all([
      fetchSectionData(organization.id, section, filterA),
      fetchSectionData(organization.id, section, filterB),
    ]);

    const payload: Record<string, unknown> = {
      type: "comparison",
      orgName,
      section,
      periodA: { label: getPeriodLabel(filterA), filter: filterA, data: dataA },
      periodB: { label: getPeriodLabel(filterB), filter: filterB, data: dataB },
    };

    if (section === "finance" && pl) {
      payload.currentPl = pl;
    }

    try {
      const res = await fetch("/api/ai/analyze", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
        signal: abortRef.current.signal,
      });

      if (!res.ok || !res.body) throw new Error("Erro");

      const reader = res.body.getReader();
      const decoder = new TextDecoder();

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        setResult((prev) => prev + decoder.decode(value, { stream: true }));
      }
    } catch (err: unknown) {
      if (err instanceof Error && err.name !== "AbortError") {
        setResult("Erro ao obter análise comparativa.");
      }
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="bg-zinc-950 border-zinc-800 text-zinc-100 sm:max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="text-zinc-100 flex items-center gap-2">
            <IconSparkles size={16} className="text-indigo-400" />
            Comparativo com IA
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-5">
          <div>
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
                      : "bg-zinc-900 border-zinc-700 text-zinc-400 hover:text-zinc-100 hover:border-zinc-600"
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
            disabled={isLoading || !organization?.id}
            className="w-full bg-indigo-600 hover:bg-indigo-500 text-white gap-2"
          >
            <IconSparkles size={15} />
            {isLoading ? "Comparando..." : "Comparar com IA"}
          </Button>

          {result && (
            <div className="rounded-xl border border-zinc-800 bg-zinc-900/30 p-5">
              <div
                className="prose prose-invert prose-sm max-w-none text-zinc-300"
                style={{ lineHeight: "1.7" }}
                dangerouslySetInnerHTML={{
                  __html: result
                    .replace(/^### (.+)$/gm, '<h3 class="text-zinc-100 font-bold text-sm mt-4 mb-2">$1</h3>')
                    .replace(/^## (.+)$/gm, '<h2 class="text-zinc-100 font-bold text-base mt-5 mb-2">$1</h2>')
                    .replace(/^# (.+)$/gm, '<h1 class="text-zinc-100 font-bold text-lg mt-5 mb-2">$1</h1>')
                    .replace(/\*\*(.+?)\*\*/g, '<strong class="text-zinc-100">$1</strong>')
                    .replace(/^- (.+)$/gm, '<li class="ml-4 list-disc text-zinc-300">$1</li>')
                    .replace(/^(\d+)\. (.+)$/gm, '<li class="ml-4 list-decimal text-zinc-300"><span>$2</span></li>')
                    .replace(/\n\n/g, '</p><p class="mb-2">'),
                }}
              />
              {isLoading && (
                <span className="inline-block w-1.5 h-4 bg-indigo-400 animate-pulse ml-0.5 rounded-sm" />
              )}
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}
