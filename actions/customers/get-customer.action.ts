"use server";

import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth-options";
import { db } from "@/db";
import { customers } from "@/db/schema";
import { eq, and } from "drizzle-orm";
import type { ICustomer } from "@/interfaces/customer.interface";

export async function getCustomer(
  organizationId: string,
  customerId: string
): Promise<ICustomer | null> {
  const session = await getServerSession(authOptions);
  if (!session?.user) return null;

  const [row] = await db
    .select()
    .from(customers)
    .where(
      and(
        eq(customers.organizationId, organizationId),
        eq(customers.customerId, customerId)
      )
    )
    .limit(1);

  if (!row) return null;

  return row as ICustomer;
}
