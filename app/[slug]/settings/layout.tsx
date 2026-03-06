import type { Metadata } from "next";
import { SettingsLayoutShell } from "./_components/settings-layout-shell";

export const metadata: Metadata = {
  title: "Configurações",
  description: "Gerencie as configurações da sua organização no Groware.",
};

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
