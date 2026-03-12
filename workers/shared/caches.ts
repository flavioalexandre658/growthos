import { db } from "@/db";
import { events, payments, exchangeRates } from "@/db/schema";
import { and, eq, isNotNull, asc, lte, desc } from "drizzle-orm";

export interface AcquisitionContext {
  source: string | null;
  medium: string | null;
  campaign: string | null;
  content: string | null;
  landingPage: string | null;
  entryPage: string | null;
  sessionId: string | null;
}

export class SyncCaches {
  private exchangeRateCache = new Map<string, number>();
  private acquisitionCache = new Map<string, AcquisitionContext | null>();

  async resolveExchangeRate(
    organizationId: string,
    fromCurrency: string,
    toCurrency: string,
  ): Promise<number> {
    if (fromCurrency === toCurrency) return 1;

    const key = `${organizationId}:${fromCurrency}:${toCurrency}`;
    const cached = this.exchangeRateCache.get(key);
    if (cached !== undefined) return cached;

    const [found] = await db
      .select({ rate: exchangeRates.rate })
      .from(exchangeRates)
      .where(
        and(
          eq(exchangeRates.organizationId, organizationId),
          eq(exchangeRates.fromCurrency, fromCurrency),
          eq(exchangeRates.toCurrency, toCurrency),
          lte(exchangeRates.effectiveFrom, new Date()),
        ),
      )
      .orderBy(desc(exchangeRates.effectiveFrom))
      .limit(1);

    const rate = found?.rate ?? 1;
    this.exchangeRateCache.set(key, rate);
    return rate;
  }

  async lookupAcquisition(
    organizationId: string,
    customerId: string,
  ): Promise<AcquisitionContext | null> {
    const key = `${organizationId}:${customerId}`;
    if (this.acquisitionCache.has(key)) {
      return this.acquisitionCache.get(key)!;
    }

    const recentRows = await db
      .select({
        source: events.source,
        medium: events.medium,
        campaign: events.campaign,
        content: events.content,
        landingPage: events.landingPage,
        entryPage: events.entryPage,
        sessionId: events.sessionId,
      })
      .from(events)
      .where(
        and(
          eq(events.organizationId, organizationId),
          eq(events.customerId, customerId),
          isNotNull(events.source),
        ),
      )
      .orderBy(asc(events.createdAt))
      .limit(1);

    if (recentRows[0]) {
      this.acquisitionCache.set(key, recentRows[0]);
      return recentRows[0];
    }

    const historicalRows = await db
      .select({
        source: payments.source,
        medium: payments.medium,
        campaign: payments.campaign,
        content: payments.content,
        landingPage: payments.landingPage,
        entryPage: payments.entryPage,
        sessionId: payments.sessionId,
      })
      .from(payments)
      .where(
        and(
          eq(payments.organizationId, organizationId),
          eq(payments.customerId, customerId),
          isNotNull(payments.source),
          eq(payments.billingReason, "subscription_create"),
        ),
      )
      .orderBy(asc(payments.createdAt))
      .limit(1);

    const result = historicalRows[0] ?? null;
    this.acquisitionCache.set(key, result);
    return result;
  }

  async computeBaseValue(
    organizationId: string,
    eventCurrency: string,
    orgCurrency: string,
    grossValueInCents: number,
  ): Promise<{ baseCurrency: string; exchangeRate: number; baseValueInCents: number }> {
    const rate = await this.resolveExchangeRate(organizationId, eventCurrency, orgCurrency);
    return {
      baseCurrency: orgCurrency,
      exchangeRate: rate,
      baseValueInCents: Math.round(grossValueInCents * rate),
    };
  }

  async preloadAcquisitions(organizationId: string): Promise<void> {
    const rows = await db
      .select({
        customerId: events.customerId,
        source: events.source,
        medium: events.medium,
        campaign: events.campaign,
        content: events.content,
        landingPage: events.landingPage,
        entryPage: events.entryPage,
        sessionId: events.sessionId,
      })
      .from(events)
      .where(
        and(
          eq(events.organizationId, organizationId),
          isNotNull(events.customerId),
          isNotNull(events.source),
        ),
      )
      .orderBy(asc(events.createdAt));

    for (const row of rows) {
      if (!row.customerId) continue;
      const key = `${organizationId}:${row.customerId}`;
      if (!this.acquisitionCache.has(key)) {
        this.acquisitionCache.set(key, {
          source: row.source,
          medium: row.medium,
          campaign: row.campaign,
          content: row.content,
          landingPage: row.landingPage,
          entryPage: row.entryPage,
          sessionId: row.sessionId,
        });
      }
    }
  }

  clear(): void {
    this.exchangeRateCache.clear();
    this.acquisitionCache.clear();
  }
}
