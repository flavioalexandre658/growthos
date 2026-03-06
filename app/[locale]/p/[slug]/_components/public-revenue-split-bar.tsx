interface PublicRevenueSplitBarProps {
  recurring: number;
  oneTime: number;
  currency: string;
  locale: string;
}

function formatCurrency(value: number, locale: string, currency: string): string {
  return new Intl.NumberFormat(locale, {
    style: "currency",
    currency,
    maximumFractionDigits: 0,
  }).format(value / 100);
}

export function PublicRevenueSplitBar({
  recurring,
  oneTime,
  currency,
  locale,
}: PublicRevenueSplitBarProps) {
  const total = recurring + oneTime;
  if (total === 0) return null;

  const recurringPct = Math.round((recurring / total) * 100);
  const oneTimePct = 100 - recurringPct;

  return (
    <div className="rounded-xl border border-zinc-800/80 bg-zinc-900/40 px-4 py-3 sm:px-5 sm:py-4">
      <p className="text-[10px] sm:text-[11px] font-semibold uppercase tracking-widest text-zinc-500 mb-3">
        Composição da receita
      </p>

      <div className="h-3 rounded-full overflow-hidden flex bg-zinc-800/60">
        {recurringPct > 0 && (
          <div
            className="bg-indigo-500 transition-all duration-500 rounded-l-full"
            style={{ width: `${recurringPct}%` }}
          />
        )}
        {oneTimePct > 0 && (
          <div
            className="bg-amber-500 transition-all duration-500 rounded-r-full"
            style={{ width: `${oneTimePct}%` }}
          />
        )}
      </div>

      <div className="flex items-center justify-between mt-3 gap-4">
        <div className="flex items-center gap-2">
          <span className="w-2.5 h-2.5 rounded-full bg-indigo-500 shrink-0" />
          <div>
            <p className="text-xs font-bold text-zinc-200 font-mono tabular-nums">
              {formatCurrency(recurring, locale, currency)}
            </p>
            <p className="text-[10px] text-zinc-600">
              Recorrente · {recurringPct}%
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <span className="w-2.5 h-2.5 rounded-full bg-amber-500 shrink-0" />
          <div className="text-right">
            <p className="text-xs font-bold text-zinc-200 font-mono tabular-nums">
              {formatCurrency(oneTime, locale, currency)}
            </p>
            <p className="text-[10px] text-zinc-600">
              Avulso · {oneTimePct}%
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
