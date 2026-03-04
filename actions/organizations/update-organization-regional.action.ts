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
  currency: z.string().length(3),
  locale: z.string().min(2),
  country: z.string().length(2),
  language: z.string().min(2),
});

export async function updateOrganizationRegional(input: z.infer<typeof schema>) {
  const session = await getServerSession(authOptions);
  if (!session?.user) throw new Error("Unauthorized");

  const data = schema.parse(input);

  const [org] = await db
    .update(organizations)
    .set({
      timezone: data.timezone,
      currency: data.currency,
      locale: data.locale,
      country: data.country,
      language: data.language,
      updatedAt: new Date(),
    })
    .where(eq(organizations.id, data.organizationId))
    .returning();

  return org;
}
