"use client";

import { useState, useEffect } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { signOut } from "next-auth/react";
import dayjs from "dayjs";
import "dayjs/locale/pt-br";
import relativeTime from "dayjs/plugin/relativeTime";
import {
  IconPlus,
  IconBuilding,
  IconLogout,
  IconArrowRight,
  IconChevronRight,
  IconGitBranch,
  IconCalendar,
} from "@tabler/icons-react";
import { Button } from "@/components/ui/button";
import { GrowareLogo } from "@/components/groware-logo";
import type { IOrganization } from "@/interfaces/organization.interface";

dayjs.extend(relativeTime);
dayjs.locale("pt-br");

const STORAGE_KEY = "groware_active_org";

interface OrganizationsContentProps {
  initialOrgs: IOrganization[];
  userName: string | null | undefined;
}

function OrgCard({ org, onSelect }: { org: IOrganization; onSelect: () => void }) {
  const initials = org.name
    .split(" ")
    .map((w) => w[0])
    .slice(0, 2)
    .join("")
    .toUpperCase();

  return (
    <button
      onClick={onSelect}
      className="group relative flex flex-col items-start gap-4 rounded-xl border border-zinc-800 bg-zinc-900/50 p-5 text-left transition-all duration-200 hover:border-indigo-500/50 hover:bg-zinc-900 hover:scale-[1.02] hover:shadow-lg hover:shadow-indigo-500/5 focus:outline-none focus:ring-2 focus:ring-indigo-500/30"
    >
      <div className="flex w-full items-center justify-between">
        <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-indigo-600/20 text-sm font-bold text-indigo-400 ring-1 ring-indigo-600/30">
          {initials}
        </div>
        <IconChevronRight
          size={16}
          className="text-zinc-600 transition-all duration-200 group-hover:translate-x-0.5 group-hover:text-indigo-400"
        />
      </div>

      <div className="flex-1 min-w-0">
        <h3 className="truncate text-sm font-semibold text-zinc-100 group-hover:text-white">
          {org.name}
        </h3>
        <div className="mt-1 flex items-center gap-1.5">
          <span className="rounded-md bg-zinc-800 px-1.5 py-0.5 font-mono text-[10px] text-zinc-400">
            {org.slug}
          </span>
        </div>
      </div>

      <div className="flex w-full items-center gap-4 border-t border-zinc-800 pt-3 group-hover:border-zinc-700/80">
        <div className="flex items-center gap-1.5 text-xs text-zinc-500">
          <IconGitBranch size={12} />
          <span>{org.funnelSteps?.length ?? 0} etapas no funil</span>
        </div>
        <div className="flex items-center gap-1.5 text-xs text-zinc-500">
          <IconCalendar size={12} />
          <span>{dayjs(org.createdAt).fromNow()}</span>
        </div>
      </div>

      <div className="absolute inset-x-0 bottom-0 h-px rounded-b-xl bg-gradient-to-r from-transparent via-indigo-500/0 to-transparent transition-all duration-300 group-hover:via-indigo-500/30" />
    </button>
  );
}

function EmptyState({ onCreateClick }: { onCreateClick: () => void }) {
  return (
    <div className="flex flex-col items-center justify-center py-20 text-center">
      <div className="mb-6 flex h-16 w-16 items-center justify-center rounded-2xl bg-zinc-900 ring-1 ring-zinc-800">
        <IconBuilding size={28} className="text-zinc-500" />
      </div>
      <h3 className="mb-2 text-lg font-semibold text-zinc-100">
        Nenhuma organização ainda
      </h3>
      <p className="mb-8 max-w-sm text-sm text-zinc-500 leading-relaxed">
        Crie sua primeira organização para começar a coletar dados e acompanhar o crescimento do seu negócio.
      </p>
      <Button
        onClick={onCreateClick}
        className="gap-2 bg-indigo-600 hover:bg-indigo-500 text-white"
      >
        <IconPlus size={16} />
        Criar organização
      </Button>
    </div>
  );
}

export function OrganizationsContent({
  initialOrgs,
  userName,
}: OrganizationsContentProps) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [orgs] = useState<IOrganization[]>(initialOrgs);

  useEffect(() => {
    if (searchParams.get("new") === "1") {
      router.push("/onboarding?new-org=1");
    }
  }, [searchParams, router]);

  const handleSelect = (slug: string) => {
    localStorage.setItem(STORAGE_KEY, slug);
    router.push(`/${slug}`);
  };

  const handleCreateNew = () => {
    router.push("/onboarding?new-org=1");
  };

  return (
    <div className="flex min-h-screen flex-col">
      <header className="sticky top-0 z-10 flex items-center justify-between border-b border-zinc-800/60 bg-zinc-950/80 px-6 py-4 backdrop-blur-sm">
        <GrowareLogo size="sm" />

        <div className="flex items-center gap-3">
          {userName && (
            <span className="hidden text-xs text-zinc-500 sm:block">
              {userName}
            </span>
          )}
          <button
            onClick={() => signOut({ callbackUrl: "/login" })}
            className="flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-xs font-medium text-zinc-500 transition-colors hover:bg-zinc-800 hover:text-zinc-100"
          >
            <IconLogout size={14} />
            Sair
          </button>
        </div>
      </header>

      <div className="mx-auto w-full max-w-4xl flex-1 px-6 py-10">
        <div className="mb-8 flex items-end justify-between">
          <div>
            <p className="mb-1 text-xs font-semibold uppercase tracking-widest text-indigo-500">
              Groware
            </p>
            <h1 className="text-2xl font-bold text-zinc-100">
              Suas organizações
            </h1>
            <p className="mt-1.5 text-sm text-zinc-500">
              Selecione uma organização para acessar o dashboard
            </p>
          </div>

          {orgs.length > 0 && (
            <Button
              onClick={handleCreateNew}
              variant="outline"
              size="sm"
              className="gap-2 border-zinc-700 bg-zinc-900 text-zinc-300 hover:border-indigo-500/50 hover:bg-zinc-800 hover:text-zinc-100"
            >
              <IconPlus size={14} />
              Nova organização
            </Button>
          )}
        </div>

        {orgs.length === 0 ? (
          <EmptyState onCreateClick={handleCreateNew} />
        ) : (
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {orgs.map((org) => (
              <OrgCard
                key={org.id}
                org={org}
                onSelect={() => handleSelect(org.slug)}
              />
            ))}

            <button
              onClick={handleCreateNew}
              className="flex min-h-[160px] flex-col items-center justify-center gap-3 rounded-xl border border-dashed border-zinc-700 bg-transparent p-5 text-center transition-all duration-200 hover:border-indigo-500/50 hover:bg-zinc-900/30 focus:outline-none focus:ring-2 focus:ring-indigo-500/30"
            >
              <div className="flex h-10 w-10 items-center justify-center rounded-lg border border-dashed border-zinc-700 text-zinc-600">
                <IconPlus size={18} />
              </div>
              <div>
                <p className="text-sm font-medium text-zinc-500">
                  Nova organização
                </p>
                <p className="mt-0.5 text-xs text-zinc-600">
                  Adicionar workspace
                </p>
              </div>
            </button>
          </div>
        )}

        {orgs.length > 0 && (
          <div className="mt-10 flex items-center justify-center gap-2 text-xs text-zinc-600">
            <IconArrowRight size={12} />
            <span>Clique em uma organização para acessar o dashboard</span>
          </div>
        )}
      </div>
    </div>
  );
}
