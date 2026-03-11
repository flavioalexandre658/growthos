import { Suspense } from "react";
import { redirect } from "next/navigation";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth-options";
import { getOrganizationBySlug } from "@/actions/organizations/get-organization-by-slug.action";
import { getApiKeys } from "@/actions/api-keys/get-api-keys.action";
import { OnboardingWizard } from "../_components/onboarding-wizard";

export const metadata = {
  title: "Configuração inicial",
};

interface OrgOnboardingPageProps {
  params: Promise<{ slug: string }>;
  searchParams: Promise<{ step?: string }>;
}

export default async function OrgOnboardingPage({
  params,
  searchParams,
}: OrgOnboardingPageProps) {
  const session = await getServerSession(authOptions);

  if (!session?.user) {
    redirect("/login");
  }

  const { slug } = await params;
  const resolvedSearch = await searchParams;
  const stepParam = resolvedSearch.step ?? null;

  const org = await getOrganizationBySlug(slug);

  if (!org) {
    redirect("/onboarding");
  }

  const keys = await getApiKeys(org.id);
  const activeKey = keys.find((k) => k.isActive);
  const existingApiKey = activeKey?.key ?? null;

  return (
    <main className="min-h-screen bg-zinc-950 flex flex-col items-center justify-center p-4">
      <Suspense>
        <OnboardingWizard
          userName={session.user.name}
          existingOrg={org}
          existingApiKey={existingApiKey}
          initialStepParam={stepParam}
        />
      </Suspense>
    </main>
  );
}
