"use client";

import Link from "next/link";
import { usePathname as usePathnameWithLocale, useSearchParams } from "next/navigation";
import { usePathname, useRouter } from "@/i18n/routing";
import { useState, useRef, useEffect, useCallback, Suspense } from "react";
import {
  IconLayoutDashboard,
  IconBrandGoogle,
  IconCurrencyDollar,
  IconMenu2,
  IconX,
  IconChevronLeft,
  IconChevronRight,
  IconChevronDown,
  IconWorldWww,
  IconCalculator,
  IconBuilding,
  IconSettings,
  IconBook,
  IconCheck,
  IconSelector,
  IconPlus,
  IconRepeat,
  IconSparkles,
  IconTrendingUp,
  IconList,
  IconBug,
  IconReceipt2,
  IconLock,
  IconUsers,
} from "@tabler/icons-react";
import { GrowareIcon } from "@/components/groware-icon";
import { GrowareLogo } from "@/components/groware-logo";
import { Sheet, SheetContent, SheetTitle, SheetTrigger } from "@/components/ui/sheet";
import { Button } from "@/components/ui/button";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
  CommandSeparator,
} from "@/components/ui/command";
import { cn } from "@/lib/utils";
import { useTranslations } from "next-intl";
import { useOrganization } from "@/components/providers/organization-provider";
import { useOrgHasData } from "@/hooks/queries/use-org-has-data";
import { useBilling } from "@/hooks/queries/use-billing";
import { SetupChecklist } from "./setup-checklist";
import { GlobalSearch } from "./global-search";
import { MobileTopbarActions } from "./topbar";

const STORAGE_KEY = "groware_active_org";

interface NavItemDef {
  href: string;
  label: string;
  icon: React.ElementType;
  exact: boolean;
  highlight?: boolean;
  activePrefix?: string;
  locked?: boolean;
  lockBadge?: string;
}

interface NavSection {
  title: string;
  items: NavItemDef[];
}

function buildNavSections(slug: string, hasData: boolean, hasAi: boolean, t: (key: string) => string): NavSection[] {
  const sections: NavSection[] = [
    {
      title: t("sections.overview"),
      items: [
        { href: `/${slug}`, label: t("nav.dashboard"), icon: IconLayoutDashboard, exact: true },
      ],
    },
    {
      title: t("sections.revenue"),
      items: [
        { href: `/${slug}/finance`, label: t("nav.finance"), icon: IconCurrencyDollar, exact: false },
        { href: `/${slug}/costs`, label: t("nav.costs"), icon: IconCalculator, exact: false },
        { href: `/${slug}/mrr`, label: t("nav.recurrence"), icon: IconRepeat, exact: false },
      ],
    },
    {
      title: t("sections.acquisition"),
      items: [
        { href: `/${slug}/channels`, label: t("nav.channels"), icon: IconBrandGoogle, exact: false },
        { href: `/${slug}/pages`, label: t("nav.pages"), icon: IconWorldWww, exact: false },
      ],
    },
    {
      title: t("sections.intelligence"),
      items: [
        { href: `/${slug}/ai`, label: t("nav.aiAnalysis"), icon: IconSparkles, exact: true, highlight: true, locked: !hasAi, lockBadge: t("lockBadge.starter") },
        { href: `/${slug}/ai/comparativo`, label: t("nav.comparative"), icon: IconTrendingUp, exact: false, highlight: false, locked: !hasAi, lockBadge: t("lockBadge.starter") },
      ],
    },
  ];

  const dataItems: NavItemDef[] = [
    { href: `/${slug}/events`, label: t("nav.events"), icon: IconList, exact: true },
    { href: `/${slug}/events/debug`, label: t("nav.debug"), icon: IconBug, exact: true },
  ];

  if (hasData) {
    dataItems.splice(1, 0,
      { href: `/${slug}/customers`, label: t("nav.customers"), icon: IconUsers, exact: false },
      { href: `/${slug}/subscriptions`, label: t("nav.subscriptions"), icon: IconReceipt2, exact: false },
    );
  }

  sections.splice(3, 0, {
    title: t("sections.data"),
    items: dataItems,
  });

  return sections;
}

interface FooterNavSection {
  items: NavItemDef[];
}

function buildFooterNav(slug: string, t: (key: string) => string): FooterNavSection {
  return {
    items: [
      { href: "/docs", label: t("nav.docs"), icon: IconBook, exact: false },
      { href: `/${slug}/settings/organization`, label: t("nav.settings"), icon: IconSettings, exact: false, activePrefix: `/${slug}/settings` },
    ],
  };
}

