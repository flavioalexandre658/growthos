"use client";

import { useEffect, useState } from "react";
import { IconChartBar, IconCheck } from "@tabler/icons-react";
import { cn } from "@/lib/utils";
import { StepCreateOrg } from "./step-create-org";
import { StepFunnelConfig } from "./step-funnel-config";
import { StepApiKey } from "./step-api-key";
import { StepVerifyEvent } from "./step-verify-event";
import { StepTour } from "./step-tour";
import type { IOrganization } from "@/interfaces/organization.interface";

const STEPS = [
  { number: 1, label: "Organização" },
  { number: 2, label: "Funil" },
  { number: 3, label: "API Key" },
  { number: 4, label: "Verificar" },
  { number: 5, label: "Dashboard" },
];

const LS_KEY = "growthos_onboarding_step";

function calcInitialStep(
  existingOrg: IOrganization | null,
  existingApiKey: string | null
): number {
  if (!existingOrg) return 1;
  if (!existingApiKey) return 2;
  if (typeof window !== "undefined") {
    const saved = window.localStorage.getItem(LS_KEY);
    if (saved === "5") return 5;
  }
  return 4;
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
  const [currentStep, setCurrentStep] = useState(() =>
    calcInitialStep(existingOrg, existingApiKey)
  );
  const [org, setOrg] = useState<IOrganization | null>(existingOrg);
  const [apiKey, setApiKey] = useState<string>(existingApiKey ?? "");

  const advance = () => {
    setCurrentStep((s) => {
      const next = Math.min(s + 1, 5);
      if (next === 5) {
        try {
          localStorage.setItem(LS_KEY, "5");
        } catch {
        }
      }
      return next;
    });
  };

  return (
    <div className="w-full max-w-lg space-y-6">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2.5">
          <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-indigo-600">
            <IconChartBar size={16} className="text-white" />
          </div>
          <span className="text-sm font-bold text-zinc-100">GrowthOS</span>
        </div>
        <p className="text-xs text-zinc-600">
          Olá,{" "}
          <span className="text-zinc-400 font-semibold">
            {userName.split(" ")[0]}
          </span>
        </p>
      </div>

      <div className="relative">
        <div className="absolute left-0 right-0 top-4 -translate-y-1/2 h-px bg-zinc-800" />
        <div className="relative flex items-start justify-between">
          {STEPS.map((step) => {
            const isDone = currentStep > step.number;
            const isActive = currentStep === step.number;
            return (
              <div
                key={step.number}
                className="flex flex-col items-center gap-1.5 z-10"
              >
                <div
                  className={cn(
                    "flex h-8 w-8 items-center justify-center rounded-full border-2 text-xs font-bold transition-all duration-300 bg-zinc-950",
                    isDone
                      ? "bg-emerald-600 border-emerald-600 text-white"
                      : isActive
                      ? "bg-indigo-600 border-indigo-600 text-white shadow-lg shadow-indigo-600/30"
                      : "bg-zinc-950 border-zinc-800 text-zinc-600"
                  )}
                >
                  {isDone ? <IconCheck size={14} /> : step.number}
                </div>
                <span
                  className={cn(
                    "text-[10px] font-semibold whitespace-nowrap hidden sm:block",
                    isDone
                      ? "text-emerald-500"
                      : isActive
                      ? "text-indigo-400"
                      : "text-zinc-700"
                  )}
                >
                  {step.label}
                </span>
              </div>
            );
          })}
        </div>
      </div>

      <div className="rounded-2xl border border-zinc-800 bg-zinc-900/50 p-6 backdrop-blur-sm shadow-xl shadow-black/30">
        {currentStep === 1 && (
          <StepCreateOrg
            onComplete={(createdOrg) => {
              setOrg(createdOrg);
              advance();
            }}
          />
        )}

        {currentStep === 2 && org && (
          <StepFunnelConfig organizationId={org.id} onComplete={advance} />
        )}

        {currentStep === 3 && org && (
          <StepApiKey
            organizationId={org.id}
            organizationName={org.name}
            existingKey={existingApiKey ?? undefined}
            onComplete={(key) => {
              setApiKey(key);
              advance();
            }}
          />
        )}

        {currentStep === 4 && org && (
          <StepVerifyEvent
            organizationId={org.id}
            apiKey={apiKey}
            onComplete={advance}
          />
        )}

        {currentStep === 5 && <StepTour onComplete={() => {}} />}
      </div>

      <p className="text-center text-xs text-zinc-700">
        Passo {currentStep} de {STEPS.length}
      </p>
    </div>
  );
}
