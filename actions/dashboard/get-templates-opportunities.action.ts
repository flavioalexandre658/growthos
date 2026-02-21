"use server";

import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth-options";
import { IOpportunityData, IOpportunityParams, IPaginatedResponse } from "@/interfaces/dashboard.interface";
import { buildQueryString, dateFilterParams } from "@/utils/build-query-string";

export async function getTemplatesOpportunities(
  params: IOpportunityParams = {}
): Promise<IPaginatedResponse<IOpportunityData>> {
  const session = await getServerSession(authOptions);
  if (!session?.user?.access_token) {
    return { data: [], pagination: { page: 1, limit: 20, total: 0, total_pages: 0 } };
  }

  const {
    period, start_date, end_date,
    page, limit, order_by, order_dir,
    category_id, name,
    ...metricFilters
  } = params;

  const qs = buildQueryString({
    ...dateFilterParams({ period, start_date, end_date }),
    page: page ?? 1,
    limit: limit ?? 20,
    order_by: order_by ?? "edits",
    order_dir: order_dir ?? "DESC",
    category_id,
    name,
    ...metricFilters,
  });

  const res = await fetch(
    `${process.env.NEXT_PUBLIC_API_URL}/dashboard/templates/opportunities${qs}`,
    {
      headers: {
        Authorization: session.user.access_token,
        "Content-Type": "application/json",
      },
      cache: "no-store",
    }
  );

  if (!res.ok) return { data: [], pagination: { page: 1, limit: 20, total: 0, total_pages: 0 } };

  return res.json();
}
