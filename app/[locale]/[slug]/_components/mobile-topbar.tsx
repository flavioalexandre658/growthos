"use client";

import { useState } from "react";
import { useTranslations } from "next-intl";
import { IconMenu2 } from "@tabler/icons-react";
import { GrowareLogo } from "@/components/groware-logo";
import { Sheet, SheetContent, SheetTitle, SheetTrigger } from "@/components/ui/sheet";
import { Button } from "@/components/ui/button";
import { SidebarContent } from "./sidebar";
import { MobileTopbarActions } from "./topbar";

export function MobileTopbar({ slug }: { slug: string }) {
  const [mobileOpen, setMobileOpen] = useState(false);
  const t = useTranslations("sidebar");

  return (
    <div className="md:hidden flex items-center justify-between h-14 px-3 bg-zinc-950/95 backdrop-blur-sm border-b border-zinc-800/60 shrink-0">
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
  );
}
