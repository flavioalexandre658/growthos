import { useTranslations } from "next-intl";
import { Link } from "@/i18n/routing";
import { IconChartLine } from "@tabler/icons-react";

export function BlogCta() {
  const t = useTranslations("blog.cta");

  return (
    <div className="mt-12 rounded-2xl border border-indigo-500/20 bg-gradient-to-br from-indigo-500/[0.06] to-transparent p-8 text-center">
      <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-xl bg-indigo-500/10 mb-4">
        <IconChartLine size={24} className="text-indigo-400" />
      </div>
      <h3 className="text-lg font-bold text-zinc-100 font-display">
        {t("title")}
      </h3>
      <p className="mt-2 text-sm text-zinc-400 max-w-md mx-auto leading-relaxed">
        {t("description")}
      </p>
      <Link
        href="/register"
        className="mt-5 inline-flex items-center gap-2 rounded-lg bg-indigo-600 px-5 py-2.5 text-sm font-semibold text-white hover:bg-indigo-500 transition-colors"
      >
        {t("button")}
      </Link>
    </div>
  );
}
