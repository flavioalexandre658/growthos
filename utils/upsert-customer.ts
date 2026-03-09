import { db } from "@/db";
import { customers } from "@/db/schema";
import { sql } from "drizzle-orm";
import type { IUpsertCustomerInput } from "@/interfaces/customer.interface";

export async function upsertCustomer(input: IUpsertCustomerInput): Promise<void> {
  const now = input.eventTimestamp ?? new Date();

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
        lastSeenAt: now,
        updatedAt: now,
      },
    });
}
