import type { MetadataRoute } from "next";
import { getAllSlugs } from "@/utils/blog";

const BASE_URL = "https://groware.io";

function localeUrl(path: string, locale: string): string {
  const prefix = locale === "pt" ? "" : `/${locale}`;
  return `${BASE_URL}${prefix}${path}`;
}

export default function sitemap(): MetadataRoute.Sitemap {
  const now = new Date().toISOString();

  const publicRoutes = [
    { path: "", changeFrequency: "weekly" as const, priority: 1.0 },
    { path: "/blog", changeFrequency: "weekly" as const, priority: 0.9 },
    { path: "/docs", changeFrequency: "weekly" as const, priority: 0.8 },
    { path: "/login", changeFrequency: "monthly" as const, priority: 0.5 },
    { path: "/register", changeFrequency: "monthly" as const, priority: 0.7 },
    { path: "/changelog", changeFrequency: "monthly" as const, priority: 0.6 },
    { path: "/terms", changeFrequency: "yearly" as const, priority: 0.3 },
    { path: "/privacy", changeFrequency: "yearly" as const, priority: 0.3 },
  ];

  const staticEntries = publicRoutes.flatMap(({ path, changeFrequency, priority }) => [
    {
      url: localeUrl(path, "pt"),
      lastModified: now,
      changeFrequency,
      priority,
      alternates: {
        languages: {
          pt: localeUrl(path, "pt"),
          en: localeUrl(path, "en"),
          "x-default": localeUrl(path, "pt"),
        },
      },
    },
    {
      url: localeUrl(path, "en"),
      lastModified: now,
      changeFrequency,
      priority: priority * 0.9,
      alternates: {
        languages: {
          pt: localeUrl(path, "pt"),
          en: localeUrl(path, "en"),
          "x-default": localeUrl(path, "pt"),
        },
      },
    },
  ]);

  const blogSlugs = getAllSlugs();
  const blogEntries = blogSlugs.map(({ slug, locale }) => ({
    url: localeUrl(`/blog/${slug}`, locale),
    lastModified: now,
    changeFrequency: "monthly" as const,
    priority: 0.8,
    alternates: {
      languages: {
        [locale]: localeUrl(`/blog/${slug}`, locale),
      },
    },
  }));

  return [...staticEntries, ...blogEntries];
}
