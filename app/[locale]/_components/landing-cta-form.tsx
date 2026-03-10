"use client";

import { useTranslations } from "next-intl";
import { Link } from "@/i18n/routing";

interface LandingCtaFormProps {
  variant?: "hero" | "cta";
}

export function LandingCtaForm({ variant = "hero" }: LandingCtaFormProps) {
  const t = useTranslations("cta");

  if (variant === "cta") {
    return (
      <Link
        href="/register"
        className="inline-flex items-center px-8 py-3.5 rounded-xl bg-indigo-600 text-white text-sm font-semibold whitespace-nowrap hover:bg-indigo-500 transition-all shadow-[0_0_24px_rgba(79,70,229,0.4)]"
      >
        {t("submitCta")}
      </Link>
    );
  }

  return (
    <Link
      href="/register"
      className="inline-flex items-center px-8 py-3.5 rounded-xl bg-indigo-600 text-white text-sm font-semibold whitespace-nowrap hover:bg-indigo-500 transition-all shadow-[0_0_32px_rgba(79,70,229,0.4)] hover:-translate-y-0.5"
    >
      {t("submitHero")}
    </Link>
  );
}
