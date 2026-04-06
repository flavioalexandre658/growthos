import { Suspense } from "react";
import { redirect } from "next/navigation";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth-options";
import { getOrganizationsWithStats } from "@/actions/organizations/get-organizations-with-stats.action";
import { getBilling } from "@/actions/billing/get-billing.action";
import { OrganizationsContent } from "./_components/organizations-content";

export const metadata = {
  title: "Organizações",
};

export default async function OrganizationsPage() {
  const session = await getServerSession(authOptions);

  if (!session?.user) {
    redirect("/login");
  }

  const [orgs, billing] = await Promise.all([
    getOrganizationsWithStats(),
    getBilling(),
  ]);
  const firstOrgSlug = orgs[0]?.slug ?? null;

  return (
    <main className="min-h-screen bg-zinc-950">
      <Suspense>
        <OrganizationsContent initialOrgs={orgs} initialBilling={billing} userName={session.user.name} firstOrgSlug={firstOrgSlug} />
      </Suspense>
    </main>
  );
}
