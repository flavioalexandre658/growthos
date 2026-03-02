"use server";

import { db } from "@/db";
import { organizations } from "@/db/schema";
import type { IOrganization } from "@/interfaces/organization.interface";

export async function getOrganizations(): Promise<IOrganization[]> {
  const rows = await db.select().from(organizations).orderBy(organizations.name);
  return rows as IOrganization[];
}
