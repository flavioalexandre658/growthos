import { IconBolt } from "@tabler/icons-react";
import { DocsBackButton } from "./_components/docs-back-button";

export default function DocsLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="min-h-screen bg-zinc-950">
      <header className="sticky top-0 z-10 flex items-center justify-between border-b border-zinc-800/50 bg-zinc-950/95 px-6 py-3 backdrop-blur-md">
        <div className="flex items-center gap-2.5">
          <div className="flex h-6 w-6 items-center justify-center rounded-md bg-indigo-500/20 ring-1 ring-indigo-500/30">
            <IconBolt size={13} className="text-indigo-400" />
          </div>
          <div className="flex items-center gap-1.5">
            <span className="text-sm font-semibold text-zinc-100">Groware</span>
            <span className="text-zinc-700 text-sm">/</span>
            <span className="text-sm text-zinc-500">Docs</span>
          </div>
        </div>

        <DocsBackButton />
      </header>

      <main>{children}</main>
    </div>
  );
}