export const CHANNEL_COLORS: Record<string, string> = {
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
  chatgpt_organic: "#10a37f",
  perplexity_organic: "#20b2aa",
  gemini_organic: "#886efe",
  claude_organic: "#d97706",
  copilot_organic: "#0078d4",
  reddit_organic: "#ff4500",
  threads_organic: "#000000",
  bluesky_organic: "#0085ff",
  snapchat_organic: "#fffc00",
  snapchat_paid: "#f5c518",
  deepseek_organic: "#4d6bfe",
  brave_organic: "#fb542b",
};

export const CHANNEL_NAMES: Record<string, string> = {
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
  chatgpt_organic: "ChatGPT",
  perplexity_organic: "Perplexity",
  gemini_organic: "Gemini",
  claude_organic: "Claude",
  copilot_organic: "Copilot",
  reddit_organic: "Reddit",
  threads_organic: "Threads",
  bluesky_organic: "Bluesky",
  snapchat_organic: "Snapchat",
  snapchat_paid: "Snapchat Ads",
  deepseek_organic: "DeepSeek",
  brave_organic: "Brave Search",
};

export const CHANNEL_NAMES_EN: Record<string, string> = {
  direct: "Direct",
  google_organic: "Google Organic",
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
  bing_organic: "Bing Organic",
  bing_paid: "Bing Ads",
  pinterest_organic: "Pinterest",
  pinterest_paid: "Pinterest Ads",
  whatsapp_organic: "WhatsApp",
  email_organic: "Email",
  telegram_organic: "Telegram",
  yahoo_organic: "Yahoo",
  duckduckgo_organic: "DuckDuckGo",
  chatgpt_organic: "ChatGPT",
  perplexity_organic: "Perplexity",
  gemini_organic: "Gemini",
  claude_organic: "Claude",
  copilot_organic: "Copilot",
  reddit_organic: "Reddit",
  threads_organic: "Threads",
  bluesky_organic: "Bluesky",
  snapchat_organic: "Snapchat",
  snapchat_paid: "Snapchat Ads",
  deepseek_organic: "DeepSeek",
  brave_organic: "Brave Search",
};

const COLOR_FALLBACKS = [
  "#6366f1",
  "#8b5cf6",
  "#06b6d4",
  "#22c55e",
  "#f59e0b",
  "#e11d48",
];

function formatChannelKey(channel: string): string {
  const parts = channel.split("_");
  const suffix = parts[parts.length - 1];
  const source = parts.slice(0, -1).join("_");
  if (suffix === "paid") return `${source.charAt(0).toUpperCase()}${source.slice(1)} Ads`;
  if (suffix === "organic") return `${source.charAt(0).toUpperCase()}${source.slice(1)}`;
  return channel.charAt(0).toUpperCase() + channel.slice(1);
}

export function getChannelColor(channel: string, index: number): string {
  return CHANNEL_COLORS[channel] ?? COLOR_FALLBACKS[index % COLOR_FALLBACKS.length];
}

export function getChannelName(channel: string, locale?: string): string {
  const map = locale === "en" ? CHANNEL_NAMES_EN : CHANNEL_NAMES;
  return map[channel] ?? formatChannelKey(channel);
}

const PAID_MEDIUMS = new Set(["cpc", "ppc", "paid", "ads", "paid_social", "display", "cpv", "cpm"]);

export function deriveChannel(source: string | null, medium: string | null): string | null {
  if (!source) return null;
  const s = source.toLowerCase();
  const m = (medium ?? "").toLowerCase();
  if (s === "direct" && (m === "direct" || m === "(none)" || !m)) return "direct";
  if (PAID_MEDIUMS.has(m)) return `${s}_paid`;
  return `${s}_organic`;
}
