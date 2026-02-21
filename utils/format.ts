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
