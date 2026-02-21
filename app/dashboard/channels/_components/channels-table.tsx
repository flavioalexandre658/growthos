"use client";

import { IChannelData } from "@/interfaces/dashboard.interface";
import { ResponsiveTable, TableColumn } from "@/components/ui/responsive-table";
import { cn } from "@/lib/utils";
import { getChannelName, getChannelColor } from "./channels-bar-chart";

function conversionColor(value: string) {
  const n = parseFloat(value);
  if (n >= 30) return "text-emerald-400";
  if (n >= 20) return "text-amber-400";
  return "text-red-400";
}

type ChannelRow = IChannelData & { colorIndex: number };

interface ChannelsTableProps {
  data: IChannelData[] | undefined;
  isLoading: boolean;
}

export function ChannelsTable({ data, isLoading }: ChannelsTableProps) {
  const sorted: ChannelRow[] = [...(data ?? [])]
    .sort((a, b) => b.revenue - a.revenue)
    .map((c, i) => ({ ...c, colorIndex: i }));

  const columns: TableColumn<ChannelRow>[] = [
    {
      key: "channel",
      header: "Canal",
      mobilePrimary: true,
      render: (c) => (
        <div className="flex items-center gap-2.5">
          <div
            className="h-2.5 w-2.5 rounded-full shrink-0"
            style={{ background: getChannelColor(c.channel, c.colorIndex) }}
          />
          <span className="font-semibold text-sm text-zinc-200">
            {getChannelName(c.channel)}
          </span>
        </div>
      ),
    },
    {
      key: "edits",
      header: "Edições",
      align: "right",
      render: (c) => (
        <span className="font-mono text-sm text-zinc-400">{c.edits}</span>
      ),
    },
    {
      key: "payments",
      header: "Pagamentos",
      align: "right",
      render: (c) => (
        <span className="font-mono text-sm font-semibold text-emerald-400">
          {c.payments}
        </span>
      ),
    },
    {
      key: "conversion_rate",
      header: "Conversão",
      align: "right",
      render: (c) => (
        <span
          className={cn(
            "font-mono text-sm font-semibold",
            conversionColor(String(c.conversion_rate))
          )}
        >
          {c.conversion_rate}%
        </span>
      ),
    },
    {
      key: "revenue",
      header: "Receita",
      align: "right",
      render: (c) => (
        <span className="font-mono text-sm font-bold text-emerald-400">
          R$ {Number(c.revenue).toFixed(0)}
        </span>
      ),
    },
    {
      key: "ticket_medio",
      header: "Ticket Médio",
      align: "right",
      render: (c) => (
        <span className="font-mono text-sm text-zinc-300">
          R$ {Number(c.ticket_medio).toFixed(2)}
        </span>
      ),
    },
  ];

  return (
    <ResponsiveTable
      columns={columns}
      data={sorted}
      getRowKey={(c) => c.channel}
      isLoading={isLoading}
      initialPageSize={10}
      emptyMessage="Sem dados de attribution no período"
      header={
        <div>
          <h3 className="text-sm font-bold text-zinc-100">
            Detalhamento por Canal
          </h3>
          <p className="mt-0.5 text-xs text-zinc-500">
            Conversão e ticket médio por canal
          </p>
        </div>
      }
    />
  );
}
