const PT_BR_INT = new Intl.NumberFormat("pt-BR", { minimumFractionDigits: 0, maximumFractionDigits: 0 });
const PT_BR_DEC2 = new Intl.NumberFormat("pt-BR", { minimumFractionDigits: 2, maximumFractionDigits: 2 });

export function fmtInt(value: number | string | null | undefined): string {
  const n = Number(value ?? 0);
  if (isNaN(n)) return "0";
  return PT_BR_INT.format(Math.round(n));
}

export function fmtBRL(value: number | string | null | undefined): string {
  const n = Number(value ?? 0);
  if (isNaN(n)) return "R$ 0";
  return `R$ ${PT_BR_INT.format(Math.round(n))}`;
}

export function fmtBRLDecimal(value: number | string | null | undefined): string {
  const n = Number(value ?? 0);
  if (isNaN(n)) return "R$ 0,00";
  return `R$ ${PT_BR_DEC2.format(n)}`;
}

export function fmtBRLCompact(value: number): string {
  if (value >= 1_000_000) return `R$${(value / 1_000_000).toFixed(1)}M`;
  if (value >= 10_000) return `R$${(value / 1_000).toFixed(0)}k`;
  if (value >= 1_000) return `R$${(value / 1_000).toFixed(1)}k`;
  return `R$${Math.round(value)}`;
}

export function fmtCurrency(
  value: number | string | null | undefined,
  locale: string,
  currency: string,
): string {
  const n = Number(value ?? 0);
  if (isNaN(n)) return new Intl.NumberFormat(locale, { style: "currency", currency, maximumFractionDigits: 0 }).format(0);
  return new Intl.NumberFormat(locale, {
    style: "currency",
    currency,
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(Math.round(n));
}

export function fmtCurrencyDecimal(
  value: number | string | null | undefined,
  locale: string,
  currency: string,
): string {
  const n = Number(value ?? 0);
  if (isNaN(n)) return new Intl.NumberFormat(locale, { style: "currency", currency }).format(0);
  return new Intl.NumberFormat(locale, {
    style: "currency",
    currency,
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(n);
}

export function fmtCurrencyCompact(
  value: number,
  locale: string,
  currency: string,
): string {
  const abs = Math.abs(value);
  if (abs >= 1_000) {
    return new Intl.NumberFormat(locale, {
      style: "currency",
      currency,
      maximumFractionDigits: abs >= 1_000_000 ? 1 : 0,
      notation: "compact",
    }).format(value);
  }
  return fmtCurrency(value, locale, currency);
}

export function getCurrencySymbol(locale: string, currency: string): string {
  const parts = new Intl.NumberFormat(locale, { style: "currency", currency }).formatToParts(0);
  const sym = parts.find((p) => p.type === "currency")?.value ?? currency;
  return sym + " ";
}
