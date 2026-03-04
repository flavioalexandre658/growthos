"use server";

import { getServerSession } from "next-auth";
import { eq } from "drizzle-orm";
import { z } from "zod";
import { authOptions } from "@/lib/auth-options";
import { db } from "@/db";
import { orgMembers, orgInvites, users } from "@/db/schema";

const schema = z.object({
  organizationId: z.string().uuid(),
});

export async function getOrgMembers(input: z.infer<typeof schema>) {
  const session = await getServerSession(authOptions);
  if (!session?.user) throw new Error("Unauthorized");

  const data = schema.parse(input);

  const members = await db
    .select({
      id: orgMembers.id,
      userId: orgMembers.userId,
      role: orgMembers.role,
      invitedAt: orgMembers.invitedAt,
      acceptedAt: orgMembers.acceptedAt,
      userName: users.name,
      userEmail: users.email,
    })
    .from(orgMembers)
    .leftJoin(users, eq(orgMembers.userId, users.id))
    .where(eq(orgMembers.organizationId, data.organizationId))
    .orderBy(orgMembers.invitedAt);

  const invites = await db
    .select()
    .from(orgInvites)
    .where(eq(orgInvites.organizationId, data.organizationId))
    .orderBy(orgInvites.createdAt);

  return { members, invites };
}
