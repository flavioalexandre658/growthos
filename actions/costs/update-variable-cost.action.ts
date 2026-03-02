"use server";

import { z } from "zod";
import { eq } from "drizzle-orm";
import { db } from "@/db";
import { variableCosts } from "@/db/schema";

const schema = z.object({
  id: z.string().uuid(),
  name: z.string().min(1).optional(),
  amountInCents: z.number().int().positive().optional(),
  type: z.enum(["VALUE", "PERCENTAGE"]).optional(),
  description: z.string().optional().nullable(),
});

export async function updateVariableCost(data: z.infer<typeof schema>) {
  const { id, ...updates } = schema.parse(data);
  const result = await db
    .update(variableCosts)
    .set({ ...updates, updatedAt: new Date() })
    .where(eq(variableCosts.id, id))
    .returning();
  return result[0];
}
