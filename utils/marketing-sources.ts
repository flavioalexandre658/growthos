import { CHANNEL_NAMES, CHANNEL_NAMES_EN } from "./channel-colors";

export const SOURCE_GROUPS: Record<
  string,
  { sources: string[]; label: string; labelEn: string }
> = {
  meta: {
    sources: ["facebook", "instagram"],
    label: "Meta Ads",
    labelEn: "Meta Ads",
  },
};

export interface IMarketingSourceOption {
  source: string;
  channelKeys: string[];
  label: string;
  labelEn: string;
  isGroup: boolean;
}

const grouped = new Set(
  Object.values(SOURCE_GROUPS).flatMap((g) => g.sources)
);

const individualOptions: IMarketingSourceOption[] = Object.keys(CHANNEL_NAMES)
  .filter((k) => k.endsWith("_paid") && !grouped.has(k.replace(/_paid$/, "")))
  .map((k) => ({
    source: k.replace(/_paid$/, ""),
    channelKeys: [k],
    label: CHANNEL_NAMES[k],
    labelEn: CHANNEL_NAMES_EN[k] ?? CHANNEL_NAMES[k],
    isGroup: false,
  }));

const groupOptions: IMarketingSourceOption[] = Object.entries(SOURCE_GROUPS).map(
  ([source, cfg]) => ({
    source,
    channelKeys: cfg.sources.map((s) => `${s}_paid`),
    label: cfg.label,
    labelEn: cfg.labelEn,
    isGroup: true,
  })
);

export const MARKETING_SOURCE_OPTIONS: IMarketingSourceOption[] = [
  ...individualOptions,
  ...groupOptions,
].sort((a, b) => a.label.localeCompare(b.label));

export function getSourceForChannelKey(channelKey: string): string | null {
  if (!channelKey.endsWith("_paid")) return null;
  const raw = channelKey.replace(/_paid$/, "");
  for (const [groupSource, cfg] of Object.entries(SOURCE_GROUPS)) {
    if (cfg.sources.includes(raw)) return groupSource;
  }
  return raw;
}

export function getChannelKeysForSource(source: string): string[] {
  const group = SOURCE_GROUPS[source];
  if (group) return group.sources.map((s) => `${s}_paid`);
  return [`${source}_paid`];
}

export function isGroupedSource(source: string): boolean {
  return source in SOURCE_GROUPS;
}

export function getMarketingSourceLabel(source: string, locale?: string): string {
  const opt = MARKETING_SOURCE_OPTIONS.find((o) => o.source === source);
  if (!opt) return source;
  return locale === "en" ? opt.labelEn : opt.label;
}
