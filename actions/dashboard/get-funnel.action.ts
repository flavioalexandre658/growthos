"use server";

import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth-options";
import { IFunnelData, DashboardPeriod } from "@/interfaces/dashboard.interface";

export async function getFunnel(period: DashboardPeriod = "30d"): Promise<IFunnelData | null> {
  const session = await getServerSession(authOptions);
  if (!session?.user?.access_token) return null;

  const res = await fetch(
    `${process.env.NEXT_PUBLIC_API_URL}//dashboard/funnel?period=${period}`,
    {
      headers: {
        Authorization: `${session.user.access_token}`,
        "Content-Type": "application/json",
      },
      cache: "no-store",
    }
  );

  if (!res.ok) return null;

  return res.json();
}
