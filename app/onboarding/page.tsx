import { Suspense } from "react";
import { redirect } from "next/navigation";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth-options";
import { getOrganizations } from "@/actions/organizations/get-organizations.action";
import { getApiKeys } from "@/actions/api-keys/get-api-keys.action";
import { OnboardingWizard } from "./_components/onboarding-wizard";
import type { IOrganization } from "@/interfaces/organization.interface";

export const metadata = {
  title: "Configuração inicial | GrowthOS",
};

interface OnboardingPageProps {
  searchParams: Promise<{ "new-org"?: string }>;
}

export default async function OnboardingPage({
  searchParams,
}: OnboardingPageProps) {
  const session = await getServerSession(authOptions);

  if (!session?.user) {
    redirect("/login");
  }

  const resolvedParams = await searchParams;
  const isNewOrg = resolvedParams["new-org"] === "1";

  if (session.user.onboardingCompleted && !isNewOrg) {
    redirect("/organizations");
  }

  let existingOrg: IOrganization | null = null;
  let existingApiKey: string | null = null;

  if (!isNewOrg) {
    const orgs = await getOrganizations();
    existingOrg = (orgs[0] as IOrganization) ?? null;

    if (existingOrg) {
      const keys = await getApiKeys(existingOrg.id);
      const activeKey = keys.find((k) => k.isActive);
      existingApiKey = activeKey?.key ?? null;
    }
  }

  return (
    <main className="min-h-screen bg-zinc-950 flex flex-col items-center justify-center p-4">
      <Suspense>
        <OnboardingWizard
          userName={session.user.name}
          existingOrg={existingOrg}
          existingApiKey={existingApiKey}
        />
      </Suspense>
    </main>
  );
}
