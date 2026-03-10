"use server";

import { z } from "zod";
import { eq } from "drizzle-orm";
import { db } from "@/db";
import { marketingSpends } from "@/db/schema";

const schema = z.object({
  id: z.string().uuid(),
  source: z.string().min(1).optional(),
  sourceLabel: z.string().min(1).optional(),
  amountInCents: z.number().int().positive().optional(),
  spentAt: z.string().min(1).optional(),
  description: z.string().optional().nullable(),
});

export async function updateMarketingSpend(data: z.infer<typeof schema>) {
  const { id, ...rest } = schema.parse(data);
  const result = await db
    .update(marketingSpends)
    .set({ ...rest, updatedAt: new Date() })
    .where(eq(marketingSpends.id, id))
    .returning();
  return result[0];
}
