"use server";

import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth-options";
import { eq } from "drizzle-orm";
import { db } from "@/db";
import { events, subscriptions } from "@/db/schema";

export async function checkOrgHasData(organizationId: string): Promise<boolean> {
  const session = await getServerSession(authOptions);
  if (!session?.user) return false;

  const [eventRow, subscriptionRow] = await Promise.all([
    db
      .select({ id: events.id })
      .from(events)
      .where(eq(events.organizationId, organizationId))
      .limit(1),
    db
      .select({ id: subscriptions.id })
      .from(subscriptions)
      .where(eq(subscriptions.organizationId, organizationId))
      .limit(1),
  ]);

  return eventRow.length > 0 || subscriptionRow.length > 0;
}
