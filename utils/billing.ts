export type BillingInterval = "monthly" | "quarterly" | "semiannual" | "yearly" | "weekly";

export const INTERVAL_LABELS: Record<string, string> = {
  monthly: "Mensal",
  quarterly: "Trimestral",
  semiannual: "Semestral",
  yearly: "Anual",
  weekly: "Semanal",
};

export function normalizeToMonthly(valueInCents: number, interval: string): number {
  switch (interval) {
    case "yearly":
      return Math.round(valueInCents / 12);
    case "semiannual":
      return Math.round(valueInCents / 6);
    case "quarterly":
      return Math.round(valueInCents / 3);
    case "weekly":
      return Math.round(valueInCents * 4.33);
    default:
      return valueInCents;
  }
}
