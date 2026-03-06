import { getTranslations } from "next-intl/server";
import { ForgotPasswordForm } from "./_components/forgot-password-form";
import { GrowareLogo } from "@/components/groware-logo";
import type { Metadata } from "next";

type Props = { params: Promise<{ locale: string }> };

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { locale } = await params;
  const t = await getTranslations({ locale, namespace: "auth.forgotPassword" });
  return { title: t("pageTitle") };
}

export default async function ForgotPasswordPage() {
  const t = await getTranslations("auth.forgotPassword");

  return (
    <main className="min-h-screen bg-zinc-950 flex items-center justify-center p-6">
      <div className="w-full max-w-sm space-y-8">
        <GrowareLogo size="sm" />

        <div className="space-y-2">
          <h2 className="text-2xl font-bold text-zinc-100">{t("title")}</h2>
          <p className="text-sm text-zinc-500">
            {t("subtitle")}
          </p>
        </div>

        <div className="rounded-xl border border-zinc-800/80 bg-zinc-900/40 p-6 backdrop-blur-sm">
          <ForgotPasswordForm />
        </div>
      </div>
    </main>
  );
}
