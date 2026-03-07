"use client";

import { useState } from "react";
import { useTranslations } from "next-intl";
import {
  IconCurrencyDollar,
  IconPlus,
  IconTrash,
  IconLoader2,
  IconAlertTriangle,
  IconCheck,
  IconChevronDown,
  IconChevronUp,
  IconHistory,
} from "@tabler/icons-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Skeleton } from "@/components/ui/skeleton";
import { useExchangeRates } from "@/hooks/queries/use-exchange-rates";
import { useUpsertExchangeRate } from "@/hooks/mutations/use-upsert-exchange-rate";
import { useDeleteExchangeRate } from "@/hooks/mutations/use-delete-exchange-rate";
import { CURRENCY_OPTIONS } from "@/utils/regional-options";
import { cn } from "@/lib/utils";
import toast from "react-hot-toast";
import dayjs from "dayjs";
import relativeTime from "dayjs/plugin/relativeTime";
import "dayjs/locale/pt-br";
import "dayjs/locale/en";

dayjs.extend(relativeTime);

interface ExchangeRatesSectionProps {
  orgId: string;
  baseCurrency: string;
}

function RateForm({
  orgId,
  baseCurrency,
  onSuccess,
}: {
  orgId: string;
  baseCurrency: string;
  onSuccess: () => void;
}) {
  const t = useTranslations("settings.exchangeRates");
  const [fromCurrency, setFromCurrency] = useState("USD");
  const [rate, setRate] = useState("");
  const [effectiveFrom, setEffectiveFrom] = useState(
    dayjs().format("YYYY-MM-DD"),
  );
  const upsert = useUpsertExchangeRate(orgId);

  const availableCurrencies = CURRENCY_OPTIONS.filter(
    (c) => c.value !== baseCurrency,
  );

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const rateNum = parseFloat(rate.replace(",", "."));
    if (!fromCurrency || isNaN(rateNum) || rateNum <= 0) {
      toast.error(t("errorFillFields"));
      return;
    }
    await upsert.mutateAsync({
      organizationId: orgId,
      fromCurrency: fromCurrency.toUpperCase(),
      toCurrency: baseCurrency.toUpperCase(),
      rate: rateNum,
      effectiveFrom,
    });
    toast.success(t("rateSavedToast", { from: fromCurrency, to: baseCurrency }));
    setRate("");
    onSuccess();
  };

  return (
    <form
      onSubmit={handleSubmit}
      className="space-y-3"
    >
      <div className="flex flex-wrap items-end gap-3">
        <div className="space-y-1.5 min-w-[120px]">
          <Label className="text-[11px] text-zinc-500 uppercase tracking-wider">
            {t("fromLabel")}
          </Label>
          <select
            value={fromCurrency}
            onChange={(e) => setFromCurrency(e.target.value)}
            className="h-8 rounded-lg border border-zinc-700 bg-zinc-900 px-2.5 text-xs text-zinc-200 focus:border-indigo-500 focus:outline-none"
          >
            {availableCurrencies.map((c) => (
              <option key={c.value} value={c.value}>
                {c.value}
              </option>
            ))}
          </select>
        </div>

        <div className="space-y-1.5 flex-1 min-w-[120px]">
          <Label className="text-[11px] text-zinc-500 uppercase tracking-wider">
            {t("rateLabel", { from: fromCurrency, to: baseCurrency })}
          </Label>
          <Input
            type="text"
            inputMode="decimal"
            placeholder="Ex: 5.20"
            value={rate}
            onChange={(e) => setRate(e.target.value)}
            className="h-8 bg-zinc-900 border-zinc-700 text-zinc-200 text-xs placeholder:text-zinc-600 focus-visible:ring-indigo-500 focus-visible:border-indigo-500"
          />
        </div>

        <div className="space-y-1.5 min-w-[140px]">
          <Label className="text-[11px] text-zinc-500 uppercase tracking-wider">
            {t("validFromLabel")}
          </Label>
          <Input
            type="date"
            value={effectiveFrom}
            onChange={(e) => setEffectiveFrom(e.target.value)}
            className="h-8 bg-zinc-900 border-zinc-700 text-zinc-200 text-xs focus-visible:ring-indigo-500 focus-visible:border-indigo-500"
          />
        </div>

        <Button
          type="submit"
          size="sm"
          disabled={upsert.isPending}
          className="h-8 bg-indigo-600 hover:bg-indigo-500 text-white text-xs gap-1.5"
        >
          {upsert.isPending ? (
            <IconLoader2 size={13} className="animate-spin" />
          ) : (
            <IconCheck size={13} />
          )}
          {t("saveRate")}
        </Button>
      </div>
    </form>
  );
}

