import { getServerSession } from "next-auth";
import { eq } from "drizzle-orm";
import { authOptions } from "@/lib/auth-options";
import { db } from "@/db";
import { users } from "@/db/schema";
import { getPlan } from "@/utils/plans";
import type { IPlanTier } from "@/utils/plans";

export async function getUserPlan(): Promise<IPlanTier> {
  const session = await getServerSession(authOptions);
  if (!session?.user) return getPlan("free");

  const [row] = await db
    .select({ planSlug: users.planSlug })
    .from(users)
    .where(eq(users.id, session.user.id))
    .limit(1);

  return getPlan(row?.planSlug ?? "free");
}
