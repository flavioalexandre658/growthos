"use server";

import { getServerSession } from "next-auth";
import { z } from "zod";
import { randomBytes } from "crypto";
import { eq, and, sql } from "drizzle-orm";
import { authOptions } from "@/lib/auth-options";
import { db } from "@/db";
import { orgInvites, orgMembers, organizations, users } from "@/db/schema";
import { sendEmail } from "@/lib/email";
import { teamInviteEmail } from "@/lib/email-templates/team-invite";
import { getPlan } from "@/utils/plans";

const schema = z.object({
  organizationId: z.string().uuid(),
  email: z.string().email(),
  role: z.enum(["admin", "viewer"]).default("viewer"),
});

export async function inviteOrgMember(input: z.infer<typeof schema>) {
  const session = await getServerSession(authOptions);
  if (!session?.user) throw new Error("Unauthorized");

  const data = schema.parse(input);

  const [ownerMembership] = await db
    .select({ role: orgMembers.role })
    .from(orgMembers)
    .where(
      and(
        eq(orgMembers.organizationId, data.organizationId),
        eq(orgMembers.userId, session.user.id),
      ),
    )
    .limit(1);

  if (!ownerMembership) throw new Error("Você não é membro desta organização.");

  const [userRow] = await db
    .select({ planSlug: users.planSlug })
    .from(users)
    .where(eq(users.id, session.user.id))
    .limit(1);

  const plan = getPlan(userRow?.planSlug ?? "free");

  if (plan.maxMembers !== Infinity) {
    const [countRow] = await db
      .select({ count: sql<number>`COUNT(*)` })
      .from(orgMembers)
      .where(eq(orgMembers.organizationId, data.organizationId));

    const [inviteCountRow] = await db
      .select({ count: sql<number>`COUNT(*)` })
      .from(orgInvites)
      .where(eq(orgInvites.organizationId, data.organizationId));

    const totalMembers = Number(countRow?.count ?? 0) + Number(inviteCountRow?.count ?? 0);

    if (totalMembers >= plan.maxMembers) {
      throw new Error(
        `Seu plano ${plan.name} permite no máximo ${plan.maxMembers} membro(s) por organização. Faça upgrade para convidar mais.`,
      );
    }
  }

  const [org] = await db
    .select({ name: organizations.name })
    .from(organizations)
    .where(eq(organizations.id, data.organizationId))
    .limit(1);

  const token = randomBytes(32).toString("hex");
  const expiresAt = new Date();
  expiresAt.setDate(expiresAt.getDate() + 7);

  const [invite] = await db
    .insert(orgInvites)
    .values({
      organizationId: data.organizationId,
      email: data.email,
      role: data.role,
      token,
      expiresAt,
    })
    .returning();

  const baseUrl = process.env.NEXTAUTH_URL ?? "http://localhost:3000";
  const inviteUrl = `${baseUrl}/invite/${token}`;

  await sendEmail({
    to: data.email,
    subject: `Você foi convidado para ${org?.name ?? "um workspace"} no Groware`,
    html: teamInviteEmail({
      inviteeEmail: data.email,
      orgName: org?.name ?? "workspace",
      inviterName: session.user.name,
      role: data.role,
      inviteUrl,
      expiresInDays: 7,
    }),
  });

  return invite;
}
