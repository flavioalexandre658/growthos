import { Suspense } from "react";
import { redirect } from "next/navigation";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth-options";
import { getOrganizations } from "@/actions/organizations/get-organizations.action";
import { OrganizationsContent } from "./_components/organizations-content";

export const metadata = {
  title: "Organizações | GrowthOS",
};

export default async function OrganizationsPage() {
  const session = await getServerSession(authOptions);

  if (!session?.user) {
    redirect("/login");
  }

  if (!session.user.onboardingCompleted) {
    redirect("/onboarding");
  }

  const orgs = await getOrganizations();

  return (
    <main className="min-h-screen bg-zinc-950">
      <Suspense>
        <OrganizationsContent initialOrgs={orgs} userName={session.user.name} />
      </Suspense>
    </main>
  );
}
