"use client";

import { useRouter } from "next/navigation";
import { useLocale } from "next-intl";
import { useOrganization } from "@/components/providers/organization-provider";
import {
  IconWorld,
  IconBrandGoogle,
  IconBrandFacebook,
  IconBrandInstagram,
  IconBrandTiktok,
  IconBrandX,
  IconBrandLinkedin,
  IconBrandYoutube,
  IconBrandPinterest,
  IconBrandWhatsapp,
  IconMail,
  IconBrandTelegram,
  IconBrandReddit,
  IconBrandThreads,
  IconBrandSnapchat,
  IconSearch,
  IconRobot,
  IconAd2,
  IconLink,
} from "@tabler/icons-react";
import { getChannelColor, getChannelName, deriveChannel } from "@/utils/channel-colors";
import { cn } from "@/lib/utils";
import type { ComponentType } from "react";

interface IconProps {
  size?: number;
  className?: string;
  style?: React.CSSProperties;
}

const SOURCE_ICONS: Record<string, ComponentType<IconProps>> = {
  direct: IconLink,
  google: IconBrandGoogle,
  facebook: IconBrandFacebook,
  instagram: IconBrandInstagram,
  tiktok: IconBrandTiktok,
  twitter: IconBrandX,
  linkedin: IconBrandLinkedin,
  youtube: IconBrandYoutube,
  pinterest: IconBrandPinterest,
  whatsapp: IconBrandWhatsapp,
  email: IconMail,
  telegram: IconBrandTelegram,
  reddit: IconBrandReddit,
  threads: IconBrandThreads,
  snapchat: IconBrandSnapchat,
  bing: IconSearch,
  yahoo: IconSearch,
  duckduckgo: IconSearch,
  brave: IconSearch,
  chatgpt: IconRobot,
  perplexity: IconRobot,
  gemini: IconRobot,
  claude: IconRobot,
  copilot: IconRobot,
  deepseek: IconRobot,
  bluesky: IconWorld,
};

function getSourceFromChannel(channel: string): string {
  if (channel === "direct") return "direct";
  const parts = channel.split("_");
  const suffix = parts[parts.length - 1];
  if (suffix === "paid" || suffix === "organic") {
    return parts.slice(0, -1).join("_");
  }
  return channel;
}

function getChannelIcon(channel: string): ComponentType<IconProps> {
  const source = getSourceFromChannel(channel);
  return SOURCE_ICONS[source] ?? (channel.endsWith("_paid") ? IconAd2 : IconLink);
}

interface ChannelBadgeProps {
  source?: string | null;
  medium?: string | null;
  channel?: string | null;
  size?: "xs" | "sm";
  className?: string;
  linkToChannel?: boolean;
}

export function ChannelBadge({
  source,
  medium,
  channel: channelProp,
  size = "sm",
  className,
  linkToChannel = true,
}: ChannelBadgeProps) {
  const locale = useLocale();
  const router = useRouter();
  const { organization } = useOrganization();
  const slug = organization?.slug ?? "";

  const channel = channelProp ?? deriveChannel(source ?? null, medium ?? null);
  if (!channel) return <span className="text-xs text-zinc-700">—</span>;

  const color = getChannelColor(channel, 0);
  const name = getChannelName(channel, locale);
  const Icon = getChannelIcon(channel);

  const iconSize = size === "xs" ? 11 : 13;
  const textClass = size === "xs" ? "text-[10px]" : "text-xs";

  const handleClick = linkToChannel && slug
    ? (e: React.MouseEvent) => {
        e.preventDefault();
        e.stopPropagation();
        router.push(`/${slug}/channels?search=${encodeURIComponent(name)}`);
      }
    : undefined;

  return (
    <span
      role={handleClick ? "link" : undefined}
      tabIndex={handleClick ? 0 : undefined}
      onClick={handleClick}
      title={handleClick ? name : undefined}
      className={cn(
        "inline-flex items-center gap-1.5 rounded-md px-1.5 py-0.5 transition-colors",
        handleClick && "hover:bg-zinc-800/60 cursor-pointer",
        className
      )}
    >
      <Icon size={iconSize} style={{ color }} className="shrink-0" />
      <span className={cn(textClass, "font-medium truncate")} style={{ color }}>
        {name}
      </span>
    </span>
  );
}
