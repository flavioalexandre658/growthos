import { IconChartBar, IconRosetteDiscountCheck } from "@tabler/icons-react";
import dayjs from "dayjs";
import "dayjs/locale/pt-br";
import type { IPublicOrgData } from "@/interfaces/public-page.interface";

interface PublicHeaderProps {
  org: IPublicOrgData;
  month: string;
}

function formatSince(createdAt: string): string | null {
  const d = dayjs(createdAt).locale("pt-br");
  if (!d.isValid() || d.isAfter(dayjs())) return null;
  return `desde ${d.format("MMM [de] YYYY")}`;
}

export function PublicHeader({ org, month }: PublicHeaderProps) {
  const since = formatSince(org.createdAt);

  return (
    <header className="flex items-start justify-between gap-3 flex-wrap">
      <div className="flex items-start gap-3">
        <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-gradient-to-br from-indigo-600 to-indigo-700 shadow-lg shadow-indigo-500/10 shrink-0 mt-0.5">
          <IconChartBar size={17} className="text-white" />
        </div>
        <div className="space-y-0.5">
          <div className="flex items-center gap-2 flex-wrap">
            <h1 className="text-base font-bold text-zinc-100 tracking-tight leading-tight">
              {org.name}
            </h1>
            {org.verified && (
              <span className="flex items-center gap-1 text-[10px] font-semibold text-emerald-400/90 bg-emerald-900/15 border border-emerald-800/25 px-1.5 py-0.5 rounded-md">
                <IconRosetteDiscountCheck size={10} />
                Stripe
              </span>
            )}
          </div>
          {org.description && (
            <p className="text-[12px] text-zinc-500 leading-snug">
              {org.description}
              {since && <span className="text-zinc-700"> · {since}</span>}
            </p>
          )}
          {!org.description && since && (
            <p className="text-[11px] text-zinc-700 font-mono">{since}</p>
          )}
        </div>
      </div>

      <div className="flex items-center gap-2 shrink-0">
        <span className="text-[10px] font-medium text-zinc-600 bg-zinc-900/80 border border-zinc-800/60 px-2 py-1 rounded-md">
          {month}
        </span>
        <span className="flex items-center gap-1.5 text-[10px] font-semibold text-emerald-400/80 bg-emerald-900/10 border border-emerald-800/25 px-2.5 py-1 rounded-lg">
          <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse shrink-0" />
          Building in public
        </span>
      </div>
    </header>
  );
}
