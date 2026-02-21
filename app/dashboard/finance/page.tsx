import { DashboardPeriod } from "@/interfaces/dashboard.interface";
import { FinanceContent } from "./_components/finance-content";

export const metadata = {
  title: "Financeiro — GrowthOS",
};

interface FinancePageProps {
  searchParams: Promise<{ period?: string }>;
}

export default async function FinancePage({ searchParams }: FinancePageProps) {
  const params = await searchParams;
  const period = (params.period as DashboardPeriod) || "30d";

  return (
    <div className="p-5 lg:p-6">
      <FinanceContent period={period} />
    </div>
  );
}
