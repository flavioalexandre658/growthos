import Link from "next/link";
import { cn } from "@/lib/utils";

interface WelcomeStateProps {
  icon: React.ElementType;
  title: string;
  description: string;
  ctaLabel?: string;
  ctaHref?: string;
  secondaryCtaLabel?: string;
  secondaryCtaHref?: string;
  className?: string;
}

export function WelcomeState({
  icon: Icon,
  title,
  description,
  ctaLabel,
  ctaHref,
  secondaryCtaLabel,
  secondaryCtaHref,
  className,
}: WelcomeStateProps) {
  return (
    <div
      className={cn(
        "flex flex-col items-center justify-center gap-4 rounded-2xl border border-zinc-800/60 bg-zinc-900/30 px-6 py-12 text-center",
        className,
      )}
    >
      <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-zinc-800/60 ring-1 ring-inset ring-zinc-700/40">
        <Icon size={22} className="text-zinc-400" />
      </div>
      <div className="space-y-1.5 max-w-sm">
        <p className="text-sm font-semibold text-zinc-200">{title}</p>
        <p className="text-xs text-zinc-500 leading-relaxed">{description}</p>
      </div>
      {(ctaLabel && ctaHref) && (
        <div className="flex flex-col sm:flex-row items-center gap-2">
          <Link
            href={ctaHref}
            className="inline-flex items-center gap-1.5 rounded-lg bg-indigo-600/20 px-4 py-2 text-xs font-semibold text-indigo-300 ring-1 ring-inset ring-indigo-600/30 hover:bg-indigo-600/30 transition-colors"
          >
            {ctaLabel}
          </Link>
          {secondaryCtaLabel && secondaryCtaHref && (
            <Link
              href={secondaryCtaHref}
              className="inline-flex items-center gap-1.5 rounded-lg bg-zinc-800/60 px-4 py-2 text-xs font-semibold text-zinc-400 ring-1 ring-inset ring-zinc-700/40 hover:bg-zinc-800 hover:text-zinc-200 transition-colors"
            >
              {secondaryCtaLabel}
            </Link>
          )}
        </div>
      )}
    </div>
  );
}

interface InlineBannerProps {
  description: string;
  ctaLabel: string;
  ctaHref: string;
  className?: string;
}

export function InlineBanner({ description, ctaLabel, ctaHref, className }: InlineBannerProps) {
  return (
    <div
      className={cn(
        "flex items-center gap-3 rounded-lg border border-amber-500/20 bg-amber-500/5 px-4 py-3",
        className,
      )}
    >
      <p className="flex-1 text-xs text-amber-400/80 leading-relaxed">{description}</p>
      <Link
        href={ctaHref}
        className="shrink-0 text-xs font-semibold text-amber-400 hover:text-amber-300 transition-colors underline-offset-2 hover:underline"
      >
        {ctaLabel}
      </Link>
    </div>
  );
}
