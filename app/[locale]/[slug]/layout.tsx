import { redirect } from "next/navigation";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth-options";
import { getOrganizationBySlug } from "@/actions/organizations/get-organization-by-slug.action";
import { updateLastActivity } from "@/actions/emails/update-last-activity.action";
import { Sidebar } from "./_components/sidebar";
import { Topbar } from "./_components/topbar";
import { MobileChecklistBanner } from "./_components/mobile-checklist-banner";
import { RevenueLimitBanner } from "./_components/revenue-limit-banner";

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

  void updateLastActivity(org.id);

  return (
    <div className="flex h-dvh overflow-hidden bg-zinc-950">
      <Sidebar slug={slug} />
      <main className="flex-1 min-w-0 overflow-x-hidden overflow-y-auto overscroll-none">
        <Topbar slug={slug} />
        <div className="pt-14 md:pt-0">
          <RevenueLimitBanner slug={slug} />
          <MobileChecklistBanner slug={slug} />
          {children}
        </div>
      </main>
    </div>
  );
}
