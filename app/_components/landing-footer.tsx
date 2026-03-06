import Link from "next/link";
import { GrowareLogo } from "@/components/groware-logo";

export function LandingFooter() {
  const links = [
    { label: "Docs", href: "/docs" },
    { label: "Changelog", href: "/changelog" },
    { label: "Privacidade", href: "/privacy" },
    { label: "Termos", href: "/terms" },
  ];

  return (
    <footer className="border-t border-white/[0.04] px-6 md:px-20 py-12">
      <div className="grid grid-cols-1 md:grid-cols-2 gap-8 items-center">
        <div className="flex flex-col gap-2">
          <GrowareLogo size="sm" />
          <p className="text-xs text-zinc-600">© 2026 Groware. Todos os direitos reservados.</p>
          <p className="text-xs text-zinc-700 font-mono">v0.1.0-beta · groware.io</p>
        </div>
        <div className="flex gap-6 md:justify-end flex-wrap">
          {links.map(({ label, href }) => (
            <Link
              key={href}
              href={href}
              className="text-sm text-zinc-600 hover:text-zinc-400 transition-colors"
            >
              {label}
            </Link>
          ))}
        </div>
      </div>
    </footer>
  );
}
