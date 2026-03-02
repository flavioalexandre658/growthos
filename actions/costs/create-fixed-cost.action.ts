"use server";

import { z } from "zod";
import { db } from "@/db";
import { fixedCosts } from "@/db/schema";

const schema = z.object({
  organizationId: z.string().uuid(),
  name: z.string().min(1, "Nome é obrigatório"),
  amountInCents: z.number().int().positive("Valor deve ser positivo"),
  type: z.enum(["VALUE", "PERCENTAGE"]),
  description: z.string().optional(),
});

export async function createFixedCost(data: z.infer<typeof schema>) {
  const parsed = schema.parse(data);
  const result = await db.insert(fixedCosts).values(parsed).returning();
  return result[0];
}
