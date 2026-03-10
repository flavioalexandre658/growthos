"use server";

import { eq } from "drizzle-orm";
import { db } from "@/db";
import { marketingSpends } from "@/db/schema";

export async function deleteMarketingSpend(id: string) {
  const result = await db
    .delete(marketingSpends)
    .where(eq(marketingSpends.id, id))
    .returning();
  return result[0];
}
