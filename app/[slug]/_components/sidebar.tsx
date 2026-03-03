"use client";

import Link from "next/link";
import { usePathname, useSearchParams, useRouter } from "next/navigation";
import { useState, Suspense } from "react";
import { signOut } from "next-auth/react";
import {
  IconLayoutDashboard,
  IconBrandGoogle,
  IconCurrencyDollar,
  IconChartBar,
  IconMenu2,
  IconX,
  IconLogout,
  IconChevronLeft,
  IconChevronRight,
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
  IconList,
  IconBug,
} from "@tabler/icons-react";
import { Sheet, SheetContent, SheetTrigger } from "@/components/ui/sheet";
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
import { useOrganization } from "@/components/providers/organization-provider";

const STORAGE_KEY = "growthos_active_org";

interface NavItemDef {
  href: string;
  label: string;
  icon: React.ElementType;
  exact: boolean;
  highlight?: boolean;
}

interface NavSection {
  title: string;
  items: NavItemDef[];
}

function buildNavSections(slug: string): NavSection[] {
  return [
    {
      title: "Visão Geral",
      items: [
        { href: `/${slug}`, label: "Dashboard", icon: IconLayoutDashboard, exact: true },
      ],
    },
    {
      title: "Receita",
      items: [
        { href: `/${slug}/finance`, label: "Financeiro", icon: IconCurrencyDollar, exact: false },
        { href: `/${slug}/costs`, label: "Custos", icon: IconCalculator, exact: false },
        { href: `/${slug}/mrr`, label: "Recorrência", icon: IconRepeat, exact: false },
      ],
    },
    {
      title: "Aquisição",
      items: [
        { href: `/${slug}/channels`, label: "Canais", icon: IconBrandGoogle, exact: false },
        { href: `/${slug}/pages`, label: "Páginas", icon: IconWorldWww, exact: false },
      ],
    },
    {
      title: "Dados",
      items: [
        { href: `/${slug}/events`, label: "Eventos", icon: IconList, exact: true },
        { href: `/${slug}/events/debug`, label: "Debug", icon: IconBug, exact: true },
      ],
    },
    {
      title: "Inteligência",
      items: [
        { href: `/${slug}/ai`, label: "Análise com IA", icon: IconSparkles, exact: false, highlight: true },
      ],
    },
  ];
}

interface FooterNavSection {
  items: NavItemDef[];
}

function buildFooterNav(slug: string): FooterNavSection {
  return {
    items: [
      { href: "/docs", label: "Documentação", icon: IconBook, exact: false },
      { href: `/${slug}/settings`, label: "Configurações", icon: IconSettings, exact: false },
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
  onClick,
}: {
  href: string;
  label: string;
  icon: React.ElementType;
  exact: boolean;
  collapsed?: boolean;
  highlight?: boolean;
  onClick?: () => void;
}) {
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const isActive = exact ? pathname === href : pathname.startsWith(href);

  const forwarded = new URLSearchParams();
  for (const key of DATE_PARAMS) {
    const val = searchParams.get(key);
    if (val) forwarded.set(key, val);
  }
  const qs = forwarded.toString();
  const resolvedHref = qs ? `${href}?${qs}` : href;

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
  const pathname = usePathname();
  const router = useRouter();
  const [open, setOpen] = useState(false);

  if (isLoading) return null;

  const initials = organization
    ? organization.name.split(" ").map((w) => w[0]).slice(0, 2).join("").toUpperCase()
    : "?";

  const handleSwitch = (newSlug: string) => {
    try { localStorage.setItem(STORAGE_KEY, newSlug); } catch {}
    const subPath = pathname.replace(`/${slug}`, "") || "";
    router.push(`/${newSlug}${subPath}`);
    setOpen(false);
  };

  const orgListContent = (
    <Command className="bg-transparent">
      {organizations.length > 3 && (
        <CommandInput
          placeholder="Buscar organização..."
          className="border-zinc-800 text-xs text-zinc-200 placeholder:text-zinc-600"
        />
      )}
      <CommandList>
        <CommandEmpty className="py-4 text-xs text-zinc-500">
          Nenhuma organização encontrada.
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
            <span>Gerenciar organizações</span>
          </CommandItem>
          <CommandItem
            onSelect={() => { setOpen(false); router.push("/onboarding?new-org=1"); }}
            className="cursor-pointer gap-2 rounded-md px-2 py-1.5 text-xs text-zinc-400 hover:bg-zinc-800 aria-selected:bg-zinc-800"
          >
            <IconPlus size={12} className="shrink-0" />
            <span>Nova organização</span>
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
              title={organization?.name ?? "Trocar organização"}
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
              {organization?.name ?? "Selecionar org"}
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
  const sections = buildNavSections(slug);
  const footerNav = buildFooterNav(slug);

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
            <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-indigo-600">
              <IconChartBar size={14} className="text-white" />
            </div>
            <div>
              <span className="text-sm font-bold text-zinc-100">GrowthOS</span>
              {organization && (
                <span className="ml-1.5 text-[10px] font-semibold uppercase tracking-widest text-indigo-500">
                  {organization.name}
                </span>
              )}
            </div>
          </div>
        )}
        {collapsed && (
          <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-indigo-600">
            <IconChartBar size={14} className="text-white" />
          </div>
        )}
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

      <nav className="flex-1 space-y-0.5 overflow-y-auto px-3 py-1">
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
        <button
          onClick={() => signOut({ callbackUrl: "/login" })}
          className={cn(
            "flex items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium text-zinc-500 hover:bg-zinc-800/60 hover:text-zinc-100 transition-all w-full border border-transparent",
            collapsed && "justify-center w-auto",
          )}
        >
          <IconLogout size={18} className="shrink-0" />
          {!collapsed && <span>Sair</span>}
        </button>
      </div>
    </div>
  );
}

export function Sidebar({ slug }: { slug: string }) {
  const [collapsed, setCollapsed] = useState(false);
  const [mobileOpen, setMobileOpen] = useState(false);

  return (
    <>
      <aside
        className={cn(
          "hidden md:flex flex-col h-screen sticky top-0 transition-all duration-200 shrink-0",
          collapsed ? "w-16" : "w-56",
        )}
      >
        <SidebarContent
          slug={slug}
          collapsed={collapsed}
          onCollapse={() => setCollapsed((v) => !v)}
        />
      </aside>

      <div className="md:hidden fixed top-0 left-0 right-0 z-50 flex items-center justify-between h-14 px-4 bg-zinc-950 border-b border-zinc-800/60">
        <div className="flex items-center gap-2.5">
          <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-indigo-600">
            <IconChartBar size={14} className="text-white" />
          </div>
          <span className="text-sm font-bold text-zinc-100">GrowthOS</span>
        </div>
        <Sheet open={mobileOpen} onOpenChange={setMobileOpen}>
          <SheetTrigger asChild>
            <Button variant="ghost" size="icon" className="text-zinc-400">
              <IconMenu2 size={20} />
            </Button>
          </SheetTrigger>
          <SheetContent side="left" className="p-0 w-56 bg-zinc-950 border-zinc-800">
            <SidebarContent slug={slug} onClose={() => setMobileOpen(false)} />
          </SheetContent>
        </Sheet>
      </div>
    </>
  );
}
