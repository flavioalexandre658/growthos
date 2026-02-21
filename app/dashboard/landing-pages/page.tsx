import { DashboardPeriod } from "@/interfaces/dashboard.interface";
import { LandingPagesContent } from "./_components/landing-pages-content";

export const metadata = {
  title: "Landing Pages — GrowthOS",
};

interface LandingPagesPageProps {
  searchParams: Promise<{ period?: string }>;
}

export default async function LandingPagesPage({ searchParams }: LandingPagesPageProps) {
  const params = await searchParams;
  const period = (params.period as DashboardPeriod) || "30d";

  return (
    <div className="p-5 lg:p-6">
      <LandingPagesContent period={period} />
    </div>
  );
}
