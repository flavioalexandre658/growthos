"use client";

import { useState, useEffect } from "react";
import { useTranslations } from "next-intl";
import { useSession } from "next-auth/react";
import { IconCheck } from "@tabler/icons-react";
import { GrowareLogo } from "@/components/groware-logo";
import { cn } from "@/lib/utils";
import { StepOrganization } from "./step-organization";
import { StepFunnelConfig } from "./step-funnel-config";
import { StepInstallTracker } from "./step-install-tracker";
import { pushDataLayerEvent } from "@/utils/datalayer";
import type { IOrganization } from "@/interfaces/organization.interface";
import type { IFunnelStepConfig } from "@/db/schema/organization.schema";

const STEP_KEYS = ["organization", "funnel", "install"] as const;

function calcInitialStep(
  existingOrg: IOrganization | null,
  existingApiKey: string | null,
): number {
  if (!existingOrg) return 1;
  if (existingApiKey) return 3;
  return 2;
}

interface OnboardingWizardProps {
  userName: string;
  existingOrg: IOrganization | null;
  existingApiKey: string | null;
}

export function OnboardingWizard({
  userName,
  existingOrg,
  existingApiKey,
}: OnboardingWizardProps) {
  const t = useTranslations("onboarding.wizard");
  const { data: session } = useSession();
  const [currentStep, setCurrentStep] = useState(() =>
    calcInitialStep(existingOrg, existingApiKey),
  );
  const [org, setOrg] = useState<IOrganization | null>(existingOrg);
  const [funnelSteps, setFunnelSteps] = useState<IFunnelStepConfig[]>(
    existingOrg?.funnelSteps ?? [],
  );

  useEffect(() => {
    const userId = session?.user?.id;
    if (!userId || session?.user?.authProvider !== "google") return;
    const key = `accountCreated_${userId}`;
    if (localStorage.getItem(key)) return;
    pushDataLayerEvent("AccountCreated", { method: "google" });
    localStorage.setItem(key, "1");
  }, [session]);

  const advance = () => {
    setCurrentStep((s) => Math.min(s + 1, 3));
  };

  return (
    <div className="w-full max-w-lg space-y-6">
      <div className="flex items-center justify-between">
        <GrowareLogo size="sm" />
        <p className="text-xs text-zinc-600">
          {t("greeting")}{" "}
          <span className="text-zinc-400 font-semibold">
            {userName.split(" ")[0]}
          </span>
        </p>
      </div>

      <div className="relative">
        <div className="absolute left-0 right-0 top-4 -translate-y-1/2 h-px bg-zinc-800" />
        <div className="relative flex items-start justify-between">
          {STEP_KEYS.map((key, idx) => {
            const number = idx + 1;
            const isDone = currentStep > number;
            const isActive = currentStep === number;
            return (
              <div
                key={key}
                className="flex flex-col items-center gap-1.5 z-10"
              >
                <div
                  className={cn(
                    "flex h-8 w-8 items-center justify-center rounded-full border-2 text-xs font-bold transition-all duration-300 bg-zinc-950",
                    isDone
                      ? "bg-emerald-600 border-emerald-600 text-white"
                      : isActive
                        ? "bg-indigo-600 border-indigo-600 text-white shadow-lg shadow-indigo-600/30"
                        : "bg-zinc-950 border-zinc-800 text-zinc-600",
                  )}
                >
                  {isDone ? <IconCheck size={14} /> : number}
                </div>
                <span
                  className={cn(
                    "text-[10px] font-semibold whitespace-nowrap",
                    isDone
                      ? "text-emerald-500"
                      : isActive
                        ? "text-indigo-400"
                        : "text-zinc-700",
                  )}
                >
                  {t(`steps.${key}`)}
                </span>
              </div>
            );
          })}
        </div>
      </div>

      <div className="rounded-2xl border border-zinc-800 bg-zinc-900/50 p-6 backdrop-blur-sm shadow-xl shadow-black/30">
        {currentStep === 1 && (
          <StepOrganization
            onComplete={(createdOrg) => {
              setOrg(createdOrg);
              advance();
            }}
          />
        )}

        {currentStep === 2 && org && (
          <StepFunnelConfig
            organizationId={org.id}
            onComplete={(steps) => {
              setFunnelSteps(steps);
              advance();
            }}
          />
        )}

        {currentStep === 3 && org && (
          <StepInstallTracker
            organizationId={org.id}
            organizationName={org.name}
            slug={org.slug}
            currency={org.currency ?? "BRL"}
            hasRecurringRevenue={org.hasRecurringRevenue}
            funnelSteps={funnelSteps}
            existingKey={existingApiKey ?? undefined}
          />
        )}
      </div>

      <p className="text-center text-xs text-zinc-700">
        {t("stepProgress", { current: currentStep, total: STEP_KEYS.length })}
      </p>
    </div>
  );
}
