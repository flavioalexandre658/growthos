import { IDateFilter } from "@/interfaces/dashboard.interface";
import { FinanceContent } from "./_components/finance-content";

export const metadata = {
  title: "Financeiro | GrowthOS",
};

interface FinancePageProps {
  params: Promise<{ slug: string }>;
  searchParams: Promise<{
    period?: string;
    start_date?: string;
    end_date?: string;
  }>;
}

export default async function FinancePage({ params, searchParams }: FinancePageProps) {
  const { slug } = await params;
  const sp = await searchParams;
  const filter: IDateFilter =
    sp.start_date && sp.end_date
      ? { start_date: sp.start_date, end_date: sp.end_date }
      : { period: (sp.period as IDateFilter["period"]) || "today" };

  return (
    <div className="p-5 lg:p-6">
      <FinanceContent filter={filter} slug={slug} />
    </div>
  );
}
