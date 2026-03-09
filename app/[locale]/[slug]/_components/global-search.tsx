"use client";

import { useState, useEffect, useCallback, useRef } from "react";
import { useRouter } from "next/navigation";
import { useTranslations } from "next-intl";
import { useOrganization } from "@/components/providers/organization-provider";
import { getCustomers } from "@/actions/customers/get-customers.action";
import {
  CommandDialog,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from "@/components/ui/command";
import { IconUsers, IconUser, IconSearch } from "@tabler/icons-react";
import { cn } from "@/lib/utils";
import type { ICustomer } from "@/interfaces/customer.interface";

interface GlobalSearchProps {
  collapsed?: boolean;
}

export function GlobalSearch({ collapsed }: GlobalSearchProps) {
  const t = useTranslations("sidebar.globalSearch");
  const router = useRouter();
  const { organization } = useOrganization();
  const orgId = organization?.id ?? "";
  const slug = organization?.slug ?? "";

  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<ICustomer[]>([]);
  const [isLoading, setIsLoading] = useState(false);

  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    const down = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key === "k") {
        e.preventDefault();
        setOpen((o) => !o);
      }
    };
    document.addEventListener("keydown", down);
    return () => document.removeEventListener("keydown", down);
  }, []);

  const search = useCallback(
    async (value: string) => {
      if (!orgId || !value.trim()) {
        setResults([]);
        return;
      }
      setIsLoading(true);
      try {
        const result = await getCustomers(orgId, { search: value, limit: 8 });
        setResults(result?.data ?? []);
      } finally {
        setIsLoading(false);
      }
    },
    [orgId]
  );

  const handleValueChange = useCallback(
    (value: string) => {
      setQuery(value);
      if (debounceRef.current) clearTimeout(debounceRef.current);
      debounceRef.current = setTimeout(() => search(value), 300);
    },
    [search]
  );

  const handleSelect = useCallback(
    (customerId: string) => {
      setOpen(false);
      setQuery("");
      setResults([]);
      router.push(`/${slug}/customers/${customerId}`);
    },
    [router, slug]
  );

  const handleOpenChange = (o: boolean) => {
    setOpen(o);
    if (!o) {
      setQuery("");
      setResults([]);
    }
  };

  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        className={cn(
          "flex items-center gap-2 rounded-lg px-3 py-2 text-sm font-medium transition-all duration-150 w-full border border-transparent text-zinc-500 hover:bg-zinc-800/60 hover:text-zinc-100",
          collapsed && "justify-center px-2"
        )}
        title={collapsed ? t("trigger") : undefined}
      >
        <IconSearch size={18} className="shrink-0 text-zinc-500" />
        {!collapsed && (
          <>
            <span className="flex-1 text-left">{t("trigger")}</span>
            <kbd className="pointer-events-none hidden h-5 select-none items-center gap-1 rounded border border-zinc-700 bg-zinc-800 px-1.5 font-mono text-[10px] font-medium text-zinc-400 opacity-100 sm:flex">
              {t("shortcut")}
            </kbd>
          </>
        )}
      </button>

      <CommandDialog open={open} onOpenChange={handleOpenChange} shouldFilter={false}>
        <CommandInput
          placeholder={t("placeholder")}
          value={query}
          onValueChange={handleValueChange}
          className="border-none focus:ring-0"
        />
        <CommandList>
          {isLoading ? (
            <div className="py-6 text-center text-sm text-zinc-500">Buscando...</div>
          ) : query.trim() && results.length === 0 ? (
            <CommandEmpty>{t("noResults")}</CommandEmpty>
          ) : results.length > 0 ? (
            <CommandGroup heading={t("customers")}>
              {results.map((customer) => (
                <CommandItem
                  key={customer.customerId}
                  value={customer.customerId}
                  onSelect={() => handleSelect(customer.customerId)}
                  className="flex items-center gap-3 cursor-pointer"
                >
                  <div className={cn(
                    "h-7 w-7 rounded-full flex items-center justify-center shrink-0 text-xs font-semibold",
                    customer.name ? "bg-violet-500/15 text-violet-400" : "bg-zinc-800 text-zinc-500"
                  )}>
                    {customer.name ? customer.name.charAt(0).toUpperCase() : <IconUser size={13} />}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium truncate">
                      {customer.name ?? customer.email ?? customer.customerId}
                    </p>
                    {(customer.name || customer.email) && (
                      <p className="text-xs text-zinc-500 truncate">
                        {customer.name && customer.email
                          ? customer.email
                          : customer.customerId.slice(0, 24) + "…"}
                      </p>
                    )}
                  </div>
                  <IconUsers size={13} className="text-zinc-600 shrink-0" />
                </CommandItem>
              ))}
            </CommandGroup>
          ) : null}
        </CommandList>
      </CommandDialog>
    </>
  );
}
