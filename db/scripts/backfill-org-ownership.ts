import { db } from "@/db";
import { organizations, orgMembers, users } from "@/db/schema";
import { eq, isNull, and, sql } from "drizzle-orm";

async function backfillOrgOwnership() {
  console.log("Backfilling org ownership...\n");

  const allOrgs = await db.select().from(organizations);
  const allUsers = await db.select({ id: users.id, email: users.email }).from(users).orderBy(users.createdAt);

  if (allUsers.length === 0) {
    console.log("No users found, skipping.");
    return;
  }

  const defaultUser = allUsers[allUsers.length - 1];
  console.log("All users found:");
  for (const u of allUsers) console.log(`  ${u.email} → ${u.id}`);
  console.log(`\nDefault owner (most recent): ${defaultUser.email} (${defaultUser.id})\n`);

  let updatedOrgs = 0;
  let addedMembers = 0;

  for (const org of allOrgs) {
    const existingOwner = await db
      .select({ id: orgMembers.id })
      .from(orgMembers)
      .where(and(eq(orgMembers.organizationId, org.id), eq(orgMembers.role, "owner")))
      .limit(1);

    if (existingOwner.length > 0) {
      continue;
    }

    const ownerId = org.createdByUserId ?? defaultUser.id;

    if (!org.createdByUserId) {
      await db
        .update(organizations)
        .set({ createdByUserId: ownerId })
        .where(eq(organizations.id, org.id));
      updatedOrgs++;
    }

    await db
      .insert(orgMembers)
      .values({
        organizationId: org.id,
        userId: ownerId,
        role: "owner",
        acceptedAt: new Date(),
      })
      .onConflictDoNothing();

    addedMembers++;
    console.log(`  Added owner for org: ${org.name} (${org.slug})`);
  }

  console.log(`\nDone. Updated ${updatedOrgs} orgs createdByUserId, added ${addedMembers} owners.`);

  const [countRow] = await db
    .select({ count: sql<number>`COUNT(*)` })
    .from(orgMembers)
    .where(eq(orgMembers.role, "owner"));

  console.log(`Total org owners in org_members: ${countRow?.count}`);
}

backfillOrgOwnership().catch(console.error);
