import { Sidebar } from "./_components/sidebar";

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="flex min-h-screen bg-zinc-950">
      <Sidebar />
      <main className="flex-1 min-w-0 md:overflow-auto">
        <div className="pt-14 md:pt-0">{children}</div>
      </main>
    </div>
  );
}
