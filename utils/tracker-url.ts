const VERSION = process.env.NEXT_PUBLIC_TRACKER_VERSION ?? "1";

export function getTrackerSrc(
  baseUrl: string,
  variant: "min" | "full" = "min",
): string {
  const file = variant === "min" ? "tracker.min.js" : "tracker.js";
  return `${baseUrl}/${file}?v=${VERSION}`;
}

export function getTrackerVersion(): string {
  return VERSION;
}
