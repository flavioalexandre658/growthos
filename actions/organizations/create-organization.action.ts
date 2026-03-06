"use server";

import { getServerSession } from "next-auth";
import { eq, and, sql } from "drizzle-orm";
import { z } from "zod";
import { authOptions } from "@/lib/auth-options";
import { db } from "@/db";
import { organizations, users, orgMembers } from "@/db/schema";
import { getPlan } from "@/utils/plans";

const schema = z.object({
  name: z.string().min(2, "Nome deve ter pelo menos 2 caracteres"),
  slug: z
    .string()
    .min(2, "Slug deve ter pelo menos 2 caracteres")
    .regex(/^[a-z0-9-]+$/, "Slug deve conter apenas letras minúsculas, números e hífens"),
});

export async function createOrganization(input: z.infer<typeof schema>) {
  const session = await getServerSession(authOptions);
  if (!session?.user) throw new Error("Unauthorized");

  const data = schema.parse(input);

  const [userRow] = await db
    .select({ planSlug: users.planSlug })
    .from(users)
    .where(eq(users.id, session.user.id))
    .limit(1);

  const plan = getPlan(userRow?.planSlug ?? "free");

  if (plan.maxOrgs !== Infinity) {
    const [countRow] = await db
      .select({ count: sql<number>`COUNT(*)` })
      .from(orgMembers)
      .where(and(eq(orgMembers.userId, session.user.id), eq(orgMembers.role, "owner")));

    const ownedCount = Number(countRow?.count ?? 0);

    if (ownedCount >= plan.maxOrgs) {
      throw new Error(
        `Seu plano ${plan.name} permite no máximo ${plan.maxOrgs} organização(ões). Faça upgrade para criar mais.`,
      );
    }
  }

  const [existing] = await db
    .select({ id: organizations.id })
    .from(organizations)
    .where(eq(organizations.slug, data.slug))
    .limit(1);

  if (existing) {
    throw new Error("Este slug já está em uso. Escolha outro.");
  }

  const [org] = await db
    .insert(organizations)
    .values({
      name: data.name,
      slug: data.slug,
      createdByUserId: session.user.id,
    })
    .returning();

  await db.insert(orgMembers).values({
    organizationId: org.id,
    userId: session.user.id,
    role: "owner",
    acceptedAt: new Date(),
  });

  return org;
}
