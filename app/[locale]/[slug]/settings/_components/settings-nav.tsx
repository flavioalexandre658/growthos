"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useTranslations } from "next-intl";
import {
  IconWorld,
  IconFilter,
  IconBrain,
  IconBell,
  IconUsers,
  IconBuilding,
  IconPlug,
  IconShare,
  IconCreditCard,
} from "@tabler/icons-react";
import { ScrollArea, ScrollBar } from "@/components/ui/scroll-area";
import { cn } from "@/lib/utils";

export interface SettingsSection {
  id: string;
  labelKey: string;
  icon: React.ReactNode;
}

export const SETTINGS_SECTIONS: SettingsSection[] = [
  {
    id: "organization",
    labelKey: "organization",
    icon: <IconBuilding size={14} />,
  },
  { id: "funnel", labelKey: "funnel", icon: <IconFilter size={14} /> },
  { id: "integrations", labelKey: "integrations", icon: <IconPlug size={14} /> },
  { id: "billing", labelKey: "billing", icon: <IconCreditCard size={14} /> },
  { id: "team", labelKey: "team", icon: <IconUsers size={14} /> },
  { id: "ai-profile", labelKey: "aiProfile", icon: <IconBrain size={14} /> },
  { id: "regional", labelKey: "regional", icon: <IconWorld size={14} /> },
  { id: "notifications", labelKey: "notifications", icon: <IconBell size={14} /> },
  { id: "public-page", labelKey: "publicPage", icon: <IconShare size={14} /> },
];

interface SettingsNavProps {
  slug: string;
}

export function SettingsNav({ slug }: SettingsNavProps) {
  const t = useTranslations("settings.nav");
  const pathname = usePathname();

  const isActive = (id: string) =>
    pathname.includes(`/${slug}/settings/${id}`);

  return (
    <>
      <nav className="hidden lg:flex flex-col gap-1 sticky top-6 w-44 shrink-0 pt-1">
        {SETTINGS_SECTIONS.map((section) => {
          const active = isActive(section.id);
          return (
            <Link
              key={section.id}
              href={`/${slug}/settings/${section.id}`}
              className={cn(
                "flex items-center gap-2.5 rounded-lg px-3 py-2 text-xs font-medium transition-all",
                active
                  ? "bg-zinc-800 text-zinc-100"
                  : "text-zinc-500 hover:text-zinc-300 hover:bg-zinc-900",
              )}
            >
              <span
                className={cn(
                  "shrink-0 transition-colors",
                  active ? "text-indigo-400" : "text-zinc-600",
                )}
              >
                {section.icon}
              </span>
              <span className="flex-1">{t(section.labelKey)}</span>
            </Link>
          );
        })}
      </nav>

      <div className="lg:hidden sticky top-0 z-10 bg-zinc-950/95 backdrop-blur-sm border-b border-zinc-800 -mx-5 px-5 mb-4">
        <ScrollArea className="w-full" type="scroll">
          <div className="flex items-center gap-1 py-2.5 w-max pr-5">
            {SETTINGS_SECTIONS.map((section) => {
              const active = isActive(section.id);
              return (
                <Link
                  key={section.id}
                  href={`/${slug}/settings/${section.id}`}
                  className={cn(
                    "flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-xs font-medium whitespace-nowrap transition-all",
                    active
                      ? "bg-zinc-800 text-zinc-100"
                      : "text-zinc-500 hover:text-zinc-300",
                  )}
                >
                  <span
                    className={cn(active ? "text-indigo-400" : "text-zinc-600")}
                  >
                    {section.icon}
                  </span>
                  {t(section.labelKey)}
                </Link>
              );
            })}
          </div>
          <ScrollBar orientation="horizontal" className="h-0" />
        </ScrollArea>
      </div>
    </>
  );
}
