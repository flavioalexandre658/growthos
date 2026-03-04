import Link from "next/link";
import { redirect } from "next/navigation";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth-options";
import { IconArrowLeft, IconBolt } from "@tabler/icons-react";

export default async function DocsLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const session = await getServerSession(authOptions);
  if (!session?.user) redirect("/login");

  return (
    <div className="min-h-screen bg-zinc-950">
      <header className="sticky top-0 z-10 flex items-center justify-between border-b border-zinc-800/50 bg-zinc-950/95 px-6 py-3 backdrop-blur-md">
        <div className="flex items-center gap-2.5">
          <div className="flex h-6 w-6 items-center justify-center rounded-md bg-indigo-500/20 ring-1 ring-indigo-500/30">
            <IconBolt size={13} className="text-indigo-400" />
          </div>
          <div className="flex items-center gap-1.5">
            <span className="text-sm font-semibold text-zinc-100">GrowthOS</span>
            <span className="text-zinc-700 text-sm">/</span>
            <span className="text-sm text-zinc-500">Docs</span>
          </div>
        </div>

        <Link
          href="/organizations"
          className="flex items-center gap-1.5 rounded-md px-2.5 py-1.5 text-xs text-zinc-500 transition-all hover:bg-zinc-800/80 hover:text-zinc-300"
        >
          <IconArrowLeft size={12} />
          Voltar ao dashboard
        </Link>
      </header>

      <main>{children}</main>
    </div>
  );
}