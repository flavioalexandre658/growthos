import {
  IconInfoCircle,
  IconAlertTriangle,
  IconBulb,
} from "@tabler/icons-react";
import { cn } from "@/lib/utils";

type CalloutType = "info" | "warn" | "tip";

interface CalloutProps {
  type?: CalloutType;
  children: React.ReactNode;
}

const calloutConfig: Record<
  CalloutType,
  { icon: React.ElementType; className: string; iconClassName: string }
> = {
  info: {
    icon: IconInfoCircle,
    className: "bg-blue-500/5 border-blue-500/20 text-blue-300",
    iconClassName: "text-blue-400 shrink-0 mt-0.5",
  },
  warn: {
    icon: IconAlertTriangle,
    className: "bg-yellow-500/5 border-yellow-500/20 text-yellow-300",
    iconClassName: "text-yellow-400 shrink-0 mt-0.5",
  },
  tip: {
    icon: IconBulb,
    className: "bg-green-500/5 border-green-500/20 text-green-300",
    iconClassName: "text-green-400 shrink-0 mt-0.5",
  },
};

export function Callout({ type = "info", children }: CalloutProps) {
  const config = calloutConfig[type];
  const Icon = config.icon;

  return (
    <div
      className={cn(
        "flex gap-3 rounded-lg border px-4 py-3 text-sm leading-relaxed my-4",
        config.className,
      )}
    >
      <Icon className={cn("h-4 w-4", config.iconClassName)} />
      <div>{children}</div>
    </div>
  );
}
