"use server";

import { z } from "zod";
import { db } from "@/db";
import { marketingSpends } from "@/db/schema";

const schema = z.object({
  organizationId: z.string().uuid(),
  source: z.string().min(1),
  sourceLabel: z.string().min(1),
  amountInCents: z.number().int().positive("Valor deve ser positivo"),
  spentAt: z.string().min(1),
  description: z.string().optional(),
});

export async function createMarketingSpend(data: z.infer<typeof schema>) {
  const parsed = schema.parse(data);
  const result = await db.insert(marketingSpends).values(parsed).returning();
  return result[0];
}
