import { CostsContent } from "./_components/costs-content";

export const metadata = {
  title: "Custos",
};

export default function CostsPage() {
  return (
    <div className="p-5 lg:p-6">
      <CostsContent />
    </div>
  );
}
