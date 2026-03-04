"use server";

import { getServerSession } from "next-auth";
import { eq } from "drizzle-orm";
import { z } from "zod";
import { authOptions } from "@/lib/auth-options";
import { db } from "@/db";
import { organizations } from "@/db/schema";

const schema = z.object({
  organizationId: z.string().uuid(),
  segment: z.string().optional(),
  model: z.string().optional(),
  taxRegime: z.string().optional(),
  monthlyGoal: z.number().optional(),
});

export async function updateAiProfile(input: z.infer<typeof schema>) {
  const session = await getServerSession(authOptions);
  if (!session?.user) throw new Error("Unauthorized");

  const data = schema.parse(input);

  const [org] = await db
    .update(organizations)
    .set({
      aiProfile: {
        segment: data.segment,
        model: data.model,
        taxRegime: data.taxRegime,
        monthlyGoal: data.monthlyGoal,
      },
      updatedAt: new Date(),
    })
    .where(eq(organizations.id, data.organizationId))
    .returning();

  return org;
}
