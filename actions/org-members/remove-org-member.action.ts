"use server";

import { getServerSession } from "next-auth";
import { eq } from "drizzle-orm";
import { z } from "zod";
import { authOptions } from "@/lib/auth-options";
import { db } from "@/db";
import { orgMembers } from "@/db/schema";

const schema = z.object({
  id: z.string().uuid(),
});

export async function removeOrgMember(input: z.infer<typeof schema>) {
  const session = await getServerSession(authOptions);
  if (!session?.user) throw new Error("Unauthorized");

  const data = schema.parse(input);

  const [removed] = await db
    .delete(orgMembers)
    .where(eq(orgMembers.id, data.id))
    .returning();

  return removed;
}
