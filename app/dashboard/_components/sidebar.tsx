"use client";

import Link from "next/link";
import { usePathname, useSearchParams } from "next/navigation";
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
} from "@tabler/icons-react";
import { Sheet, SheetContent, SheetTrigger } from "@/components/ui/sheet";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { useOrganization } from "@/components/providers/organization-provider";

interface NavItemDef {
  href: string;
  label: string;
  icon: React.ElementType;
  exact: boolean;
}

const NAV_ITEMS: NavItemDef[] = [
  {
    href: "/dashboard",
    label: "Visão Geral",
    icon: IconLayoutDashboard,
    exact: true,
  },
  {
    href: "/dashboard/channels",
    label: "Canais",
    icon: IconBrandGoogle,
    exact: false,
  },
  {
    href: "/dashboard/finance",
    label: "Financeiro",
    icon: IconCurrencyDollar,
    exact: false,
  },
  {
    href: "/dashboard/landing-pages",
    label: "Landing Pages",
    icon: IconWorldWww,
    exact: false,
  },
  {
    href: "/dashboard/costs",
    label: "Custos & P&L",
    icon: IconCalculator,
    exact: false,
  },
];

const SETTINGS_ITEM: NavItemDef = {
  href: "/dashboard/settings",
  label: "Configurações",
  icon: IconSettings,
  exact: false,
};

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
          : "text-zinc-400 hover:bg-zinc-800/60 hover:text-zinc-100 border border-transparent"
      )}
    >
      <Icon
        size={18}
        className={cn(
          "shrink-0",
          isActive ? "text-indigo-400" : "text-zinc-500"
        )}
      />
      {!collapsed && <span>{label}</span>}
    </Link>
  );
}

function OrgSwitcher({ collapsed }: { collapsed?: boolean }) {
  const { organization, organizations, switchOrganization, isLoading } = useOrganization();

  if (isLoading || organizations.length <= 1) return null;

  return (
    <div className={cn("px-3 pb-2", collapsed && "px-2")}>
      {!collapsed ? (
        <select
          value={organization?.slug ?? ""}
          onChange={(e) => switchOrganization(e.target.value)}
          className="w-full rounded-lg border border-zinc-700 bg-zinc-900 px-2.5 py-2 text-xs text-zinc-200 focus:border-indigo-500 focus:outline-none focus:ring-1 focus:ring-indigo-500/30"
        >
          {organizations.map((org) => (
            <option key={org.slug} value={org.slug}>
              {org.name}
            </option>
          ))}
        </select>
      ) : (
        <button
          title={organization?.name ?? "Org"}
          className="flex h-7 w-7 items-center justify-center rounded-lg border border-zinc-700 bg-zinc-900 text-zinc-400 hover:text-zinc-100 transition-colors"
        >
          <IconBuilding size={14} />
        </button>
      )}
    </div>
  );
}

function SidebarContent({
  collapsed,
  onCollapse,
  onClose,
}: {
  collapsed?: boolean;
  onCollapse?: () => void;
  onClose?: () => void;
}) {
  const { organization } = useOrganization();

  return (
    <div className="flex h-full flex-col bg-zinc-950 border-r border-zinc-800/60">
      <div
        className={cn(
          "flex items-center border-b border-zinc-800/60 h-14",
          collapsed ? "justify-center px-2" : "justify-between px-4"
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
            {collapsed ? (
              <IconChevronRight size={16} />
            ) : (
              <IconChevronLeft size={16} />
            )}
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

      <OrgSwitcher collapsed={collapsed} />

      {!collapsed && (
        <div className="px-4 py-2">
          <p className="text-[10px] font-semibold uppercase tracking-widest text-zinc-600">
            Análises
          </p>
        </div>
      )}

      <nav className="flex-1 space-y-1 overflow-y-auto px-3 py-2">
        <Suspense>
          {NAV_ITEMS.map((item) => (
            <NavItem
              key={item.href}
              {...item}
              collapsed={collapsed}
              onClick={onClose}
            />
          ))}
        </Suspense>
      </nav>

      <div className={cn("border-t border-zinc-800/60 p-3 space-y-1", collapsed && "flex flex-col items-center")}>
        <Suspense>
          <NavItem
            {...SETTINGS_ITEM}
            collapsed={collapsed}
            onClick={onClose}
          />
        </Suspense>
        <button
          onClick={() => signOut({ callbackUrl: "/login" })}
          className={cn(
            "flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium text-zinc-500 hover:bg-zinc-800/60 hover:text-zinc-100 transition-all w-full border border-transparent",
            collapsed && "justify-center w-auto"
          )}
        >
          <IconLogout size={18} className="shrink-0" />
          {!collapsed && <span>Sair</span>}
        </button>
      </div>
    </div>
  );
}

export function Sidebar() {
  const [collapsed, setCollapsed] = useState(false);
  const [mobileOpen, setMobileOpen] = useState(false);

  return (
    <>
      <aside
        className={cn(
          "hidden md:flex flex-col h-screen sticky top-0 transition-all duration-200 shrink-0",
          collapsed ? "w-16" : "w-56"
        )}
      >
        <SidebarContent
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
            <SidebarContent onClose={() => setMobileOpen(false)} />
          </SheetContent>
        </Sheet>
      </div>
    </>
  );
}
