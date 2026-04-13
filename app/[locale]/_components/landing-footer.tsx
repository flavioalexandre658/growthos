import { useTranslations } from "next-intl";
import { Link } from "@/i18n/routing";
import { GrowareLogo } from "@/components/groware-logo";

export function LandingFooter() {
  const t = useTranslations("footer");

  const links = [
    { label: t("links.docs"), href: "/docs" as const },
    { label: t("links.changelog"), href: "/changelog" as const },
    { label: t("links.privacy"), href: "/privacy" as const },
    { label: t("links.terms"), href: "/terms" as const },
    { label: t("links.blog"), href: "/blog" as const },
  ];

  return (
    <footer className="border-t border-white/[0.04] px-6 md:px-20 py-12">
      <div className="grid grid-cols-1 md:grid-cols-2 gap-8 items-center">
        <div className="flex flex-col gap-2">
          <GrowareLogo size="sm" />
          <p className="text-xs text-zinc-600">{t("copyright")}</p>
          <p className="text-xs text-zinc-700 font-mono">{t("version")}</p>
        </div>
        <div className="flex gap-6 md:justify-end flex-wrap">
          {links.map(({ label, href }) => (
            <Link
              key={href}
              href={href}
              className="text-sm text-zinc-600 hover:text-zinc-400 transition-colors"
            >
              {label}
            </Link>
          ))}
        </div>
      </div>
    </footer>
  );
}
