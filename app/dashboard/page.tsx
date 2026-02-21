import { DashboardPeriod } from "@/interfaces/dashboard.interface";
import { OverviewContent } from "./_components/overview-content";

export const metadata = {
  title: "Visão Geral — GrowthOS",
};

interface DashboardPageProps {
  searchParams: Promise<{ period?: string }>;
}

export default async function DashboardPage({ searchParams }: DashboardPageProps) {
  const params = await searchParams;
  const period = (params.period as DashboardPeriod) || "30d";

  return (
    <div className="p-5 lg:p-6">
      <OverviewContent period={period} />
    </div>
  );
}
