import { SettingsLayoutShell } from "./_components/settings-layout-shell";

interface SettingsLayoutProps {
  children: React.ReactNode;
  params: Promise<{ slug: string }>;
}

export default async function SettingsLayout({
  children,
  params,
}: SettingsLayoutProps) {
  const { slug } = await params;
  return <SettingsLayoutShell slug={slug}>{children}</SettingsLayoutShell>;
}
