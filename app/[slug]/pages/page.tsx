import { IDateFilter } from "@/interfaces/dashboard.interface";
import { PagesContent } from "./_components/pages-content";

export const metadata = {
  title: "Páginas | GrowthOS",
};

interface PagesPageProps {
  searchParams: Promise<{
    period?: string;
    start_date?: string;
    end_date?: string;
  }>;
}

export default async function PagesPage({
  searchParams,
}: PagesPageProps) {
  const params = await searchParams;
  const filter: IDateFilter =
    params.start_date && params.end_date
      ? { start_date: params.start_date, end_date: params.end_date }
      : { period: (params.period as IDateFilter["period"]) || "30d" };

  return (
    <div className="p-5 lg:p-6">
      <PagesContent filter={filter} />
    </div>
  );
}
