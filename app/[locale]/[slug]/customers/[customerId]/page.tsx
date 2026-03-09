import { CustomerDetailContent } from "./_components/customer-detail-content";

interface CustomerDetailPageProps {
  params: Promise<{ customerId: string }>;
}

export default async function CustomerDetailPage({ params }: CustomerDetailPageProps) {
  const { customerId } = await params;

  return (
    <div className="p-5 lg:p-6">
      <CustomerDetailContent customerId={customerId} />
    </div>
  );
}
