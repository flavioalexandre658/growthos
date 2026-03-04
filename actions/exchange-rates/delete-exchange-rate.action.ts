"use server";

import { getServerSession } from "next-auth";
import { eq } from "drizzle-orm";
import { z } from "zod";
import { authOptions } from "@/lib/auth-options";
import { db } from "@/db";
import { exchangeRates } from "@/db/schema";

const schema = z.object({
  id: z.string().uuid(),
});

export async function deleteExchangeRate(input: z.infer<typeof schema>) {
  const session = await getServerSession(authOptions);
  if (!session?.user) throw new Error("Unauthorized");

  const data = schema.parse(input);

  const [deleted] = await db
    .delete(exchangeRates)
    .where(eq(exchangeRates.id, data.id))
    .returning();

  return deleted;
}
