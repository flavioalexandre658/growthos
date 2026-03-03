"use server";

import { getServerSession } from "next-auth";
import { eq } from "drizzle-orm";
import { z } from "zod";
import { authOptions } from "@/lib/auth-options";
import { db } from "@/db";
import { organizations } from "@/db/schema";

const schema = z.object({
  organizationId: z.string().uuid(),
  timezone: z.string().min(1),
});

export async function updateOrganizationTimezone(input: z.infer<typeof schema>) {
  const session = await getServerSession(authOptions);
  if (!session?.user) throw new Error("Unauthorized");

  const data = schema.parse(input);

  const [org] = await db
    .update(organizations)
    .set({ timezone: data.timezone, updatedAt: new Date() })
    .where(eq(organizations.id, data.organizationId))
    .returning();

  return org;
}
