"use client";

import { useState, useEffect, useCallback } from "react";
import { useTranslations } from "next-intl";
import { useSession } from "next-auth/react";
import { useRouter, useSearchParams } from "next/navigation";
import { IconCheck } from "@tabler/icons-react";
import { GrowareLogo } from "@/components/groware-logo";
import { cn } from "@/lib/utils";
import { StepOrganization } from "./step-organization";
import { StepChoosePath } from "./step-choose-path";
import { StepFunnelConfig } from "./step-funnel-config";
import { StepInstallTracker } from "./step-install-tracker";
import { StepGateway } from "./step-gateway";
import { pushDataLayerEvent } from "@/utils/datalayer";
import type { IOrganization } from "@/interfaces/organization.interface";
import type { IFunnelStepConfig } from "@/db/schema/organization.schema";

type OnboardingPath = "gateway" | "tracker" | null;

const GATEWAY_STEPS = ["organization", "choose-path", "gateway"] as const;
const TRACKER_STEPS = [
  "organization",
  "choose-path",
  "funnel",
  "install",
] as const;
const DEFAULT_STEPS = ["organization", "choose-path", "gateway"] as const;

function inferPathFromStep(step: string | null): OnboardingPath {
  if (step === "gateway") return "gateway";
  if (step === "funnel" || step === "install") return "tracker";
  return null;
}

function getActiveSteps(path: OnboardingPath) {
  if (path === "gateway") return GATEWAY_STEPS;
  if (path === "tracker") return TRACKER_STEPS;
  return DEFAULT_STEPS;
}

function calcStepMap(steps: readonly string[]): Record<string, number> {
  const map: Record<string, number> = {};
  steps.forEach((key, idx) => {
    map[key] = idx + 1;
  });
  return map;
}

function calcInitialStep(
  existingOrg: IOrganization | null,
  existingApiKey: string | null,
  hasActiveIntegration: boolean,
  stepParam: string | null,
  path: OnboardingPath,
): number {
  const steps = getActiveSteps(path);
  const map = calcStepMap(steps);

  if (stepParam && map[stepParam]) {
    const requested = map[stepParam];
    if (requested <= 1) return 1;
    if (existingOrg) return requested;
    return 1;
  }

  if (!existingOrg) return 1;
  if (hasActiveIntegration) return map["gateway"] ?? steps.length;
  if (existingApiKey && path === "tracker")
    return map["install"] ?? steps.length;
  if (path === "tracker") return map["funnel"] ?? 3;
  return 2;
}

interface OnboardingWizardProps {
  userName: string;
  existingOrg: IOrganization | null;
  existingApiKey: string | null;
  hasActiveIntegration: boolean;
  initialStepParam?: string | null;
}

export function OnboardingWizard({
  userName,
  existingOrg,
  existingApiKey,
  hasActiveIntegration,
  initialStepParam,
}: OnboardingWizardProps) {
  const t = useTranslations("onboarding.wizard");
  const { data: session } = useSession();
  const router = useRouter();
  const searchParams = useSearchParams();

  const [path, setPath] = useState<OnboardingPath>(() =>
    inferPathFromStep(initialStepParam ?? null),
  );

  const activeSteps = getActiveSteps(path);

  const [currentStep, setCurrentStep] = useState(() =>
    calcInitialStep(
      existingOrg,
      existingApiKey,
      hasActiveIntegration,
      initialStepParam ?? null,
      inferPathFromStep(initialStepParam ?? null),
    ),
  );

  const [org, setOrg] = useState<IOrganization | null>(existingOrg);
  const [funnelSteps, setFunnelSteps] = useState<IFunnelStepConfig[]>(
    existingOrg?.funnelSteps ?? [],
  );

  const syncStepToUrl = useCallback(
    (step: number, steps: readonly string[]) => {
      if (step === 1) return;
      const stepKey = steps[step - 1];
      if (!stepKey) return;
      const params = new URLSearchParams(searchParams.toString());
      params.set("step", stepKey);
      router.replace(`?${params.toString()}`, { scroll: false });
    },
    [router, searchParams],
  );

  useEffect(() => {
    syncStepToUrl(currentStep, activeSteps);
  }, [currentStep, activeSteps, syncStepToUrl]);

  useEffect(() => {
    const userId = session?.user?.id;
    if (!userId || session?.user?.authProvider !== "google") return;
    const key = `accountCreated_${userId}`;
    if (localStorage.getItem(key)) return;
    pushDataLayerEvent("AccountCreated", { method: "google" });
    localStorage.setItem(key, "1");
  }, [session]);

  const handleChoosePath = (chosen: "gateway" | "tracker") => {
    setPath(chosen);
    pushDataLayerEvent("OnboardingPathChosen", { path: chosen });
    setCurrentStep(3);
  };

  const advance = () => {
    setCurrentStep((s) => Math.min(s + 1, activeSteps.length));
  };

  const stepKey = activeSteps[currentStep - 1];

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
          {activeSteps.map((key, idx) => {
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
        {stepKey === "organization" && (
          <StepOrganization
            onComplete={(createdOrg) => {
              setOrg(createdOrg);
              router.push(
                `/onboarding/${createdOrg.slug}?step=choose-path`,
              );
            }}
          />
        )}

        {stepKey === "choose-path" && (
          <StepChoosePath onChoose={handleChoosePath} />
        )}

        {stepKey === "gateway" && org && (
          <StepGateway
            organizationId={org.id}
            slug={org.slug}
            onComplete={advance}
          />
        )}

        {stepKey === "funnel" && org && (
          <StepFunnelConfig
            organizationId={org.id}
            onComplete={(steps) => {
              setFunnelSteps(steps);
              advance();
            }}
          />
        )}

        {stepKey === "install" && org && (
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
        {t("stepProgress", {
          current: currentStep,
          total: activeSteps.length,
        })}
      </p>
    </div>
  );
}
