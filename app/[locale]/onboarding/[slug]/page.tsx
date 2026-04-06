import { redirect } from "next/navigation";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth-options";
import { getOrganizationBySlug } from "@/actions/organizations/get-organization-by-slug.action";

export const metadata = {
  title: "Configuração inicial",
};

interface OrgOnboardingPageProps {
  params: Promise<{ slug: string }>;
}

export default async function OrgOnboardingPage({
  params,
}: OrgOnboardingPageProps) {
  const session = await getServerSession(authOptions);

  if (!session?.user) {
    redirect("/login");
  }

  const { slug } = await params;
  const org = await getOrganizationBySlug(slug);

  if (!org) {
    redirect("/onboarding");
  }

  redirect(`/${slug}`);
}
