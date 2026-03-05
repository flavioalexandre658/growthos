import { db } from "@/db";
import { exchangeRates } from "@/db/schema";
import { and, eq } from "drizzle-orm";

export async function resolveExchangeRate(
  organizationId: string,
  fromCurrency: string,
  toCurrency: string,
): Promise<number | null> {
  if (fromCurrency === toCurrency) return 1;

  const [found] = await db
    .select({ rate: exchangeRates.rate })
    .from(exchangeRates)
    .where(
      and(
        eq(exchangeRates.organizationId, organizationId),
        eq(exchangeRates.fromCurrency, fromCurrency),
        eq(exchangeRates.toCurrency, toCurrency),
      ),
    )
    .limit(1);

  return found?.rate ?? null;
}
