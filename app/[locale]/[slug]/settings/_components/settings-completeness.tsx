"use client";

import { useRouter } from "next/navigation";
import { IconCheck, IconBrain } from "@tabler/icons-react";
import { Progress } from "@/components/ui/progress";
import { cn } from "@/lib/utils";
import type { IOrganization } from "@/interfaces/organization.interface";
import type { IAiProfile } from "@/interfaces/ai.interface";

interface CompletenessItem {
  id: string;
  label: string;
  done: boolean;
  sectionId: string;
}

interface SettingsCompletenessProps {
  organization: IOrganization;
  slug: string;
}

function buildItems(organization: IOrganization): CompletenessItem[] {
  const aiProfile = organization.aiProfile as IAiProfile | undefined;
  return [
    {
      id: "currency",
      label: "Moeda base configurada",
      done: !!organization.currency && organization.currency !== "",
      sectionId: "regional",
    },
    {
      id: "timezone",
      label: "Timezone definido",
      done: !!organization.timezone && organization.timezone !== "",
      sectionId: "regional",
    },
    {
      id: "funnel",
      label: "Funil configurado",
      done: organization.funnelSteps.length >= 1,
      sectionId: "funnel",
    },
    {
      id: "tax-regime",
      label: "Regime tributário informado",
      done: !!aiProfile?.taxRegime && aiProfile.taxRegime !== "",
      sectionId: "ai-profile",
    },
    {
      id: "monthly-goal",
      label: "Meta mensal definida",
      done: !!aiProfile?.monthlyGoal && aiProfile.monthlyGoal > 0,
      sectionId: "ai-profile",
    },
    {
      id: "segment",
      label: "Segmento do negócio informado",
      done: !!aiProfile?.segment && aiProfile.segment !== "",
      sectionId: "ai-profile",
    },
  ];
}

export function SettingsCompleteness({
  organization,
  slug,
}: SettingsCompletenessProps) {
  const router = useRouter();
  const items = buildItems(organization);
  const doneCount = items.filter((i) => i.done).length;
  const percentage = Math.round((doneCount / items.length) * 100);
  const allDone = doneCount === items.length;

  if (allDone) return null;

  return (
    <div className="rounded-xl border border-zinc-800 bg-zinc-900/50 p-5 space-y-4">
      <div className="flex items-start gap-3">
        <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-indigo-600/20 shrink-0">
          <IconBrain size={14} className="text-indigo-400" />
        </div>
        <div className="flex-1 min-w-0 space-y-2">
          <div className="flex items-center justify-between">
            <p className="text-sm font-bold text-zinc-100">
              Perfil da organização
            </p>
            <span className="text-xs font-semibold text-indigo-400 tabular-nums">
              {percentage}% completo
            </span>
          </div>
          <Progress value={percentage} className="h-1.5 bg-zinc-800" />
        </div>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-1.5">
        {items.map((item) => (
          <button
            key={item.id}
            onClick={() =>
              !item.done &&
              router.push(`/${slug}/settings/${item.sectionId}`)
            }
            className={cn(
              "flex items-center gap-2 rounded-lg px-3 py-2 text-left transition-colors",
              item.done
                ? "cursor-default"
                : "hover:bg-zinc-800/60 cursor-pointer",
            )}
          >
            <span
              className={cn(
                "flex h-4 w-4 shrink-0 items-center justify-center rounded-full border",
                item.done
                  ? "border-emerald-600 bg-emerald-600/20"
                  : "border-zinc-700 bg-zinc-800",
              )}
            >
              {item.done && (
                <IconCheck size={9} className="text-emerald-400" />
              )}
            </span>
            <span
              className={cn(
                "text-xs",
                item.done ? "text-zinc-500 line-through" : "text-zinc-400",
              )}
            >
              {item.label}
            </span>
          </button>
        ))}
      </div>

      <p className="text-[11px] text-zinc-600 leading-relaxed border-t border-zinc-800 pt-3">
        Complete o perfil para análises de IA mais precisas e personalizadas.
        Clique nos itens pendentes para ir à seção correspondente.
      </p>
    </div>
  );
}
