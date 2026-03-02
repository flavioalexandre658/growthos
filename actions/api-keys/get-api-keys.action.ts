"use server";

import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth-options";
import { eq } from "drizzle-orm";
import { db } from "@/db";
import { apiKeys } from "@/db/schema";

export async function getApiKeys(organizationId: string) {
  const session = await getServerSession(authOptions);
  if (!session?.user) return [];

  return db
    .select()
    .from(apiKeys)
    .where(eq(apiKeys.organizationId, organizationId))
    .orderBy(apiKeys.createdAt);
}
