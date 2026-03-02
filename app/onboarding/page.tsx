import { redirect } from "next/navigation";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth-options";
import { getOrganizations } from "@/actions/organizations/get-organizations.action";
import { getApiKeys } from "@/actions/api-keys/get-api-keys.action";
import { OnboardingWizard } from "./_components/onboarding-wizard";
import type { IOrganization } from "@/interfaces/organization.interface";

export const metadata = {
  title: "Configuração inicial — GrowthOS",
};

export default async function OnboardingPage() {
  const session = await getServerSession(authOptions);

  if (!session?.user) {
    redirect("/login");
  }

  if (session.user.onboardingCompleted) {
    redirect("/dashboard");
  }

  const orgs = await getOrganizations();
  const existingOrg = (orgs[0] as IOrganization) ?? null;

  let existingApiKey: string | null = null;
  if (existingOrg) {
    const keys = await getApiKeys(existingOrg.id);
    const activeKey = keys.find((k) => k.isActive);
    existingApiKey = activeKey?.key ?? null;
  }

  return (
    <main className="min-h-screen bg-zinc-950 flex flex-col items-center justify-center p-4">
      <OnboardingWizard
        userName={session.user.name}
        existingOrg={existingOrg}
        existingApiKey={existingApiKey}
      />
    </main>
  );
}
