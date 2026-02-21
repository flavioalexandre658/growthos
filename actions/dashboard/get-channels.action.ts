"use server";

import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth-options";
import { IChannelData, DashboardPeriod } from "@/interfaces/dashboard.interface";

export async function getChannels(period: DashboardPeriod = "30d"): Promise<IChannelData[]> {
  const session = await getServerSession(authOptions);

  if (!session?.user?.access_token) return [];

  const url = `${process.env.NEXT_PUBLIC_API_URL}//dashboard/channels?period=${period}`;

  const res = await fetch(url, {
    headers: {
      Authorization: `${session.user.access_token}`,
      "Content-Type": "application/json",
    },
    cache: "no-store",
  });

  if (!res.ok) {
    const body = await res.text();
    console.error("[getChannels] error body:", body);
    return [];
  }

  const data = await res.json();
  console.log("[getChannels] records:", Array.isArray(data) ? data.length : data);

  return data;
}
