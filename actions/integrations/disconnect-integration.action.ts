"use server";

import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth-options";
import { db } from "@/db";
import { integrations } from "@/db/schema";
import { eq, and } from "drizzle-orm";

export async function disconnectIntegration(
  organizationId: string,
  integrationId: string,
): Promise<void> {
  const session = await getServerSession(authOptions);
  if (!session) throw new Error("Unauthorized");

  await db
    .update(integrations)
    .set({
      status: "disconnected",
      accessToken: "",
      providerMeta: null,
      updatedAt: new Date(),
    })
    .where(
      and(
        eq(integrations.id, integrationId),
        eq(integrations.organizationId, organizationId),
      ),
    );
}
