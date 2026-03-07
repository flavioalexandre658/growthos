"use client";

import { IconClock, IconLock } from "@tabler/icons-react";
import { useTranslations } from "next-intl";
import { useBilling } from "@/hooks/queries/use-billing";
import Link from "next/link";
import { useParams } from "next/navigation";

interface Provider {
  name: string;
  descriptionKey: string;
  logo: React.ReactNode;
}

const PROVIDERS: Provider[] = [
  {
    name: "Asaas",
    descriptionKey: "asaasDescription",
    logo: (
      <span className="text-[15px] font-bold text-[#00BFA5] leading-none tracking-tight">A</span>
    ),
  },
  {
    name: "Kiwify",
    descriptionKey: "kiwifyDescription",
    logo: (
      <span className="text-[15px] font-bold text-[#7C3AED] leading-none tracking-tight">K</span>
    ),
  },
  {
    name: "Hotmart",
    descriptionKey: "hotmartDescription",
    logo: (
      <span className="text-[15px] font-bold text-[#F04E23] leading-none tracking-tight">H</span>
    ),
  },
];

export function ComingSoonProviders() {
  const t = useTranslations("settings.integrations");
  const { data: billing } = useBilling();
  const params = useParams<{ slug: string }>();
  const hasAccess = billing?.plan.hasAdvancedIntegrations ?? false;

  return (
    <div className="space-y-2">
      <div className="flex items-center justify-between">
        <p className="text-[10px] text-zinc-600 uppercase tracking-widest font-semibold">
          {t("comingSoon")}
        </p>
        {!hasAccess && (
          <Link
            href={`/${params.slug}/settings/billing`}
            className="flex items-center gap-1 text-[10px] text-indigo-400 hover:text-indigo-300 transition-colors"
          >
            <IconLock size={10} />
            {t("availableFromStarter")}
          </Link>
        )}
      </div>
      <div className="grid gap-3 sm:grid-cols-3">
        {PROVIDERS.map((provider) => (
          <div
            key={provider.name}
            className={`flex items-center gap-3 rounded-xl border border-zinc-800/60 bg-zinc-900/30 px-4 py-3 ${
              hasAccess ? "opacity-60" : "opacity-40"
            }`}
          >
            <div className="w-8 h-8 rounded-lg bg-zinc-800 border border-zinc-700 flex items-center justify-center shrink-0">
              {provider.logo}
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-xs font-medium text-zinc-300">{provider.name}</p>
              <p className="text-[11px] text-zinc-600 truncate">{t(provider.descriptionKey)}</p>
            </div>
            <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-medium bg-zinc-800 text-zinc-500 border border-zinc-700 shrink-0">
              {!hasAccess ? <IconLock size={10} /> : <IconClock size={10} />}
              {!hasAccess ? t("starterPlus") : t("comingSoon")}
            </span>
          </div>
        ))}
      </div>
    </div>
  );
}