interface RateEntry {
  id: string;
  fromCurrency: string;
  toCurrency: string;
  rate: number;
  effectiveFrom: Date;
  updatedAt: Date;
  isCurrent: boolean;
}

function RateRow({
  rate,
  onDelete,
  isDeleting,
  isHistory,
}: {
  rate: RateEntry;
  onDelete: (id: string, from: string) => void;
  isDeleting: boolean;
  isHistory?: boolean;
}) {
  const t = useTranslations("settings.exchangeRates");
  return (
    <div
      className={cn(
        "flex items-center justify-between rounded-lg border px-4 py-3 transition-opacity",
        isHistory
          ? "border-zinc-800/40 bg-zinc-900/20 opacity-60"
          : "border-zinc-800 bg-zinc-900/40",
      )}
    >
      <div className="flex items-center gap-3">
        <div
          className={cn(
            "flex h-8 w-8 items-center justify-center rounded-lg shrink-0",
            isHistory ? "bg-zinc-800/50" : "bg-indigo-600/20",
          )}
        >
          {isHistory ? (
            <IconHistory
              size={14}
              className="text-zinc-600"
            />
          ) : (
            <IconCurrencyDollar size={14} className="text-indigo-400" />
          )}
        </div>
        <div>
          <p
            className={cn(
              "text-sm font-semibold font-mono",
              isHistory ? "text-zinc-500" : "text-zinc-200",
            )}
          >
            {rate.fromCurrency} → {rate.toCurrency}
          </p>
          <div className="flex items-center gap-2 mt-0.5 flex-wrap">
            <span
              className={cn(
                "text-xs",
                isHistory ? "text-zinc-600" : "text-zinc-400",
              )}
            >
              1 {rate.fromCurrency} ={" "}
              <span
                className={cn(
                  "font-semibold",
                  isHistory ? "text-zinc-500" : "text-zinc-200",
                )}
              >
                {rate.rate.toFixed(4)}
              </span>{" "}
              {rate.toCurrency}
            </span>
            <span className="text-[10px] text-zinc-600 font-mono">
              {t("validFrom", { date: dayjs(rate.effectiveFrom).format("DD/MM/YYYY") })}
            </span>
          </div>
        </div>
      </div>

      <div className="flex items-center gap-2 shrink-0">
        {rate.isCurrent && (
          <span className="text-[10px] font-semibold text-emerald-400 bg-emerald-900/20 border border-emerald-800/30 px-1.5 py-0.5 rounded-md">
            {t("currentBadge")}
          </span>
        )}
        <Button
          variant="ghost"
          size="icon"
          onClick={() => onDelete(rate.id, rate.fromCurrency)}
          disabled={isDeleting}
          className="h-7 w-7 text-zinc-600 hover:text-red-400"
          title={t("removeRate")}
        >
          <IconTrash size={14} />
        </Button>
      </div>
    </div>
  );
}

