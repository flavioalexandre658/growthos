"use server";

import { getServerSession } from "next-auth";
import { and, desc, eq, lte } from "drizzle-orm";
import { z } from "zod";
import { authOptions } from "@/lib/auth-options";
import { db } from "@/db";
import { exchangeRates } from "@/db/schema";

const schema = z.object({
  organizationId: z.string().uuid(),
});

export async function getExchangeRates(input: z.infer<typeof schema>) {
  const session = await getServerSession(authOptions);
  if (!session?.user) throw new Error("Unauthorized");

  const data = schema.parse(input);

  const now = new Date();

  const allRates = await db
    .select()
    .from(exchangeRates)
    .where(eq(exchangeRates.organizationId, data.organizationId))
    .orderBy(
      exchangeRates.fromCurrency,
      desc(exchangeRates.effectiveFrom),
    );

  const currentPairs = new Set<string>();

  return allRates.map((r) => {
    const pairKey = `${r.fromCurrency}-${r.toCurrency}`;
    const isEffective = r.effectiveFrom <= now;
    const isCurrent = isEffective && !currentPairs.has(pairKey);

    if (isCurrent) {
      currentPairs.add(pairKey);
    }

    return { ...r, isCurrent };
  });
}
