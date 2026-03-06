"use server";

import { z } from "zod";
import { eq } from "drizzle-orm";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth-options";
import { db } from "@/db";
import { orgInvites, orgMembers, organizations, users } from "@/db/schema";

const schema = z.object({
  token: z.string().min(1),
});

export async function getInviteByToken(token: string) {
  const [invite] = await db
    .select({
      id: orgInvites.id,
      email: orgInvites.email,
      role: orgInvites.role,
      expiresAt: orgInvites.expiresAt,
      organizationId: orgInvites.organizationId,
      orgName: organizations.name,
      orgSlug: organizations.slug,
    })
    .from(orgInvites)
    .innerJoin(organizations, eq(orgInvites.organizationId, organizations.id))
    .where(eq(orgInvites.token, token))
    .limit(1);

  return invite ?? null;
}

export async function acceptInvite(input: z.infer<typeof schema>) {
  const data = schema.parse(input);
  const session = await getServerSession(authOptions);
  if (!session?.user) throw new Error("Você precisa estar logado para aceitar o convite.");

  const invite = await getInviteByToken(data.token);

  if (!invite) throw new Error("Convite inválido.");
  if (invite.expiresAt < new Date()) throw new Error("Este convite expirou.");
  if (invite.email.toLowerCase() !== session.user.email.toLowerCase()) {
    throw new Error("Este convite foi enviado para outro email.");
  }

  const [existing] = await db
    .select({ id: orgMembers.id })
    .from(orgMembers)
    .where(eq(orgMembers.userId, session.user.id))
    .limit(1);

  if (existing) throw new Error("Você já é membro desta organização.");

  await db.insert(orgMembers).values({
    organizationId: invite.organizationId,
    userId: session.user.id,
    role: invite.role,
    acceptedAt: new Date(),
  });

  await db.delete(orgInvites).where(eq(orgInvites.id, invite.id));

  return { success: true, slug: invite.orgSlug };
}
