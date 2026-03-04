"use client";

import { SettingsNav } from "./settings-nav";

interface SettingsLayoutShellProps {
  slug: string;
  children: React.ReactNode;
}

export function SettingsLayoutShell({
  slug,
  children,
}: SettingsLayoutShellProps) {
  return (
    <div className="p-5 lg:p-6 space-y-4">
      <div>
        <h1 className="text-lg font-bold text-zinc-100">Configurações</h1>
        <p className="text-xs text-zinc-500">
          Gerencie a organização, integrações e preferências
        </p>
      </div>

      <div className="flex gap-8 items-start">
        <SettingsNav slug={slug} />
        <div className="flex-1 min-w-0">{children}</div>
      </div>
    </div>
  );
}
