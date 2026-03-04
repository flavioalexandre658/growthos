"use server";

import { getServerSession } from "next-auth";
import { eq, and, ne } from "drizzle-orm";
import { z } from "zod";
import { authOptions } from "@/lib/auth-options";
import { db } from "@/db";
import { organizations } from "@/db/schema";

const schema = z.object({
  organizationId: z.string().uuid(),
  name: z.string().min(2, "Nome deve ter ao menos 2 caracteres"),
  slug: z
    .string()
    .min(2, "Slug deve ter ao menos 2 caracteres")
    .max(60)
    .regex(
      /^[a-z0-9]+(?:-[a-z0-9]+)*$/,
      "Slug deve conter apenas letras minúsculas, números e hífens",
    ),
});

export async function updateOrganization(input: z.infer<typeof schema>) {
  const session = await getServerSession(authOptions);
  if (!session?.user) throw new Error("Unauthorized");

  const data = schema.parse(input);

  const [existing] = await db
    .select({ id: organizations.id })
    .from(organizations)
    .where(
      and(
        eq(organizations.slug, data.slug),
        ne(organizations.id, data.organizationId),
      ),
    )
    .limit(1);

  if (existing) {
    throw new Error("Este slug já está em uso por outra organização.");
  }

  const [updated] = await db
    .update(organizations)
    .set({
      name: data.name,
      slug: data.slug,
      updatedAt: new Date(),
    })
    .where(eq(organizations.id, data.organizationId))
    .returning();

  return updated;
}
