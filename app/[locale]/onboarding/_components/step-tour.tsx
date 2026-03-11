"use client";

import { useState } from "react";
import { useTranslations } from "next-intl";
import { useSession } from "next-auth/react";
import toast from "react-hot-toast";
import {
  IconLayoutDashboard,
  IconLoader2,
  IconCheck,
  IconArrowRight,
  IconBolt,
  IconArrowBack,
  IconCreditCard,
  IconCode,
} from "@tabler/icons-react";
import { completeOnboarding } from "@/actions/auth/complete-onboarding.action";
import { buildPrompt } from "@/app/[locale]/[slug]/settings/_components/ai-prompt-section";
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
  const t = useTranslations("onboarding.stepTour");
  const tTour = useTranslations("tour.stepTour.twoPaths");
  const [isLoading, setIsLoading] = useState<"gateway" | "tracker" | "dashboard" | null>(null);
  const [copiedPrompt, setCopiedPrompt] = useState(false);
  const { update } = useSession();

  const firstName = userName.split(" ")[0];

  const funnelLabel = funnelSteps
    .filter((s) => !s.hidden)
    .map((s) => s.label)
    .join(" \u2192 ");

  const baseUrl =
    typeof window !== "undefined"
      ? window.location.origin
      : "https://groware.io";

  const handleFinish = async (destination: "gateway" | "tracker" | "dashboard") => {
    setIsLoading(destination);
    try {
      await completeOnboarding();
      await update({ onboardingCompleted: true });
      toast.success(t("welcomeToast"));
      if (destination === "gateway") {
        window.location.href = slug ? `/${slug}/settings/integrations` : "/organizations";
      } else if (destination === "tracker") {
        window.location.href = `/onboarding/${slug}?step=install`;
      } else {
        window.location.href = slug ? `/${slug}` : "/organizations";
      }
    } catch {
      toast.error(t("errorToast"));
      setIsLoading(null);
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
    toast.success(t("promptCopiedToast"));
    setTimeout(() => setCopiedPrompt(false), 2500);
  };

  const TwoPathsCTA = () => (
    <div className="space-y-2">
      <p className="text-xs font-semibold text-zinc-400 text-center">{tTour("title")}</p>
      <p className="text-[11px] text-zinc-600 text-center mb-3">{tTour("subtitle")}</p>

      <button
        onClick={() => handleFinish("gateway")}
        disabled={isLoading !== null}
        className="flex w-full items-center gap-3 rounded-xl border border-indigo-700/50 bg-indigo-950/40 hover:bg-indigo-950/70 hover:border-indigo-600/60 px-4 py-3 transition-all disabled:opacity-60 group"
      >
        <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-indigo-600/20 ring-1 ring-inset ring-indigo-600/30">
          {isLoading === "gateway" ? (
            <IconLoader2 size={16} className="animate-spin text-indigo-400" />
          ) : (
            <IconCreditCard size={16} className="text-indigo-400" />
          )}
        </div>
        <div className="flex-1 text-left">
          <div className="flex items-center gap-2">
            <span className="text-sm font-semibold text-zinc-100">{tTour("gatewayLabel")}</span>
            <span className="rounded-full bg-emerald-500/20 px-1.5 py-0.5 text-[9px] font-bold text-emerald-400 ring-1 ring-inset ring-emerald-500/30">
              {tTour("gatewayBadge")}
            </span>
          </div>
          <p className="text-[11px] text-zinc-500 mt-0.5">{tTour("gatewayDescription")}</p>
        </div>
        <IconArrowRight size={14} className="shrink-0 text-zinc-600 group-hover:text-indigo-400 transition-colors" />
      </button>

      <button
        onClick={() => handleFinish("tracker")}
        disabled={isLoading !== null}
        className="flex w-full items-center gap-3 rounded-xl border border-zinc-800 bg-zinc-900/40 hover:bg-zinc-800/60 hover:border-zinc-700 px-4 py-3 transition-all disabled:opacity-60 group"
      >
        <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-zinc-800 ring-1 ring-inset ring-zinc-700">
          {isLoading === "tracker" ? (
            <IconLoader2 size={16} className="animate-spin text-zinc-400" />
          ) : (
            <IconCode size={16} className="text-zinc-400" />
          )}
        </div>
        <div className="flex-1 text-left">
          <span className="text-sm font-semibold text-zinc-200">{tTour("trackerLabel")}</span>
          <p className="text-[11px] text-zinc-500 mt-0.5">{tTour("trackerDescription")}</p>
        </div>
        <IconArrowRight size={14} className="shrink-0 text-zinc-600 group-hover:text-zinc-400 transition-colors" />
      </button>

      <button
        onClick={() => handleFinish("dashboard")}
        disabled={isLoading !== null}
        className="flex w-full items-center justify-center gap-1.5 text-xs text-zinc-600 hover:text-zinc-400 transition-colors py-2 disabled:opacity-40"
      >
        {isLoading === "dashboard" ? (
          <IconLoader2 size={12} className="animate-spin" />
        ) : (
          <IconLayoutDashboard size={12} />
        )}
        {tTour("skipLabel")}
      </button>
    </div>
  );

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
              {t("verified.title", { firstName })}
            </h2>
            {funnelLabel && (
              <p className="text-xs text-zinc-600 font-mono">
                {funnelLabel} · {currency}
              </p>
            )}
            <p className="text-sm text-zinc-500 max-w-xs mx-auto leading-relaxed">
              {t("verified.subtitle")}
            </p>
          </div>
        </div>

        <TwoPathsCTA />
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
            {t("unverified.title", { firstName })}
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
              {t("unverified.configComplete")}
            </p>
          </div>
        </div>

        <div className="h-px bg-zinc-800" />

        <div className="space-y-1.5">
          <p className="text-xs font-semibold text-zinc-400">{t("unverified.nextStep")}</p>
          <p className="text-sm text-zinc-500 leading-relaxed">
            {t("unverified.nextStepDescription")}
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
            {copiedPrompt ? t("unverified.promptCopied") : t("unverified.copyPrompt")}
          </button>

          <button
            type="button"
            onClick={onGoBack}
            className="flex items-center justify-center gap-1.5 text-xs text-zinc-600 hover:text-zinc-400 transition-colors py-1"
          >
            <IconArrowBack size={12} />
            {t("unverified.goBack")}
          </button>
        </div>
      </div>

      <TwoPathsCTA />
    </div>
  );
}
