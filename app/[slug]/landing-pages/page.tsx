import { IDateFilter } from "@/interfaces/dashboard.interface";
import { LandingPagesContent } from "./_components/landing-pages-content";

export const metadata = {
  title: "Landing Pages — GrowthOS",
};

interface LandingPagesPageProps {
  searchParams: Promise<{ period?: string; start_date?: string; end_date?: string }>;
}

export default async function LandingPagesPage({ searchParams }: LandingPagesPageProps) {
  const params = await searchParams;
  const filter: IDateFilter =
    params.start_date && params.end_date
      ? { start_date: params.start_date, end_date: params.end_date }
      : { period: (params.period as IDateFilter["period"]) || "30d" };

  return (
    <div className="p-5 lg:p-6">
      <LandingPagesContent filter={filter} />
    </div>
  );
}
