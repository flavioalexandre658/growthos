import { DashboardPeriod } from "@/interfaces/dashboard.interface";
import { TemplatesContent } from "./_components/templates-content";

export const metadata = {
  title: "Templates — GrowthOS",
};

interface TemplatesPageProps {
  searchParams: Promise<{ period?: string }>;
}

export default async function TemplatesPage({ searchParams }: TemplatesPageProps) {
  const params = await searchParams;
  const period = (params.period as DashboardPeriod) || "30d";

  return (
    <div className="p-5 lg:p-6">
      <TemplatesContent period={period} />
    </div>
  );
}
