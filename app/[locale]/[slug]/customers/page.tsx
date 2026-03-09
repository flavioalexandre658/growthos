import { CustomersContent } from "./_components/customers-content";

export const metadata = {
  title: "Clientes",
};

export default function CustomersPage() {
  return (
    <div className="p-5 lg:p-6">
      <CustomersContent />
    </div>
  );
}
