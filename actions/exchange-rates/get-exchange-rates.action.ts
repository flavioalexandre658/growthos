"use server";

import { getServerSession } from "next-auth";
import { eq } from "drizzle-orm";
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

  return db
    .select()
    .from(exchangeRates)
    .where(eq(exchangeRates.organizationId, data.organizationId))
    .orderBy(exchangeRates.fromCurrency);
}
