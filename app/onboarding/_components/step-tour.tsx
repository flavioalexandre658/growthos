"use client";

import { useState } from "react";
import { useSession } from "next-auth/react";
import toast from "react-hot-toast";
import {
  IconLayoutDashboard,
  IconLoader2,
  IconRocket,
  IconCheck,
  IconArrowRight,
  IconBolt,
  IconArrowBack,
} from "@tabler/icons-react";
import { Button } from "@/components/ui/button";
import { completeOnboarding } from "@/actions/auth/complete-onboarding.action";
import { buildPrompt } from "@/app/[slug]/settings/_components/ai-prompt-section";
import type { IFunnelStepConfig } from "@/db/schema/organization.schema";

interface StepTourProps {
  slug: string;
  userName: string;
  verified: boolean;
  currency: string;
  funnelSteps: IFunnelStepConfig[];
  hasRecurringRevenue: boolean;
  apiKey: string;
  onGoBack: () => void;
}

export function StepTour({
  slug,
  userName,
  verified,
  currency,
  funnelSteps,
  hasRecurringRevenue,
  apiKey,
  onGoBack,
}: StepTourProps) {
  const [isLoading, setIsLoading] = useState(false);
  const [copiedPrompt, setCopiedPrompt] = useState(false);
  const { update } = useSession();

  const firstName = userName.split(" ")[0];

  const funnelLabel = funnelSteps
    .filter((s) => !s.hidden)
    .map((s) => s.label)
    .join(" → ");

  const baseUrl =
    typeof window !== "undefined"
      ? window.location.origin
      : "https://groware.io";

  const handleFinish = async () => {
    setIsLoading(true);
    try {
      await completeOnboarding();
      await update({ onboardingCompleted: true });
      toast.success("Bem-vindo ao Groware!");
      window.location.href = slug ? `/${slug}` : "/organizations";
    } catch {
      toast.error("Erro ao finalizar onboarding.");
      setIsLoading(false);
    }
  };

  const handleCopyPrompt = () => {
    const prompt = buildPrompt(
      apiKey,
      baseUrl,
      slug,
      currency,
      funnelSteps,
      hasRecurringRevenue,
    );
    navigator.clipboard.writeText(prompt);
    setCopiedPrompt(true);
    toast.success("Prompt copiado!");
    setTimeout(() => setCopiedPrompt(false), 2500);
  };

  if (verified) {
    return (
      <div className="space-y-6">
        <div className="text-center space-y-3">
          <div className="flex justify-center">
            <div className="relative">
              <div className="absolute inset-0 rounded-full bg-emerald-500/20 animate-ping" />
              <div className="relative flex h-16 w-16 items-center justify-center rounded-full bg-gradient-to-br from-emerald-500 to-emerald-600 shadow-lg shadow-emerald-500/30">
                <IconCheck size={30} className="text-white" strokeWidth={2.5} />
              </div>
            </div>
          </div>
          <div className="space-y-1.5">
            <h2 className="text-2xl font-bold bg-gradient-to-r from-emerald-400 to-emerald-300 bg-clip-text text-transparent">
              Tudo configurado, {firstName}!
            </h2>
            {funnelLabel && (
              <p className="text-xs text-zinc-600 font-mono">
                {funnelLabel} · {currency}
              </p>
            )}
            <p className="text-sm text-zinc-500 max-w-xs mx-auto leading-relaxed">
              Eventos chegando. Seu dashboard está pronto para uso.
            </p>
          </div>
        </div>

        <Button
          onClick={handleFinish}
          disabled={isLoading}
          className="w-full h-12 bg-gradient-to-r from-emerald-600 to-emerald-500 hover:from-emerald-500 hover:to-emerald-400 text-white font-bold gap-2 group text-sm shadow-lg shadow-emerald-500/20 transition-all duration-200"
        >
          {isLoading ? (
            <>
              <IconLoader2 size={16} className="animate-spin" />
              Entrando...
            </>
          ) : (
            <>
              <IconRocket
                size={16}
                className="transition-transform group-hover:-translate-y-0.5"
              />
              Ir para Visão Geral
              <IconArrowRight size={15} className="ml-auto opacity-60 group-hover:translate-x-0.5 transition-transform" />
            </>
          )}
        </Button>
      </div>
    );
  }

  return (
    <div className="space-y-5">
      <div className="text-center space-y-3">
        <div className="flex justify-center">
          <div className="flex h-14 w-14 items-center justify-center rounded-full bg-gradient-to-br from-indigo-500 to-violet-600 shadow-lg shadow-indigo-500/30">
            <IconCheck size={26} className="text-white" strokeWidth={2.5} />
          </div>
        </div>
        <div className="space-y-1">
          <h2 className="text-xl font-bold text-zinc-100">
            Quase lá, {firstName}!
          </h2>
        </div>
      </div>

      <div className="rounded-xl border border-zinc-800 bg-zinc-900/50 p-5 space-y-4">
        <div className="space-y-1">
          {funnelLabel && (
            <p className="text-xs font-mono text-zinc-400">
              {funnelLabel} · {currency}
            </p>
          )}
          <div className="flex items-center gap-1.5">
            <IconCheck size={13} className="text-emerald-400 shrink-0" />
            <p className="text-sm font-semibold text-zinc-200">
              Configuração concluída
            </p>
          </div>
        </div>

        <div className="h-px bg-zinc-800" />

        <div className="space-y-1.5">
          <p className="text-xs font-semibold text-zinc-400">Próximo passo</p>
          <p className="text-sm text-zinc-500 leading-relaxed">
            Instale o tracker no seu projeto e volte para ver seus dados.
            Use o prompt abaixo para integrar com IA em segundos.
          </p>
        </div>

        <div className="flex flex-col gap-2">
          <button
            type="button"
            onClick={handleCopyPrompt}
            className="flex items-center justify-center gap-2 rounded-lg border border-indigo-700/50 bg-indigo-950/40 hover:bg-indigo-950/70 hover:border-indigo-600/60 px-4 py-2.5 text-sm font-medium text-indigo-300 transition-all"
          >
            {copiedPrompt ? (
              <IconCheck size={15} className="text-emerald-400" />
            ) : (
              <IconBolt size={15} />
            )}
            {copiedPrompt ? "Prompt copiado!" : "Copiar prompt para IA"}
          </button>

          <button
            type="button"
            onClick={onGoBack}
            className="flex items-center justify-center gap-1.5 text-xs text-zinc-600 hover:text-zinc-400 transition-colors py-1"
          >
            <IconArrowBack size={12} />
            Voltar e verificar instalação agora
          </button>
        </div>
      </div>

      <Button
        onClick={handleFinish}
        disabled={isLoading}
        className="w-full h-11 bg-zinc-800 hover:bg-zinc-700 text-zinc-200 font-semibold gap-2 group text-sm transition-all duration-200"
      >
        {isLoading ? (
          <>
            <IconLoader2 size={16} className="animate-spin" />
            Entrando...
          </>
        ) : (
          <>
            <IconLayoutDashboard size={15} />
            Ir para o Dashboard
          </>
        )}
      </Button>
    </div>
  );
}
