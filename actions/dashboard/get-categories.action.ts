"use server";

import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth-options";
import { ICategoryData, DashboardPeriod } from "@/interfaces/dashboard.interface";

export async function getCategories(period: DashboardPeriod = "30d"): Promise<ICategoryData[]> {
  const session = await getServerSession(authOptions);
  if (!session?.user?.access_token) return [];

  const res = await fetch(
    `${process.env.NEXT_PUBLIC_API_URL}//dashboard/categories?period=${period}`,
    {
      headers: {
        Authorization: `${session.user.access_token}`,
        "Content-Type": "application/json",
      },
      cache: "no-store",
    }
  );

  if (!res.ok) return [];

  return res.json();
}
