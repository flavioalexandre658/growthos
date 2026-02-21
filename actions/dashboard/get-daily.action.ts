"use server";

import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth-options";
import { IDailyData, IDateFilter } from "@/interfaces/dashboard.interface";
import { buildQueryString, dateFilterParams } from "@/utils/build-query-string";

export async function getDaily(filter: IDateFilter = {}): Promise<IDailyData[]> {
  const session = await getServerSession(authOptions);
  if (!session?.user?.access_token) return [];

  const qs = buildQueryString(dateFilterParams(filter));

  const res = await fetch(
    `${process.env.NEXT_PUBLIC_API_URL}/dashboard/daily${qs}`,
    {
      headers: {
        Authorization: session.user.access_token,
        "Content-Type": "application/json",
      },
      cache: "no-store",
    }
  );

  if (!res.ok) return [];

  return res.json();
}
