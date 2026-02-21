"use client";

import { useRouter, usePathname, useSearchParams } from "next/navigation";
import { useCallback } from "react";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { DashboardPeriod } from "@/interfaces/dashboard.interface";

const periodOptions: { value: DashboardPeriod; label: string }[] = [
  { value: "today", label: "Hoje" },
  { value: "7d", label: "7 dias" },
  { value: "30d", label: "30 dias" },
  { value: "90d", label: "90 dias" },
];

interface PeriodFilterProps {
  period: DashboardPeriod;
}

export function PeriodFilter({ period }: PeriodFilterProps) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();

  const handleChange = useCallback(
    (value: string) => {
      const params = new URLSearchParams(searchParams.toString());
      params.set("period", value);
      router.push(`${pathname}?${params.toString()}`);
    },
    [router, pathname, searchParams]
  );

  return (
    <Select value={period} onValueChange={handleChange}>
      <SelectTrigger className="w-32 bg-zinc-900 border-zinc-700 text-zinc-200 text-sm h-8">
        <SelectValue />
      </SelectTrigger>
      <SelectContent className="bg-zinc-900 border-zinc-700">
        {periodOptions.map((opt) => (
          <SelectItem
            key={opt.value}
            value={opt.value}
            className="text-zinc-200 focus:bg-zinc-800 focus:text-zinc-100"
          >
            {opt.label}
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  );
}
