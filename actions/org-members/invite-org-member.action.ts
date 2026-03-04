"use server";

import { getServerSession } from "next-auth";
import { z } from "zod";
import { randomBytes } from "crypto";
import { authOptions } from "@/lib/auth-options";
import { db } from "@/db";
import { orgInvites } from "@/db/schema";

const schema = z.object({
  organizationId: z.string().uuid(),
  email: z.string().email(),
  role: z.enum(["admin", "viewer"]).default("viewer"),
});

export async function inviteOrgMember(input: z.infer<typeof schema>) {
  const session = await getServerSession(authOptions);
  if (!session?.user) throw new Error("Unauthorized");

  const data = schema.parse(input);

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

  return invite;
}
