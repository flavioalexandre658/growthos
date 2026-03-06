import { DocsBackButton } from "./_components/docs-back-button";
import { GrowareLogo } from "@/components/groware-logo";

export default function DocsLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="min-h-screen bg-zinc-950">
      <header className="sticky top-0 z-10 flex items-center justify-between border-b border-zinc-800/50 bg-zinc-950/95 px-6 py-3 backdrop-blur-md">
        <div className="flex items-center gap-2.5">
          <GrowareLogo size="sm" />
          <span className="text-zinc-700 text-sm">/</span>
          <span className="text-sm text-zinc-500">Docs</span>
        </div>

        <DocsBackButton />
      </header>

      <main>{children}</main>
    </div>
  );
}