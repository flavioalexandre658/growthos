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
import { fmtBRL } from "@/utils/format";

const CHANNEL_COLORS: Record<string, string> = {
  organic_google: "#16a34a",
  direct: "#6b7280",
  social_instagram: "#e11d48",
  social_facebook: "#2563eb",
  paid_google: "#f59e0b",
  social_pinterest: "#dc2626",
  referral: "#8b5cf6",
  social_whatsapp: "#22c55e",
  social_tiktok: "#06b6d4",
};

const CHANNEL_NAMES: Record<string, string> = {
  organic_google: "Google Orgânico",
  direct: "Direto",
  social_instagram: "Instagram",
  social_facebook: "Facebook",
  paid_google: "Google Ads",
  social_pinterest: "Pinterest",
  referral: "Referência",
  social_whatsapp: "WhatsApp",
  social_tiktok: "TikTok",
};

const ADDITIONAL_CHANNEL_NAMES: Record<string, string> = {
  paid_meta: "Meta Ads",
  paid_tiktok: "TikTok Ads",
  email: "E-mail",
  organic_bing: "Bing Orgânico",
};

const ALL_CHANNEL_NAMES = { ...CHANNEL_NAMES, ...ADDITIONAL_CHANNEL_NAMES };

function getChannelColor(channel: string, index: number) {
  const fallbacks = ["#6366f1", "#8b5cf6", "#06b6d4", "#22c55e", "#f59e0b", "#e11d48"];
  return CHANNEL_COLORS[channel] ?? fallbacks[index % fallbacks.length];
}

function getChannelName(channel: string) {
  return ALL_CHANNEL_NAMES[channel] ?? channel;
}

function CustomYAxisTick({ x, y, payload }: { x?: number; y?: number; payload?: { value: string } }) {
  return (
    <text x={x} y={y} dy={4} textAnchor="end" fill="#a1a1aa" fontSize={11}>
      {payload?.value}
    </text>
  );
}

function CustomXAxisTick({ x, y, payload }: { x?: number; y?: number; payload?: { value: string } }) {
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
      <h3 className="text-sm font-bold text-zinc-100">Receita por Canal de Aquisição</h3>
      <p className="mt-0.5 text-xs text-zinc-500">
        De onde vem quem PAGA — requer attribution ativo
      </p>

      <div className="mt-5">
        {isLoading ? (
          <Skeleton className="h-56 w-full rounded-lg bg-zinc-800" />
        ) : chartData.length === 0 ? (
          <div className="flex items-center justify-center h-48 text-zinc-600 text-sm">
            Sem dados de attribution no período
          </div>
        ) : (
          <ResponsiveContainer width="100%" height={Math.max(chartData.length * 44, 200)}>
            <BarChart data={chartData} layout="vertical" barSize={20}>
              <CartesianGrid strokeDasharray="3 3" stroke="#27272a" horizontal={false} />
              <XAxis
                type="number"
                tick={<CustomXAxisTick />}
                axisLine={false}
                tickLine={false}
                tickFormatter={(v) => fmtBRL(v)}
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
                formatter={(v: number) => [fmtBRL(v), "Receita"]}
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
