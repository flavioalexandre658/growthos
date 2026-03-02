"use client";

import { useState } from "react";
import { useSession } from "next-auth/react";
import toast from "react-hot-toast";
import {
  IconLayoutDashboard,
  IconBrandGoogle,
  IconCurrencyDollar,
  IconWorldWww,
  IconCalculator,
  IconLoader2,
  IconArrowRight,
  IconSparkles,
} from "@tabler/icons-react";
import { Button } from "@/components/ui/button";
import { completeOnboarding } from "@/actions/auth/complete-onboarding.action";
import { cn } from "@/lib/utils";

const SECTIONS = [
  {
    icon: IconLayoutDashboard,
    title: "Visão Geral",
    description: "Funil de conversão, KPIs e evolução diária de receita",
    color: "text-indigo-400",
    bg: "bg-indigo-600/10 border-indigo-600/20",
  },
  {
    icon: IconBrandGoogle,
    title: "Canais",
    description: "De onde vem sua receita — Google, Instagram, direto e mais",
    color: "text-violet-400",
    bg: "bg-violet-600/10 border-violet-600/20",
  },
  {
    icon: IconCurrencyDollar,
    title: "Financeiro",
    description: "Receita bruta, líquida, taxas de gateway e ticket médio",
    color: "text-emerald-400",
    bg: "bg-emerald-600/10 border-emerald-600/20",
  },
  {
    icon: IconWorldWww,
    title: "Landing Pages",
    description: "Performance por página — pageviews, cadastros e conversão",
    color: "text-amber-400",
    bg: "bg-amber-600/10 border-amber-600/20",
  },
  {
    icon: IconCalculator,
    title: "Custos & P&L",
    description: "Lucro real após custos fixos e variáveis + análise com IA",
    color: "text-rose-400",
    bg: "bg-rose-600/10 border-rose-600/20",
  },
];

interface StepTourProps {
  onComplete: () => void;
}

export function StepTour({ onComplete }: StepTourProps) {
  const [isLoading, setIsLoading] = useState(false);
  const { update } = useSession();

  const handleFinish = async () => {
    setIsLoading(true);
    try {
      await completeOnboarding();
      await update({ onboardingCompleted: true });
      toast.success("Tudo pronto! Bem-vindo ao GrowthOS.");
      window.location.href = "/dashboard";
    } catch {
      toast.error("Erro ao finalizar onboarding.");
      setIsLoading(false);
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-2">
        <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-indigo-600/20 border border-indigo-600/30">
          <IconSparkles size={18} className="text-indigo-400" />
        </div>
        <div>
          <h2 className="text-lg font-bold text-zinc-100">Tudo pronto!</h2>
          <p className="text-xs text-zinc-500">
            Conheça o que você tem disponível no dashboard
          </p>
        </div>
      </div>

      <div className="grid grid-cols-1 gap-2.5">
        {SECTIONS.map((section) => {
          const Icon = section.icon;
          return (
            <div
              key={section.title}
              className={cn(
                "flex items-start gap-3 rounded-xl border p-3.5",
                section.bg
              )}
            >
              <div
                className={cn(
                  "flex h-8 w-8 items-center justify-center rounded-lg bg-zinc-900/60 shrink-0 mt-0.5",
                  section.bg
                )}
              >
                <Icon size={15} className={section.color} />
              </div>
              <div className="min-w-0">
                <p className={cn("text-sm font-bold", section.color)}>
                  {section.title}
                </p>
                <p className="text-xs text-zinc-500 leading-relaxed mt-0.5">
                  {section.description}
                </p>
              </div>
            </div>
          );
        })}
      </div>

      <div className="rounded-xl border border-indigo-800/30 bg-indigo-950/20 p-4 flex items-start gap-3">
        <IconSparkles size={16} className="text-indigo-400 mt-0.5 shrink-0" />
        <div>
          <p className="text-xs font-bold text-indigo-300">IA Comparativa</p>
          <p className="text-xs text-zinc-500 leading-relaxed mt-0.5">
            Compare qualquer período com IA: "Compare Canais esta semana vs semana passada"
            e receba um relatório detalhado de oportunidades.
          </p>
        </div>
      </div>

      <Button
        onClick={handleFinish}
        disabled={isLoading}
        className="w-full h-12 bg-indigo-600 hover:bg-indigo-500 text-white font-bold gap-2 group text-sm"
      >
        {isLoading ? (
          <>
            <IconLoader2 size={16} className="animate-spin" />
            Entrando no dashboard...
          </>
        ) : (
          <>
            Ir para o Dashboard
            <IconArrowRight
              size={16}
              className="transition-transform group-hover:translate-x-0.5"
            />
          </>
        )}
      </Button>
    </div>
  );
}
