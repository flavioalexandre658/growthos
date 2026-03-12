import { db } from "@/db";
import { customers } from "@/db/schema";
import { sql } from "drizzle-orm";
import type { IUpsertCustomerInput } from "@/interfaces/customer.interface";

export async function upsertCustomer(input: IUpsertCustomerInput): Promise<void> {
  const rawNow = input.eventTimestamp ?? new Date();
  const now = rawNow instanceof Date && !isNaN(rawNow.getTime()) ? rawNow : new Date();

  await db
    .insert(customers)
    .values({
      organizationId: input.organizationId,
      customerId: input.customerId,
      name: input.name ?? null,
      email: input.email ?? null,
      phone: input.phone ?? null,
      country: input.country ?? null,
      region: input.region ?? null,
      city: input.city ?? null,
      avatarUrl: input.avatarUrl ?? null,
      metadata: input.metadata ?? null,
      firstSource: input.firstSource ?? null,
      firstMedium: input.firstMedium ?? null,
      firstCampaign: input.firstCampaign ?? null,
      firstContent: input.firstContent ?? null,
      firstLandingPage: input.firstLandingPage ?? null,
      firstReferrer: input.firstReferrer ?? null,
      firstDevice: input.firstDevice ?? null,
      firstSeenAt: now,
      lastSeenAt: now,
    })
    .onConflictDoUpdate({
      target: [customers.organizationId, customers.customerId],
      set: {
        name: sql`COALESCE(${input.name ?? null}, ${customers.name})`,
        email: sql`COALESCE(${input.email ?? null}, ${customers.email})`,
        phone: sql`COALESCE(${input.phone ?? null}, ${customers.phone})`,
        country: sql`COALESCE(${input.country ?? null}, ${customers.country})`,
        region: sql`COALESCE(${input.region ?? null}, ${customers.region})`,
        city: sql`COALESCE(${input.city ?? null}, ${customers.city})`,
        avatarUrl: sql`COALESCE(${input.avatarUrl ?? null}, ${customers.avatarUrl})`,
        metadata: input.metadata
          ? sql`${customers.metadata}::jsonb || ${JSON.stringify(input.metadata)}::jsonb`
          : customers.metadata,
        firstSource: sql`COALESCE(${customers.firstSource}, ${input.firstSource ?? null})`,
        firstMedium: sql`COALESCE(${customers.firstMedium}, ${input.firstMedium ?? null})`,
        firstCampaign: sql`COALESCE(${customers.firstCampaign}, ${input.firstCampaign ?? null})`,
        firstContent: sql`COALESCE(${customers.firstContent}, ${input.firstContent ?? null})`,
        firstLandingPage: sql`COALESCE(${customers.firstLandingPage}, ${input.firstLandingPage ?? null})`,
        firstReferrer: sql`COALESCE(${customers.firstReferrer}, ${input.firstReferrer ?? null})`,
        firstDevice: sql`COALESCE(${customers.firstDevice}, ${input.firstDevice ?? null})`,
        lastSeenAt: now,
        updatedAt: now,
      },
    });
}
