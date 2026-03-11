import { Suspense } from "react";
import { redirect } from "next/navigation";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth-options";
import { getOrganizations } from "@/actions/organizations/get-organizations.action";
import { OnboardingWizard } from "./_components/onboarding-wizard";

export const metadata = {
  title: "Configuração inicial",
};

interface OnboardingPageProps {
  searchParams: Promise<{ "new-org"?: string; step?: string }>;
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

  if (!isNewOrg) {
    const orgs = await getOrganizations();
    const existingOrg = orgs[0] ?? null;

    if (existingOrg) {
      const stepParam = resolvedParams.step;
      const destination = stepParam
        ? `/onboarding/${existingOrg.slug}?step=${stepParam}`
        : `/onboarding/${existingOrg.slug}`;
      redirect(destination);
    }
  }

  return (
    <main className="min-h-screen bg-zinc-950 flex flex-col items-center justify-center p-4">
      <Suspense>
        <OnboardingWizard
          userName={session.user.name}
          existingOrg={null}
          existingApiKey={null}
          initialStepParam={null}
        />
      </Suspense>
    </main>
  );
}
