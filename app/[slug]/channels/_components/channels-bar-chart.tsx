"use client";

import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Cell,
} from "recharts";
import { IChannelData } from "@/interfaces/dashboard.interface";
import { Skeleton } from "@/components/ui/skeleton";
import { fmtBRLDecimal } from "@/utils/format";

const CHANNEL_COLORS: Record<string, string> = {
  direct: "#6b7280",
  google_organic: "#16a34a",
  google_paid: "#f59e0b",
  facebook_organic: "#3b82f6",
  facebook_paid: "#1d4ed8",
  instagram_organic: "#e11d48",
  instagram_paid: "#be123c",
  tiktok_organic: "#06b6d4",
  tiktok_paid: "#0891b2",
  twitter_organic: "#38bdf8",
  twitter_paid: "#0284c7",
  linkedin_organic: "#2563eb",
  linkedin_paid: "#1e40af",
  youtube_organic: "#ef4444",
  youtube_paid: "#dc2626",
  bing_organic: "#0ea5e9",
  bing_paid: "#f97316",
  pinterest_organic: "#dc2626",
  pinterest_paid: "#b91c1c",
  whatsapp_organic: "#22c55e",
  email_organic: "#a855f7",
  telegram_organic: "#0ea5e9",
};

const CHANNEL_NAMES: Record<string, string> = {
  direct: "Direto",
  google_organic: "Google Orgânico",
  google_paid: "Google Ads",
  facebook_organic: "Facebook",
  facebook_paid: "Facebook Ads",
  instagram_organic: "Instagram",
  instagram_paid: "Instagram Ads",
  tiktok_organic: "TikTok",
  tiktok_paid: "TikTok Ads",
  twitter_organic: "Twitter/X",
  twitter_paid: "Twitter/X Ads",
  linkedin_organic: "LinkedIn",
  linkedin_paid: "LinkedIn Ads",
  youtube_organic: "YouTube",
  youtube_paid: "YouTube Ads",
  bing_organic: "Bing Orgânico",
  bing_paid: "Bing Ads",
  pinterest_organic: "Pinterest",
  pinterest_paid: "Pinterest Ads",
  whatsapp_organic: "WhatsApp",
  email_organic: "E-mail",
  telegram_organic: "Telegram",
  yahoo_organic: "Yahoo",
  duckduckgo_organic: "DuckDuckGo",
};

function formatChannelKey(channel: string): string {
  const parts = channel.split("_");
  const suffix = parts[parts.length - 1];
  const source = parts.slice(0, -1).join("_");
  if (suffix === "paid") return `${source.charAt(0).toUpperCase()}${source.slice(1)} Ads`;
  if (suffix === "organic") return `${source.charAt(0).toUpperCase()}${source.slice(1)}`;
  return channel.charAt(0).toUpperCase() + channel.slice(1);
}

function getChannelColor(channel: string, index: number) {
  const fallbacks = [
    "#6366f1",
    "#8b5cf6",
    "#06b6d4",
    "#22c55e",
    "#f59e0b",
    "#e11d48",
  ];
  return CHANNEL_COLORS[channel] ?? fallbacks[index % fallbacks.length];
}

function getChannelName(channel: string) {
  return CHANNEL_NAMES[channel] ?? formatChannelKey(channel);
}

function CustomYAxisTick({
  x,
  y,
  payload,
}: {
  x?: number;
  y?: number;
  payload?: { value: string };
}) {
  return (
    <text x={x} y={y} dy={4} textAnchor="end" fill="#a1a1aa" fontSize={11}>
      {payload?.value}
    </text>
  );
}

function CustomXAxisTick({
  x,
  y,
  payload,
}: {
  x?: number;
  y?: number;
  payload?: { value: string };
}) {
  return (
    <text x={x} y={y} dy={12} textAnchor="middle" fill="#52525b" fontSize={10}>
      {payload?.value}
    </text>
  );
}

interface ChannelsBarChartProps {
  data: IChannelData[] | undefined;
  isLoading: boolean;
}

export function ChannelsBarChart({ data, isLoading }: ChannelsBarChartProps) {
  const chartData = [...(data ?? [])]
    .sort((a, b) => b.revenue - a.revenue)
    .map((d) => ({
      ...d,
      name: getChannelName(d.channel),
      color: getChannelColor(d.channel, 0),
    }));

  return (
    <div className="rounded-xl border border-zinc-800 bg-zinc-900/50 p-5">
      <h3 className="text-sm font-bold text-zinc-100">
        Receita por Canal de Aquisição
      </h3>
      <p className="mt-0.5 text-xs text-zinc-500">
        De onde vem quem PAGA, requer attribution ativo
      </p>

      <div className="mt-5">
        {isLoading ? (
          <Skeleton className="h-56 w-full rounded-lg bg-zinc-800" />
        ) : chartData.length === 0 ? (
          <div className="flex items-center justify-center h-48 text-zinc-600 text-sm">
            Sem dados de attribution no período
          </div>
        ) : (
          <ResponsiveContainer
            width="100%"
            height={Math.max(chartData.length * 44, 200)}
          >
            <BarChart data={chartData} layout="vertical" barSize={20}>
              <CartesianGrid
                strokeDasharray="3 3"
                stroke="#27272a"
                horizontal={false}
              />
              <XAxis
                type="number"
                tick={<CustomXAxisTick />}
                axisLine={false}
                tickLine={false}
                tickFormatter={(v) => fmtBRLDecimal(v / 100)}
              />
              <YAxis
                type="category"
                dataKey="name"
                width={120}
                tick={<CustomYAxisTick />}
                axisLine={false}
                tickLine={false}
              />
              <Tooltip
                contentStyle={{
                  background: "#18181b",
                  border: "1px solid #3f3f46",
                  borderRadius: 8,
                  fontSize: 12,
                  color: "#e4e4e7",
                }}
                labelStyle={{ color: "#a1a1aa" }}
                itemStyle={{ color: "#e4e4e7" }}
                formatter={(v: number) => [fmtBRLDecimal(v / 100), "Receita"]}
                cursor={{ fill: "#ffffff08" }}
              />
              <Bar dataKey="revenue" radius={[0, 6, 6, 0]}>
                {chartData.map((c, i) => (
                  <Cell key={i} fill={getChannelColor(c.channel, i)} />
                ))}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        )}
      </div>
    </div>
  );
}

export { getChannelName, getChannelColor };
