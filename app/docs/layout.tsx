import Link from "next/link";
import { redirect } from "next/navigation";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth-options";
import { IconChartBar, IconArrowLeft } from "@tabler/icons-react";

export default async function DocsLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const session = await getServerSession(authOptions);
  if (!session?.user) redirect("/login");

  return (
    <div className="min-h-screen bg-zinc-950">
      <header className="sticky top-0 z-10 flex items-center justify-between border-b border-zinc-800/60 bg-zinc-950/90 px-6 py-3.5 backdrop-blur-sm">
        <div className="flex items-center gap-3">
          <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-indigo-600">
            <IconChartBar size={14} className="text-white" />
          </div>
          <span className="text-sm font-bold text-zinc-100">GrowthOS</span>
          <span className="text-zinc-700">/</span>
          <span className="text-sm text-zinc-500">Documentação</span>
        </div>

        <Link
          href="/organizations"
          className="flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-xs font-medium text-zinc-500 transition-colors hover:bg-zinc-800 hover:text-zinc-100"
        >
          <IconArrowLeft size={14} />
          Voltar ao dashboard
        </Link>
      </header>

      <main>{children}</main>
    </div>
  );
}
