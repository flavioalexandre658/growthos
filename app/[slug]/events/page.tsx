import type { IDateFilter } from "@/interfaces/dashboard.interface";
import { EventsContent } from "./_components/events-content";

export const metadata = {
  title: "Eventos | Groware",
};

interface EventsPageProps {
  searchParams: Promise<{
    period?: string;
    start_date?: string;
    end_date?: string;
    event_types?: string;
  }>;
}

export default async function EventsPage({ searchParams }: EventsPageProps) {
  const params = await searchParams;
  const filter: IDateFilter =
    params.start_date && params.end_date
      ? { start_date: params.start_date, end_date: params.end_date }
      : { period: (params.period as IDateFilter["period"]) || "today" };

  const initialEventTypes = params.event_types
    ? params.event_types.split(",").map((t) => t.trim()).filter(Boolean)
    : [];

  return (
    <div className="p-5 lg:p-6">
      <EventsContent filter={filter} initialEventTypes={initialEventTypes} />
    </div>
  );
}
