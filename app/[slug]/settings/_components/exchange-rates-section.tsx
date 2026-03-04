"use client";

import { useState } from "react";
import {
  IconCurrencyDollar,
  IconPlus,
  IconTrash,
  IconPencil,
  IconLoader2,
  IconAlertTriangle,
  IconCheck,
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

dayjs.extend(relativeTime);
dayjs.locale("pt-br");

interface ExchangeRatesSectionProps {
  orgId: string;
  baseCurrency: string;
}

interface RateFormState {
  fromCurrency: string;
  rate: string;
  editingId?: string;
}

function RateForm({
  orgId,
  baseCurrency,
  existingPairs,
  onSuccess,
}: {
  orgId: string;
  baseCurrency: string;
  existingPairs: string[];
  onSuccess: () => void;
}) {
  const [fromCurrency, setFromCurrency] = useState("USD");
  const [rate, setRate] = useState("");
  const upsert = useUpsertExchangeRate(orgId);

  const availableCurrencies = CURRENCY_OPTIONS.filter(
    (c) => c.value !== baseCurrency
  );

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const rateNum = parseFloat(rate.replace(",", "."));
    if (!fromCurrency || isNaN(rateNum) || rateNum <= 0) {
      toast.error("Preencha todos os campos corretamente.");
      return;
    }
    await upsert.mutateAsync({
      organizationId: orgId,
      fromCurrency: fromCurrency.toUpperCase(),
      toCurrency: baseCurrency.toUpperCase(),
      rate: rateNum,
    });
    toast.success(`Taxa ${fromCurrency} → ${baseCurrency} salva!`);
    setRate("");
    onSuccess();
  };

  return (
    <form onSubmit={handleSubmit} className="flex flex-wrap items-end gap-3 pt-1">
      <div className="space-y-1.5 min-w-[120px]">
        <Label className="text-[11px] text-zinc-500 uppercase tracking-wider">
          De
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
          Taxa ({fromCurrency} → {baseCurrency})
        </Label>
        <Input
          type="text"
          inputMode="decimal"
          placeholder={`Ex: 5.20`}
          value={rate}
          onChange={(e) => setRate(e.target.value)}
          className="h-8 bg-zinc-900 border-zinc-700 text-zinc-200 text-xs placeholder:text-zinc-600 focus-visible:ring-indigo-500 focus-visible:border-indigo-500"
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
        Salvar taxa
      </Button>
    </form>
  );
}

export function ExchangeRatesSection({ orgId, baseCurrency }: ExchangeRatesSectionProps) {
  const { data: rates, isLoading } = useExchangeRates(orgId);
  const deleteMutation = useDeleteExchangeRate(orgId);
  const [showForm, setShowForm] = useState(false);

  const handleDelete = async (id: string, from: string) => {
    await deleteMutation.mutateAsync({ id });
    toast.success(`Taxa ${from} removida.`);
  };

  const existingPairs = rates?.map((r) => r.fromCurrency) ?? [];

  return (
    <div className="rounded-xl border border-zinc-800 bg-zinc-900/50 overflow-hidden">
      <div className="flex items-center justify-between p-5 border-b border-zinc-800">
        <div className="flex items-center gap-2">
          <IconCurrencyDollar size={15} className="text-indigo-400" />
          <div>
            <h3 className="text-sm font-bold text-zinc-100">Taxas de Câmbio</h3>
            <p className="text-xs text-zinc-500 mt-0.5">
              Moeda base: <span className="text-zinc-300 font-semibold font-mono">{baseCurrency}</span>
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
              : "bg-indigo-600 hover:bg-indigo-500 text-white"
          )}
        >
          <IconPlus size={13} />
          Adicionar taxa
        </Button>
      </div>

      <div className="p-5 space-y-4">
        <div className="flex items-start gap-2 rounded-lg border border-amber-800/30 bg-amber-900/10 px-3 py-2.5">
          <IconAlertTriangle size={14} className="text-amber-500 mt-0.5 shrink-0" />
          <p className="text-xs text-amber-400/80 leading-relaxed">
            Atualize as taxas regularmente para manter o P&L preciso. Eventos recebidos com
            moeda diferente de <span className="font-semibold font-mono">{baseCurrency}</span> serão
            rejeitados se a taxa não estiver configurada.
          </p>
        </div>

        {showForm && (
          <div className="rounded-lg border border-zinc-800 bg-zinc-900/40 p-4">
            <p className="text-xs font-semibold text-zinc-400 mb-3">Nova taxa de câmbio</p>
            <RateForm
              orgId={orgId}
              baseCurrency={baseCurrency}
              existingPairs={existingPairs}
              onSuccess={() => setShowForm(false)}
            />
          </div>
        )}

        {isLoading ? (
          <div className="space-y-2">
            {Array.from({ length: 2 }).map((_, i) => (
              <Skeleton key={i} className="h-14 w-full rounded-lg bg-zinc-800" />
            ))}
          </div>
        ) : rates?.length === 0 ? (
          <div className="py-6 text-center">
            <p className="text-sm text-zinc-600">Nenhuma taxa configurada.</p>
            <p className="text-xs text-zinc-700 mt-1">
              Se sua organização só vende em {baseCurrency}, não é necessário configurar.
            </p>
          </div>
        ) : (
          <div className="space-y-2">
            {rates?.map((r) => (
              <div
                key={r.id}
                className="flex items-center justify-between rounded-lg border border-zinc-800 bg-zinc-900/40 px-4 py-3"
              >
                <div className="flex items-center gap-3">
                  <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-indigo-600/20 shrink-0">
                    <IconCurrencyDollar size={14} className="text-indigo-400" />
                  </div>
                  <div>
                    <p className="text-sm font-semibold text-zinc-200 font-mono">
                      {r.fromCurrency} → {r.toCurrency}
                    </p>
                    <div className="flex items-center gap-2 mt-0.5">
                      <span className="text-xs text-zinc-400">
                        1 {r.fromCurrency} ={" "}
                        <span className="text-zinc-200 font-semibold">{r.rate.toFixed(4)}</span>{" "}
                        {r.toCurrency}
                      </span>
                      <span className="text-[10px] text-zinc-600">
                        · atualizado {dayjs(r.updatedAt).fromNow()}
                      </span>
                    </div>
                  </div>
                </div>

                <Button
                  variant="ghost"
                  size="icon"
                  onClick={() => handleDelete(r.id, r.fromCurrency)}
                  disabled={deleteMutation.isPending}
                  className="h-7 w-7 text-zinc-600 hover:text-red-400"
                  title="Remover taxa"
                >
                  <IconTrash size={14} />
                </Button>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
