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
  IconRocket,
  IconCheck,
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
    iconBg: "bg-indigo-500/15 border-indigo-500/25",
    cardBg: "hover:border-indigo-500/40",
  },
  {
    icon: IconBrandGoogle,
    title: "Canais",
    description: "De onde vem sua receita — Google, Instagram, direto e mais",
    color: "text-violet-400",
    iconBg: "bg-violet-500/15 border-violet-500/25",
    cardBg: "hover:border-violet-500/40",
  },
  {
    icon: IconCurrencyDollar,
    title: "Financeiro",
    description: "Receita bruta, líquida, taxas de gateway e ticket médio",
    color: "text-emerald-400",
    iconBg: "bg-emerald-500/15 border-emerald-500/25",
    cardBg: "hover:border-emerald-500/40",
  },
  {
    icon: IconWorldWww,
    title: "Landing Pages",
    description: "Performance por página — pageviews, cadastros e conversão",
    color: "text-amber-400",
    iconBg: "bg-amber-500/15 border-amber-500/25",
    cardBg: "hover:border-amber-500/40",
  },
  {
    icon: IconCalculator,
    title: "Custos & P&L",
    description: "Lucro real após custos fixos e variáveis, com análise via IA",
    color: "text-rose-400",
    iconBg: "bg-rose-500/15 border-rose-500/25",
    cardBg: "hover:border-rose-500/40",
  },
];

interface StepTourProps {
  slug: string;
  onComplete: () => void;
}

// eslint-disable-next-line @typescript-eslint/no-unused-vars
export function StepTour({ slug, onComplete: _ }: StepTourProps) {
  const [isLoading, setIsLoading] = useState(false);
  const { update } = useSession();

  const handleFinish = async () => {
    setIsLoading(true);
    try {
      await completeOnboarding();
      await update({ onboardingCompleted: true });
      toast.success("Tudo pronto! Bem-vindo ao GrowthOS.");
      window.location.href = slug ? `/${slug}` : "/organizations";
    } catch {
      toast.error("Erro ao finalizar onboarding.");
      setIsLoading(false);
    }
  };

  return (
    <div className="space-y-6">
      <div className="text-center space-y-4 pb-2">
        <div className="flex justify-center">
          <div className="relative">
            <div className="absolute inset-0 rounded-full bg-indigo-500/20 animate-ping" />
            <div className="relative flex h-16 w-16 items-center justify-center rounded-full bg-gradient-to-br from-indigo-500 to-violet-600 shadow-lg shadow-indigo-500/30">
              <IconCheck size={30} className="text-white" strokeWidth={2.5} />
            </div>
          </div>
        </div>

        <div className="space-y-1.5">
          <h2 className="text-2xl font-bold bg-gradient-to-r from-indigo-400 to-violet-400 bg-clip-text text-transparent">
            Tudo configurado!
          </h2>
          <p className="text-sm text-zinc-500 max-w-xs mx-auto leading-relaxed">
            Sua organização está pronta. Explore o dashboard e comece a tomar
            decisões baseadas em dados.
          </p>
        </div>
      </div>

      <div className="grid grid-cols-2 gap-2.5">
        {SECTIONS.map((section) => {
          const Icon = section.icon;
          return (
            <div
              key={section.title}
              className={cn(
                "group flex flex-col gap-3 rounded-xl border border-zinc-800/60 bg-zinc-900/40 p-4",
                "transition-all duration-200 hover:scale-[1.02] hover:bg-zinc-900/60 cursor-default",
                section.cardBg
              )}
            >
              <div
                className={cn(
                  "flex h-9 w-9 items-center justify-center rounded-lg border",
                  section.iconBg
                )}
              >
                <Icon size={17} className={section.color} />
              </div>
              <div className="space-y-1">
                <p className={cn("text-sm font-bold leading-none", section.color)}>
                  {section.title}
                </p>
                <p className="text-xs text-zinc-600 leading-relaxed">
                  {section.description}
                </p>
              </div>
            </div>
          );
        })}

        <div className="flex flex-col gap-3 rounded-xl border border-zinc-800/60 bg-gradient-to-br from-indigo-950/40 to-violet-950/30 p-4 transition-all duration-200 hover:scale-[1.02] hover:border-indigo-500/40 cursor-default">
          <div className="flex h-9 w-9 items-center justify-center rounded-lg border bg-indigo-500/15 border-indigo-500/25">
            <IconRocket size={17} className="text-indigo-400" />
          </div>
          <div className="space-y-1">
            <p className="text-sm font-bold text-indigo-400 leading-none">IA Comparativa</p>
            <p className="text-xs text-zinc-600 leading-relaxed">
              Compare períodos e receba relatórios automáticos de otimização
            </p>
          </div>
        </div>
      </div>

      <Button
        onClick={handleFinish}
        disabled={isLoading}
        className="w-full h-12 bg-gradient-to-r from-indigo-600 to-violet-600 hover:from-indigo-500 hover:to-violet-500 text-white font-bold gap-2 group text-sm shadow-lg shadow-indigo-500/20 transition-all duration-200"
      >
        {isLoading ? (
          <>
            <IconLoader2 size={16} className="animate-spin" />
            Entrando no dashboard...
          </>
        ) : (
          <>
            <IconRocket size={16} className="transition-transform group-hover:-translate-y-0.5" />
            Explorar o Dashboard
          </>
        )}
      </Button>
    </div>
  );
}
