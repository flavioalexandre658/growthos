"use server";

import { z } from "zod";
import { eq } from "drizzle-orm";
import { db } from "@/db";
import { variableCosts } from "@/db/schema";

const schema = z.object({
  id: z.string().uuid(),
});

export async function deleteVariableCost(id: string) {
  schema.parse({ id });
  await db.delete(variableCosts).where(eq(variableCosts.id, id));
}
