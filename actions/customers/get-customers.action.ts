"use server";

import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth-options";
import { db } from "@/db";
import { customers } from "@/db/schema";
import { eq, and, desc, asc, count, or, ilike } from "drizzle-orm";
import type { ICustomer, ICustomerListParams, ICustomerListResult } from "@/interfaces/customer.interface";

export async function getCustomers(
  organizationId: string,
  params: ICustomerListParams = {}
): Promise<ICustomerListResult> {
  const session = await getServerSession(authOptions);
  if (!session?.user) {
    return { data: [], pagination: { page: 1, limit: 20, total: 0, total_pages: 0 } };
  }

  const page = params.page ?? 1;
  const limit = params.limit ?? 20;
  const offset = (page - 1) * limit;

  const conditions = [eq(customers.organizationId, organizationId)];

  if (params.country) {
    conditions.push(eq(customers.country, params.country));
  }

  if (params.search) {
    const term = `%${params.search}%`;
    conditions.push(
      or(
        ilike(customers.name, term),
        ilike(customers.email, term),
        ilike(customers.customerId, term),
      )!,
    );
  }

  const baseWhere = and(...conditions);

  const orderCol = (() => {
    switch (params.sortBy) {
      case "firstSeenAt": return customers.firstSeenAt;
      case "name": return customers.name;
      case "email": return customers.email;
      default: return customers.lastSeenAt;
    }
  })();

  const orderDir = params.sortDir === "asc" ? asc(orderCol) : desc(orderCol);

  const [totalResult, rows] = await Promise.all([
    db.select({ total: count() }).from(customers).where(baseWhere),
    db
      .select()
      .from(customers)
      .where(baseWhere)
      .orderBy(orderDir)
      .limit(limit)
      .offset(offset),
  ]);

  const total = totalResult[0]?.total ?? 0;

  return {
    data: rows as ICustomer[],
    pagination: {
      page,
      limit,
      total,
      total_pages: Math.ceil(total / limit),
    },
  };
}
