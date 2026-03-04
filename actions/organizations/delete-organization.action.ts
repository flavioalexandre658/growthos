"use server";

import { getServerSession } from "next-auth";
import { eq, and } from "drizzle-orm";
import { z } from "zod";
import { authOptions } from "@/lib/auth-options";
import { db } from "@/db";
import { organizations } from "@/db/schema";

const schema = z.object({
  organizationId: z.string().uuid(),
  confirmationName: z.string(),
});

export async function deleteOrganization(input: z.infer<typeof schema>) {
  const session = await getServerSession(authOptions);
  if (!session?.user) throw new Error("Unauthorized");

  const data = schema.parse(input);

  const [org] = await db
    .select({ id: organizations.id, name: organizations.name })
    .from(organizations)
    .where(eq(organizations.id, data.organizationId))
    .limit(1);

  if (!org) throw new Error("Organização não encontrada.");

  if (org.name !== data.confirmationName) {
    throw new Error(
      "Nome de confirmação incorreto. Digite o nome exato da organização.",
    );
  }

  await db
    .delete(organizations)
    .where(
      and(
        eq(organizations.id, data.organizationId),
      ),
    );

  return { success: true };
}
