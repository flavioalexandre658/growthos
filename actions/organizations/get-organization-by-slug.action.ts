"use server";

import { eq } from "drizzle-orm";
import { db } from "@/db";
import { organizations } from "@/db/schema";
import type { IOrganization } from "@/interfaces/organization.interface";

export async function getOrganizationBySlug(
  slug: string
): Promise<IOrganization | null> {
  const [org] = await db
    .select()
    .from(organizations)
    .where(eq(organizations.slug, slug))
    .limit(1);

  return (org as IOrganization) ?? null;
}
