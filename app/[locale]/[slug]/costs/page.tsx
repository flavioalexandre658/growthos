import { IDateFilter } from "@/interfaces/dashboard.interface";
import { CostsContent } from "./_components/costs-content";

export const metadata = {
  title: "Custos",
};

interface CostsPageProps {
  params: Promise<{ slug: string }>;
  searchParams: Promise<{
    period?: string;
    start_date?: string;
    end_date?: string;
  }>;
}

export default async function CostsPage({ params, searchParams }: CostsPageProps) {
  const { slug } = await params;
  const sp = await searchParams;
  const filter: IDateFilter =
    sp.start_date && sp.end_date
      ? { start_date: sp.start_date, end_date: sp.end_date }
      : { period: (sp.period as IDateFilter["period"]) || undefined };

  return (
    <div className="p-5 lg:p-6">
      <CostsContent filter={filter} slug={slug} />
    </div>
  );
}