const DATE_PARAMS = ["period", "start_date", "end_date"];

function NavItem({
  href,
  label,
  icon: Icon,
  exact,
  collapsed,
  highlight,
  activePrefix,
  locked,
  lockBadge,
  onClick,
}: {
  href: string;
  label: string;
  icon: React.ElementType;
  exact: boolean;
  collapsed?: boolean;
  highlight?: boolean;
  activePrefix?: string;
  locked?: boolean;
  lockBadge?: string;
  onClick?: () => void;
}) {
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const t = useTranslations("sidebar");
  const isActive = activePrefix
    ? pathname.includes(activePrefix)
    : exact
      ? pathname === href
      : pathname.startsWith(href);

  const forwarded = new URLSearchParams();
  for (const key of DATE_PARAMS) {
    const val = searchParams.get(key);
    if (val) forwarded.set(key, val);
  }
  const qs = forwarded.toString();
  const resolvedHref = qs ? `${href}?${qs}` : href;

  if (locked) {
    return (
      <div
        className="flex items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium border border-transparent text-zinc-600 cursor-not-allowed opacity-50"
        title={t("lockBadge.availableOnPlan", { plan: lockBadge ?? "" })}
      >
        <Icon size={18} className="shrink-0 text-zinc-700" />
        {!collapsed && (
          <>
            <span className="flex-1">{label}</span>
            <span className="flex items-center gap-0.5 text-[9px] font-bold text-zinc-600 bg-zinc-800 px-1.5 py-0.5 rounded">
              <IconLock size={8} />
              {lockBadge}
            </span>
          </>
        )}
      </div>
    );
  }

  return (
    <Link
      href={resolvedHref}
      onClick={onClick}
      className={cn(
        "flex items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium transition-all duration-150",
        isActive
          ? highlight
            ? "bg-indigo-600/20 text-indigo-300 border border-indigo-500/40"
            : "bg-indigo-600/20 text-indigo-400 border border-indigo-600/30"
          : highlight
            ? "text-indigo-400/70 hover:bg-indigo-600/10 hover:text-indigo-300 border border-transparent"
            : "text-zinc-400 hover:bg-zinc-800/60 hover:text-zinc-100 border border-transparent",
      )}
    >
      <Icon
        size={18}
        className={cn(
          "shrink-0",
          isActive
            ? highlight ? "text-indigo-300" : "text-indigo-400"
            : highlight ? "text-indigo-400/70" : "text-zinc-500",
        )}
      />
      {!collapsed && <span>{label}</span>}
    </Link>
  );
}

function SectionLabel({ title, collapsed }: { title: string; collapsed?: boolean }) {
  if (collapsed) return null;
  return (
    <p className="px-3 pt-4 pb-1 text-[10px] font-semibold uppercase tracking-widest text-zinc-600">
      {title}
    </p>
  );
}