export function ExchangeRatesSection({
  orgId,
  baseCurrency,
}: ExchangeRatesSectionProps) {
  const t = useTranslations("settings.exchangeRates");
  const { data: rates, isLoading } = useExchangeRates(orgId);
  const deleteMutation = useDeleteExchangeRate(orgId);
  const [showForm, setShowForm] = useState(false);
  const [expandedPairs, setExpandedPairs] = useState<Set<string>>(new Set());

  const handleDelete = async (id: string, from: string) => {
    await deleteMutation.mutateAsync({ id });
    toast.success(t("rateRemovedToast", { from }));
  };

  const togglePairHistory = (pairKey: string) => {
    setExpandedPairs((prev) => {
      const next = new Set(prev);
      if (next.has(pairKey)) {
        next.delete(pairKey);
      } else {
        next.add(pairKey);
      }
      return next;
    });
  };

  const groupedRates = rates?.reduce(
    (acc, r) => {
      const key = `${r.fromCurrency}-${r.toCurrency}`;
      if (!acc[key]) acc[key] = [];
      acc[key].push(r);
      return acc;
    },
    {} as Record<string, typeof rates>,
  );

  return (
    <div className="rounded-xl border border-zinc-800 bg-zinc-900/50 overflow-hidden">
      <div className="flex items-center justify-between p-5 border-b border-zinc-800">
        <div className="flex items-center gap-2">
          <IconCurrencyDollar size={15} className="text-indigo-400" />
          <div>
            <h3 className="text-sm font-bold text-zinc-100">
              {t("title")}
            </h3>
            <p className="text-xs text-zinc-500 mt-0.5">
              {t("baseCurrencyLabel")}{" "}
              <span className="text-zinc-300 font-semibold font-mono">
                {baseCurrency}
              </span>
            </p>
          </div>
        </div>
        <Button
          size="sm"
          onClick={() => setShowForm((v) => !v)}
          className={cn(
            "h-8 gap-1.5 text-xs",
            showForm
              ? "bg-zinc-700 hover:bg-zinc-600 text-zinc-200"
              : "bg-indigo-600 hover:bg-indigo-500 text-white",
          )}
        >
          <IconPlus size={13} />
          {t("addRate")}
        </Button>
      </div>

      <div className="p-5 space-y-4">
        <div className="flex items-start gap-2 rounded-lg border border-amber-800/30 bg-amber-900/10 px-3 py-2.5">
          <IconAlertTriangle
            size={14}
            className="text-amber-500 mt-0.5 shrink-0"
          />
          <p className="text-xs text-amber-400/80 leading-relaxed">
            {t("warningText", { currency: baseCurrency })}
          </p>
        </div>

        {showForm && (
          <div className="rounded-lg border border-zinc-800 bg-zinc-900/40 p-4">
            <p className="text-xs font-semibold text-zinc-400 mb-3">
              {t("newRateTitle")}
            </p>
            <RateForm
              orgId={orgId}
              baseCurrency={baseCurrency}
              onSuccess={() => setShowForm(false)}
            />
          </div>
        )}

        {isLoading ? (
          <div className="space-y-2">
            {Array.from({ length: 2 }).map((_, i) => (
              <Skeleton
                key={i}
                className="h-14 w-full rounded-lg bg-zinc-800"
              />
            ))}
          </div>
        ) : !groupedRates || Object.keys(groupedRates).length === 0 ? (
          <div className="py-6 text-center">
            <p className="text-sm text-zinc-600">{t("noRates")}</p>
            <p className="text-xs text-zinc-700 mt-1">
              {t("noRatesHint", { currency: baseCurrency })}
            </p>
          </div>
        ) : (
          <div className="space-y-3">
            {Object.entries(groupedRates).map(([pairKey, pairRates]) => {
              const current = pairRates.find((r) => r.isCurrent);
              const history = pairRates.filter((r) => !r.isCurrent);
              const isExpanded = expandedPairs.has(pairKey);

              return (
                <div key={pairKey} className="space-y-1">
                  {current && (
                    <RateRow
                      rate={current}
                      onDelete={handleDelete}
                      isDeleting={deleteMutation.isPending}
                    />
                  )}
                  {!current && pairRates[0] && (
                    <RateRow
                      rate={pairRates[0]}
                      onDelete={handleDelete}
                      isDeleting={deleteMutation.isPending}
                    />
                  )}

                  {history.length > 0 && (
                    <div>
                      <button
                        type="button"
                        onClick={() => togglePairHistory(pairKey)}
                        className="flex items-center gap-1.5 text-[11px] text-zinc-600 hover:text-zinc-400 transition-colors pl-1 py-1"
                      >
                        {isExpanded ? (
                          <IconChevronUp size={11} />
                        ) : (
                          <IconChevronDown size={11} />
                        )}
                        {isExpanded
                          ? t("hideHistory")
                          : t("showHistory", {
                              count: history.length,
                              entriesLabel: history.length === 1 ? t("historyEntryOne") : t("historyEntryMany"),
                            })}
                      </button>

                      {isExpanded && (
                        <div className="space-y-1 mt-1 pl-2 border-l border-zinc-800">
                          {history.map((r) => (
                            <RateRow
                              key={r.id}
                              rate={r}
                              onDelete={handleDelete}
                              isDeleting={deleteMutation.isPending}
                              isHistory
                            />
                          ))}
                        </div>
                      )}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
