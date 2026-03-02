"use server";

import { z } from "zod";
import { eq } from "drizzle-orm";
import { db } from "@/db";
import { fixedCosts } from "@/db/schema";

const schema = z.object({
  organizationId: z.string().uuid(),
});

export async function getFixedCosts(organizationId: string) {
  schema.parse({ organizationId });
  return db
    .select()
    .from(fixedCosts)
    .where(eq(fixedCosts.organizationId, organizationId))
    .orderBy(fixedCosts.createdAt);
}