function OrgSwitcher({ slug, collapsed }: { slug: string; collapsed?: boolean }) {
  const { organization, organizations, isLoading } = useOrganization();
  const pathname = usePathnameWithLocale();
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const t = useTranslations("sidebar");

  if (isLoading) return null;

  const initials = organization
    ? organization.name.split(" ").map((w) => w[0]).slice(0, 2).join("").toUpperCase()
    : "?";

  const handleSwitch = (newSlug: string) => {
    try { localStorage.setItem(STORAGE_KEY, newSlug); } catch {}
    const segments = pathname.split("/");
    const slugIdx = segments.indexOf(slug);
    const afterSlug = slugIdx !== -1 ? segments.slice(slugIdx + 1).join("/") : "";
    router.push(`/${newSlug}${afterSlug ? `/${afterSlug}` : ""}`);
    setOpen(false);
  };

  const orgListContent = (
    <Command className="bg-transparent">
      {organizations.length > 3 && (
        <CommandInput
          placeholder={t("orgSwitcher.searchPlaceholder")}
          className="border-zinc-800 text-xs text-zinc-200 placeholder:text-zinc-600"
        />
      )}
      <CommandList>
        <CommandEmpty className="py-4 text-xs text-zinc-500">
          {t("orgSwitcher.noResults")}
        </CommandEmpty>
        <CommandGroup>
          {organizations.map((org) => (
            <CommandItem
              key={org.slug}
              value={org.slug}
              onSelect={handleSwitch}
              className="cursor-pointer gap-2 rounded-md px-2 py-1.5 text-xs text-zinc-300 hover:bg-zinc-800 aria-selected:bg-zinc-800"
            >
              <div className="flex h-4 w-4 shrink-0 items-center justify-center rounded bg-zinc-700 text-[8px] font-bold text-zinc-300">
                {org.name.split(" ").map((w) => w[0]).slice(0, 2).join("").toUpperCase()}
              </div>
              <span className="flex-1 truncate">{org.name}</span>
              {org.slug === slug && (
                <IconCheck size={12} className="shrink-0 text-indigo-400" />
              )}
            </CommandItem>
          ))}
        </CommandGroup>
        <CommandSeparator className="bg-zinc-800" />
        <CommandGroup>
          <CommandItem
            onSelect={() => { setOpen(false); router.push("/organizations"); }}
            className="cursor-pointer gap-2 rounded-md px-2 py-1.5 text-xs text-zinc-400 hover:bg-zinc-800 aria-selected:bg-zinc-800"
          >
            <IconBuilding size={12} className="shrink-0" />
            <span>{t("orgSwitcher.manageOrgs")}</span>
          </CommandItem>
          <CommandItem
            onSelect={() => { setOpen(false); router.push("/onboarding?new-org=1"); }}
            className="cursor-pointer gap-2 rounded-md px-2 py-1.5 text-xs text-zinc-400 hover:bg-zinc-800 aria-selected:bg-zinc-800"
          >
            <IconPlus size={12} className="shrink-0" />
            <span>{t("orgSwitcher.newOrg")}</span>
          </CommandItem>
        </CommandGroup>
      </CommandList>
    </Command>
  );

  if (collapsed) {
    return (
      <div className="flex justify-center pt-3 pb-2">
        <Popover open={open} onOpenChange={setOpen}>
          <PopoverTrigger asChild>
            <button
              title={organization?.name ?? t("orgSwitcher.switchOrg")}
              className="flex h-8 w-8 items-center justify-center rounded-lg border border-zinc-700 bg-zinc-900 text-xs font-bold text-zinc-300 hover:border-indigo-500/50 hover:bg-zinc-800 hover:text-indigo-400 transition-colors"
            >
              {initials}
            </button>
          </PopoverTrigger>
          <PopoverContent
            className="w-52 border-zinc-800 bg-zinc-900 p-0 shadow-xl"
            align="start"
            side="right"
            sideOffset={8}
          >
            {orgListContent}
          </PopoverContent>
        </Popover>
      </div>
    );
  }

  return (
    <div className="px-3 pt-3 pb-2">
      <Popover open={open} onOpenChange={setOpen}>
        <PopoverTrigger asChild>
          <button className="flex w-full items-center gap-2 rounded-lg border border-zinc-700 bg-zinc-900 px-2.5 py-2 text-left transition-colors hover:border-zinc-600 hover:bg-zinc-800 focus:outline-none focus:ring-1 focus:ring-indigo-500/30">
            <div className="flex h-5 w-5 shrink-0 items-center justify-center rounded bg-indigo-600/20 text-[9px] font-bold text-indigo-400 ring-1 ring-inset ring-indigo-600/30">
              {initials}
            </div>
            <span className="flex-1 truncate text-xs font-medium text-zinc-200">
              {organization?.name ?? t("orgSwitcher.selectOrg")}
            </span>
            <IconSelector size={12} className="shrink-0 text-zinc-600" />
          </button>
        </PopoverTrigger>
        <PopoverContent
          className="w-52 border-zinc-800 bg-zinc-900 p-0 shadow-xl"
          align="start"
          side="right"
          sideOffset={8}
        >
          {orgListContent}
        </PopoverContent>
      </Popover>
    </div>
  );
}

