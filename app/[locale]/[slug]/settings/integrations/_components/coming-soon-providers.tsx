"use client";

import { IconClock } from "@tabler/icons-react";

interface Provider {
  name: string;
  description: string;
  logo: React.ReactNode;
}

const PROVIDERS: Provider[] = [
  {
    name: "Asaas",
    description: "Pagamentos e cobranças no Brasil",
    logo: (
      <span className="text-[15px] font-bold text-[#00BFA5] leading-none tracking-tight">A</span>
    ),
  },
  {
    name: "Kiwify",
    description: "Infoprodutos e cursos online",
    logo: (
      <span className="text-[15px] font-bold text-[#7C3AED] leading-none tracking-tight">K</span>
    ),
  },
  {
    name: "Hotmart",
    description: "Plataforma de produtos digitais",
    logo: (
      <span className="text-[15px] font-bold text-[#F04E23] leading-none tracking-tight">H</span>
    ),
  },
];

export function ComingSoonProviders() {
  return (
    <div className="space-y-2">
      <p className="text-[10px] text-zinc-600 uppercase tracking-widest font-semibold">
        Em breve
      </p>
      <div className="grid gap-3 sm:grid-cols-3">
        {PROVIDERS.map((provider) => (
          <div
            key={provider.name}
            className="flex items-center gap-3 rounded-xl border border-zinc-800/60 bg-zinc-900/30 px-4 py-3 opacity-60"
          >
            <div className="w-8 h-8 rounded-lg bg-zinc-800 border border-zinc-700 flex items-center justify-center shrink-0">
              {provider.logo}
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-xs font-medium text-zinc-300">{provider.name}</p>
              <p className="text-[11px] text-zinc-600 truncate">{provider.description}</p>
            </div>
            <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-medium bg-zinc-800 text-zinc-500 border border-zinc-700 shrink-0">
              <IconClock size={10} />
              Em breve
            </span>
          </div>
        ))}
      </div>
    </div>
  );
}
