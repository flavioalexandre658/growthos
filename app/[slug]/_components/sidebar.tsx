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
  IconFile,
  IconCheck,
  IconSelector,
  IconPlus,
  IconRepeat,
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
}

function buildNavItems(slug: string): NavItemDef[] {
  return [
    { href: `/${slug}`, label: "Visão Geral", icon: IconLayoutDashboard, exact: true },
    { href: `/${slug}/mrr`, label: "Recorrência", icon: IconRepeat, exact: false },
    { href: `/${slug}/channels`, label: "Canais", icon: IconBrandGoogle, exact: false },
    { href: `/${slug}/finance`, label: "Financeiro", icon: IconCurrencyDollar, exact: false },
    { href: `/${slug}/landing-pages`, label: "Landing Pages", icon: IconWorldWww, exact: false },
    { href: `/${slug}/pages`, label: "Pages", icon: IconFile, exact: false },
    { href: `/${slug}/costs`, label: "Custos & P&L", icon: IconCalculator, exact: false },
    { href: "/docs", label: "Documentação", icon: IconBook, exact: false },
  ];
}

function buildSettingsItem(slug: string): NavItemDef {
  return { href: `/${slug}/settings`, label: "Configurações", icon: IconSettings, exact: false };
}

const DATE_PARAMS = ["period", "start_date", "end_date"];

function NavItem({
  href,
  label,
  icon: Icon,
  exact,
  collapsed,
  onClick,
}: {
  href: string;
  label: string;
  icon: React.ElementType;
  exact: boolean;
  collapsed?: boolean;
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
        "flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium transition-all duration-150",
        isActive
          ? "bg-indigo-600/20 text-indigo-400 border border-indigo-600/30"
          : "text-zinc-400 hover:bg-zinc-800/60 hover:text-zinc-100 border border-transparent",
      )}
    >
      <Icon
        size={18}
        className={cn(
          "shrink-0",
          isActive ? "text-indigo-400" : "text-zinc-500",
        )}
      />
      {!collapsed && <span>{label}</span>}
    </Link>
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
      <div className="flex justify-center pb-2 pt-1">
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
    <div className="px-3 pb-2">
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
  const navItems = buildNavItems(slug);
  const settingsItem = buildSettingsItem(slug);

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

      {!collapsed && (
        <div className="px-4 py-2">
          <p className="text-[10px] font-semibold uppercase tracking-widest text-zinc-600">
            Análises
          </p>
        </div>
      )}

      <nav className="flex-1 space-y-1 overflow-y-auto px-3 py-2">
        <Suspense>
          {navItems.map((item) => (
            <NavItem
              key={item.href}
              {...item}
              collapsed={collapsed}
              onClick={onClose}
            />
          ))}
        </Suspense>
      </nav>

      <div
        className={cn(
          "border-t border-zinc-800/60 p-3 space-y-1",
          collapsed && "flex flex-col items-center",
        )}
      >
        <Suspense>
          <NavItem {...settingsItem} collapsed={collapsed} onClick={onClose} />
        </Suspense>
        <button
          onClick={() => signOut({ callbackUrl: "/login" })}
          className={cn(
            "flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium text-zinc-500 hover:bg-zinc-800/60 hover:text-zinc-100 transition-all w-full border border-transparent",
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
