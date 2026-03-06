"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { GrowareLogo } from "@/components/groware-logo";

export function LandingNav() {
  const [scrolled, setScrolled] = useState(false);

  useEffect(() => {
    const handleScroll = () => setScrolled(window.scrollY > 10);
    window.addEventListener("scroll", handleScroll);
    return () => window.removeEventListener("scroll", handleScroll);
  }, []);

  return (
    <nav
      className={`fixed top-0 left-0 right-0 z-50 flex items-center justify-between px-6 md:px-12 h-16 bg-zinc-950/70 backdrop-blur-xl transition-all duration-300 ${
        scrolled ? "border-b border-white/[0.07]" : "border-b border-transparent"
      }`}
    >
      <Link href="/" className="flex items-center">
        <GrowareLogo size="sm" />
      </Link>

      <div className="hidden md:flex items-center gap-1">
        {[
          { label: "Funcionalidades", href: "#funcionalidades" },
          { label: "Integrações", href: "#integracoes" },
          { label: "Análise com IA", href: "#ia" },
          { label: "Docs", href: "/docs" },
        ].map(({ label, href }) => (
          <Link
            key={href}
            href={href}
            className="px-3.5 py-1.5 rounded-lg text-zinc-500 text-sm font-medium hover:text-zinc-200 hover:bg-white/[0.04] transition-all"
          >
            {label}
          </Link>
        ))}
      </div>

      <div className="flex items-center gap-2.5">
        <Link
          href="/login"
          className="hidden md:flex px-4 py-2 rounded-lg border border-white/[0.07] text-zinc-400 text-sm font-medium hover:border-white/[0.15] hover:text-zinc-200 transition-all"
        >
          Entrar
        </Link>
        <Link
          href="#acesso-antecipado"
          className="px-4 py-2 rounded-lg bg-indigo-600 text-white text-sm font-semibold hover:bg-indigo-500 transition-all shadow-[0_0_24px_rgba(79,70,229,0.35)]"
        >
          Acesso antecipado
        </Link>
      </div>
    </nav>
  );
}
