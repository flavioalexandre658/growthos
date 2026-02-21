"use server";

import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth-options";
import { ILandingPageData, ILandingPageParams, IPaginatedResponse } from "@/interfaces/dashboard.interface";
import { buildQueryString, dateFilterParams } from "@/utils/build-query-string";

export async function getLandingPages(
  params: ILandingPageParams = {}
): Promise<IPaginatedResponse<ILandingPageData>> {
  const session = await getServerSession(authOptions);
  if (!session?.user?.access_token) {
    return { data: [], pagination: { page: 1, limit: 30, total: 0, total_pages: 0 } };
  }

  const qs = buildQueryString({
    ...dateFilterParams(params),
    page: params.page ?? 1,
    limit: params.limit ?? 30,
    order_by: params.order_by ?? "revenue",
    order_dir: params.order_dir ?? "DESC",
    search: params.search,
  });

  const res = await fetch(
    `${process.env.NEXT_PUBLIC_API_URL}/dashboard/landing-pages${qs}`,
    {
      headers: {
        Authorization: session.user.access_token,
        "Content-Type": "application/json",
      },
      cache: "no-store",
    }
  );

  if (!res.ok) return { data: [], pagination: { page: 1, limit: 30, total: 0, total_pages: 0 } };

  return res.json();
}
