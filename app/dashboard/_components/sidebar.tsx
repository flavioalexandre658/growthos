"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useState } from "react";
import { signOut } from "next-auth/react";
import {
  IconLayoutDashboard,
  IconTemplate,
  IconBrandGoogle,
  IconCurrencyDollar,
  IconChartBar,
  IconMenu2,
  IconX,
  IconLogout,
  IconChevronLeft,
  IconChevronRight,
} from "@tabler/icons-react";
import { Sheet, SheetContent, SheetTrigger } from "@/components/ui/sheet";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

const navItems = [
  {
    href: "/dashboard",
    label: "Visão Geral",
    icon: IconLayoutDashboard,
    exact: true,
  },
  {
    href: "/dashboard/templates",
    label: "Templates",
    icon: IconTemplate,
    exact: false,
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
];

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
  const isActive = exact ? pathname === href : pathname.startsWith(href);

  return (
    <Link
      href={href}
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

function SidebarContent({
  collapsed,
  onCollapse,
  onClose,
}: {
  collapsed?: boolean;
  onCollapse?: () => void;
  onClose?: () => void;
}) {
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
              <span className="ml-1.5 text-[10px] font-semibold uppercase tracking-widest text-indigo-500">
                Convitede
              </span>
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

      {!collapsed && (
        <div className="px-4 py-2">
          <p className="text-[10px] font-semibold uppercase tracking-widest text-zinc-600">
            Análises
          </p>
        </div>
      )}

      <nav className="flex-1 space-y-1 overflow-y-auto px-3 py-2">
        {navItems.map((item) => (
          <NavItem
            key={item.href}
            {...item}
            collapsed={collapsed}
            onClick={onClose}
          />
        ))}
      </nav>

      <div className={cn("border-t border-zinc-800/60 p-3", collapsed && "flex justify-center")}>
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
      {/* Desktop sidebar */}
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

      {/* Mobile: top bar with hamburger + Sheet drawer */}
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