function SidebarContent({
  slug,
  collapsed,
  onCollapse,
  onClose,
}: {
  slug: string;
  collapsed?: boolean;
  onCollapse?: () => void;
  onClose?: () => void;
}) {
  const { organization } = useOrganization();
  const { data: hasData } = useOrgHasData(organization?.id);
  const { data: billing } = useBilling();
  const t = useTranslations("sidebar");
  const hasAi = billing?.plan.hasAiAnalysis ?? false;
  const sections = buildNavSections(slug, hasData ?? true, hasAi, t);
  const footerNav = buildFooterNav(slug, t);

  const navRef = useRef<HTMLElement>(null);
  const [showScrollFade, setShowScrollFade] = useState(true);

  const checkScroll = useCallback(() => {
    const el = navRef.current;
    if (!el) return;
    const atBottom = el.scrollTop + el.clientHeight >= el.scrollHeight - 8;
    setShowScrollFade(!atBottom);
  }, []);

  useEffect(() => {
    const el = navRef.current;
    if (!el) return;
    checkScroll();
    el.addEventListener("scroll", checkScroll, { passive: true });
    return () => el.removeEventListener("scroll", checkScroll);
  }, [checkScroll]);

  return (
    <div className="flex h-full flex-col bg-zinc-950 border-r border-zinc-800/60">
      <div
        className={cn(
          "flex items-center border-b border-zinc-800/60 h-14",
          collapsed ? "justify-center px-2" : "justify-between px-4",
        )}
      >
        {!collapsed && (
          <div className="flex items-center gap-2.5">
            <GrowareLogo size="sm" />
            {organization && (
              <span className="text-[10px] font-semibold uppercase tracking-widest text-indigo-500">
                {organization.name}
              </span>
            )}
          </div>
        )}
        {collapsed && <GrowareIcon size={28} />}
        {onCollapse && (
          <button
            onClick={onCollapse}
            className="rounded-md p-1 text-zinc-500 hover:bg-zinc-800 hover:text-zinc-100 transition-colors"
          >
            {collapsed ? <IconChevronRight size={16} /> : <IconChevronLeft size={16} />}
          </button>
        )}
        {onClose && (
          <button
            onClick={onClose}
            className="rounded-md p-1 text-zinc-500 hover:bg-zinc-800 hover:text-zinc-100 transition-colors"
          >
            <IconX size={16} />
          </button>
        )}
      </div>

      <OrgSwitcher slug={slug} collapsed={collapsed} />

      <div className="px-3 pb-1">
        <GlobalSearch collapsed={collapsed} />
      </div>

      <div className="relative flex-1 min-h-0">
        <nav ref={navRef} className="h-full space-y-0.5 overflow-y-auto scrollbar-thin px-3 py-1">
          <Suspense>
            {sections.map((section) => (
              <div key={section.title}>
                <SectionLabel title={section.title} collapsed={collapsed} />
                <div className="space-y-0.5">
                  {section.items.map((item) => (
                    <NavItem
                      key={item.href}
                      {...item}
                      collapsed={collapsed}
                      onClick={onClose}
                    />
                  ))}
                </div>
              </div>
            ))}
          </Suspense>
        </nav>

        {showScrollFade && !collapsed && (
          <div className="pointer-events-none absolute bottom-0 left-0 right-0 h-12 flex flex-col items-center justify-end pb-1.5 bg-gradient-to-t from-zinc-950 via-zinc-950/80 to-transparent">
            <IconChevronDown size={13} className="text-indigo-500/60 animate-bounce" />
          </div>
        )}
      </div>

      <SetupChecklist slug={slug} organizationId={organization?.id} collapsed={collapsed} />

      <div
        className={cn(
          "border-t border-zinc-800/60 p-3 space-y-0.5",
          collapsed && "flex flex-col items-center",
        )}
      >
        <Suspense>
          {footerNav.items.map((item) => (
            <NavItem key={item.href} {...item} collapsed={collapsed} onClick={onClose} />
          ))}
        </Suspense>
      </div>
    </div>
  );
}

export function Sidebar({ slug }: { slug: string }) {
  const [collapsed, setCollapsed] = useState(false);
  const [mobileOpen, setMobileOpen] = useState(false);
  const t = useTranslations("sidebar");

  return (
    <>
      <aside
        className={cn(
          "hidden md:flex flex-col h-dvh sticky top-0 transition-all duration-200 shrink-0",
          collapsed ? "w-16" : "w-56",
        )}
      >
        <SidebarContent
          slug={slug}
          collapsed={collapsed}
          onCollapse={() => setCollapsed((v) => !v)}
        />
      </aside>

      <div className="md:hidden fixed top-0 left-0 right-0 z-50 flex items-center justify-between h-14 px-3 bg-zinc-950/95 backdrop-blur-sm border-b border-zinc-800/60">
        <div className="flex items-center gap-2">
          <Sheet open={mobileOpen} onOpenChange={setMobileOpen}>
            <SheetTrigger asChild>
              <Button variant="ghost" size="icon" className="text-zinc-400 h-8 w-8">
                <IconMenu2 size={18} />
              </Button>
            </SheetTrigger>
            <SheetContent side="left" className="p-0 w-56 bg-zinc-950 border-zinc-800 [&>button:last-of-type]:hidden">
              <SheetTitle className="sr-only">{t("mobileMenuTitle")}</SheetTitle>
              <SidebarContent slug={slug} onClose={() => setMobileOpen(false)} />
            </SheetContent>
          </Sheet>
          <GrowareLogo size="sm" />
        </div>
        <MobileTopbarActions />
      </div>
    </>
  );
}
