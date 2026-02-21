import { IDateFilter } from "@/interfaces/dashboard.interface";
import { TemplatesContent } from "./_components/templates-content";

export const metadata = {
  title: "Templates — GrowthOS",
};

interface TemplatesPageProps {
  searchParams: Promise<{ period?: string; start_date?: string; end_date?: string }>;
}

export default async function TemplatesPage({ searchParams }: TemplatesPageProps) {
  const params = await searchParams;
  const filter: IDateFilter =
    params.start_date && params.end_date
      ? { start_date: params.start_date, end_date: params.end_date }
      : { period: (params.period as IDateFilter["period"]) || "30d" };

  return (
    <div className="p-5 lg:p-6">
      <TemplatesContent filter={filter} />
    </div>
  );
}
