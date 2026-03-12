"use server";

import { getServerSession } from "next-auth";
import { eq } from "drizzle-orm";
import { db } from "@/db";
import { organizations, orgMembers } from "@/db/schema";
import { authOptions } from "@/lib/auth-options";
import type { IOrganization } from "@/interfaces/organization.interface";
import { isPlatformAdmin } from "@/utils/is-platform-admin";

export async function getOrganizations(): Promise<IOrganization[]> {
  const session = await getServerSession(authOptions);
  if (!session?.user) return [];

  if (isPlatformAdmin(session.user.email)) {
    const allOrgs = await db.select().from(organizations).orderBy(organizations.name);
    return allOrgs as IOrganization[];
  }

  const rows = await db
    .select({ org: organizations })
    .from(organizations)
    .innerJoin(orgMembers, eq(orgMembers.organizationId, organizations.id))
    .where(eq(orgMembers.userId, session.user.id))
    .orderBy(organizations.name);

  return rows.map((r) => r.org) as IOrganization[];
}
