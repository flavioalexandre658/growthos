"use server";

import { getServerSession } from "next-auth";
import { z } from "zod";
import { authOptions } from "@/lib/auth-options";
import { db } from "@/db";
import { exchangeRates } from "@/db/schema";

const schema = z.object({
  organizationId: z.string().uuid(),
  fromCurrency: z.string().length(3).toUpperCase(),
  toCurrency: z.string().length(3).toUpperCase(),
  rate: z.number().positive("A taxa deve ser maior que zero"),
});

export async function upsertExchangeRate(input: z.infer<typeof schema>) {
  const session = await getServerSession(authOptions);
  if (!session?.user) throw new Error("Unauthorized");

  const data = schema.parse(input);

  const [rate] = await db
    .insert(exchangeRates)
    .values({
      organizationId: data.organizationId,
      fromCurrency: data.fromCurrency,
      toCurrency: data.toCurrency,
      rate: data.rate,
    })
    .onConflictDoUpdate({
      target: [
        exchangeRates.organizationId,
        exchangeRates.fromCurrency,
        exchangeRates.toCurrency,
      ],
      set: {
        rate: data.rate,
        updatedAt: new Date(),
      },
    })
    .returning();

  return rate;
}
