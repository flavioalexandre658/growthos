import type { IDateFilter } from "@/interfaces/dashboard.interface";
import { TrackerContent } from "./_components/tracker-content";

export const metadata = {
  title: "Tracker",
};

interface TrackerPageProps {
  searchParams: Promise<{
    period?: string;
    start_date?: string;
    end_date?: string;
  }>;
}

export default async function TrackerPage({ searchParams }: TrackerPageProps) {
  const params = await searchParams;
  const filter: IDateFilter =
    params.start_date && params.end_date
      ? { start_date: params.start_date, end_date: params.end_date }
      : { period: (params.period as IDateFilter["period"]) || "today" };

  return (
    <div className="p-5 lg:p-6">
      <TrackerContent filter={filter} />
    </div>
  );
}
