import { redirect } from "next/navigation";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth-options";
import { getOrganizationBySlug } from "@/actions/organizations/get-organization-by-slug.action";
import { Sidebar } from "./_components/sidebar";
import { MobileChecklistBanner } from "./_components/mobile-checklist-banner";

interface OrgLayoutProps {
  children: React.ReactNode;
  params: Promise<{ slug: string }>;
}

export default async function OrgLayout({ children, params }: OrgLayoutProps) {
  const { slug } = await params;

  const session = await getServerSession(authOptions);
  if (!session?.user) redirect("/login");

  if (!session.user.onboardingCompleted) redirect("/onboarding");

  const org = await getOrganizationBySlug(slug);
  if (!org) redirect("/organizations");

  return (
    <div className="flex min-h-screen bg-zinc-950">
      <Sidebar slug={slug} />
      <main className="flex-1 min-w-0 md:overflow-auto">
        <div className="pt-14 md:pt-0">
          <MobileChecklistBanner slug={slug} />
          {children}
        </div>
      </main>
    </div>
  );
}
