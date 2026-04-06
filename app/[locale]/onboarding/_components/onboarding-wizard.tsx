"use client";

import { useEffect } from "react";
import { useTranslations } from "next-intl";
import { useSession } from "next-auth/react";
import { useRouter } from "next/navigation";
import { GrowareLogo } from "@/components/groware-logo";
import { StepOrganization } from "./step-organization";
import { pushDataLayerEvent } from "@/utils/datalayer";
import type { IOrganization } from "@/interfaces/organization.interface";

interface OnboardingWizardProps {
  userName: string;
  existingOrg: IOrganization | null;
  existingApiKey: string | null;
  hasActiveIntegration: boolean;
  initialStepParam?: string | null;
}

export function OnboardingWizard({
  userName,
}: OnboardingWizardProps) {
  const t = useTranslations("onboarding.wizard");
  const { data: session } = useSession();
  const router = useRouter();

  useEffect(() => {
    const userId = session?.user?.id;
    if (!userId || session?.user?.authProvider !== "google") return;
    const key = `accountCreated_${userId}`;
    if (localStorage.getItem(key)) return;
    pushDataLayerEvent("AccountCreated", { method: "google" });
    localStorage.setItem(key, "1");
  }, [session]);

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

      <div className="rounded-2xl border border-zinc-800 bg-zinc-900/50 p-6 backdrop-blur-sm shadow-xl shadow-black/30">
        <StepOrganization
          onComplete={(createdOrg) => {
            router.push(`/${createdOrg.slug}`);
          }}
        />
      </div>
    </div>
  );
}
