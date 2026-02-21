import { DashboardPeriod } from "@/interfaces/dashboard.interface";
import { ChannelsContent } from "./_components/channels-content";

export const metadata = {
  title: "Canais — GrowthOS",
};

interface ChannelsPageProps {
  searchParams: Promise<{ period?: string }>;
}

export default async function ChannelsPage({ searchParams }: ChannelsPageProps) {
  const params = await searchParams;
  const period = (params.period as DashboardPeriod) || "30d";

  return (
    <div className="p-5 lg:p-6">
      <ChannelsContent period={period} />
    </div>
  );
}
