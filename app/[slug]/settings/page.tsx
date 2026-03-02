import { SettingsContent } from "./_components/settings-content";

export const metadata = {
  title: "Configurações — GrowthOS",
};

export default function SettingsPage() {
  return (
    <div className="p-5 lg:p-6">
      <SettingsContent />
    </div>
  );
}
