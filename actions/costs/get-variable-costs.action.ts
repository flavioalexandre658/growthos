"use server";

import { z } from "zod";
import { eq } from "drizzle-orm";
import { db } from "@/db";
import { variableCosts } from "@/db/schema";

const schema = z.object({
  organizationId: z.string().uuid(),
});

export async function getVariableCosts(organizationId: string) {
  schema.parse({ organizationId });
  return db
    .select()
    .from(variableCosts)
    .where(eq(variableCosts.organizationId, organizationId))
    .orderBy(variableCosts.createdAt);
}
