import { getRequestConfig } from "next-intl/server";
import { hasLocale } from "next-intl";
import { routing } from "./routing";

const MESSAGE_FILES = [
  "common",
  "common-ui",
  "auth",
  "landing",
  "legal",
  "metadata",
  "sidebar",
  "dashboard",
  "organizations",
  "settings",
  "finance",
  "events",
  "mrr",
  "ai",
  "channels",
  "pages",
  "onboarding",
  "subscriptions",
] as const;

export default getRequestConfig(async ({ requestLocale }) => {
  const requested = await requestLocale;
  const locale = hasLocale(routing.locales, requested)
    ? requested
    : routing.defaultLocale;

  const modules = await Promise.all(
    MESSAGE_FILES.map((f) => import(`../messages/${locale}/${f}.json`))
  );

  const messages: Record<string, unknown> = {};
  for (const mod of modules) {
    Object.assign(messages, mod.default);
  }

  return { locale, messages };
});
