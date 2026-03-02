"use server";

import { z } from "zod";
import { eq } from "drizzle-orm";
import { db } from "@/db";
import { fixedCosts } from "@/db/schema";

const schema = z.object({
  id: z.string().uuid(),
});

export async function deleteFixedCost(id: string) {
  schema.parse({ id });
  await db.delete(fixedCosts).where(eq(fixedCosts.id, id));
}
