"use server";

import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth-options";
import {
  IOpportunityData,
  IOpportunityParams,
  IPaginatedResponse,
} from "@/interfaces/dashboard.interface";
import { buildQueryString } from "@/utils/build-query-string";

export async function getTemplatesOpportunities(
  params: IOpportunityParams = {}
): Promise<IPaginatedResponse<IOpportunityData>> {
  const session = await getServerSession(authOptions);
  if (!session?.user?.access_token) {
    return { data: [], pagination: { page: 1, limit: 20, total: 0, total_pages: 0 } };
  }

  const qs = buildQueryString({
    period: params.period ?? "30d",
    page: params.page ?? 1,
    limit: params.limit ?? 20,
    order_by: params.order_by ?? "edits",
    order_dir: params.order_dir ?? "DESC",
    category_id: params.category_id,
    name: params.name,
  });

  const res = await fetch(
    `${process.env.NEXT_PUBLIC_API_URL}/dashboard/templates/opportunities${qs}`,
    {
      headers: {
        Authorization: `${session.user.access_token}`,
        "Content-Type": "application/json",
      },
      cache: "no-store",
    }
  );

  if (!res.ok) return { data: [], pagination: { page: 1, limit: 20, total: 0, total_pages: 0 } };

  return res.json();
}
