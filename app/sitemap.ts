import type { MetadataRoute } from "next";
import { getAllSlugs } from "@/utils/blog";

const BASE_URL = "https://groware.io";

export default function sitemap(): MetadataRoute.Sitemap {
  const now = new Date().toISOString();

  const publicRoutes = [
    { path: "/", changeFrequency: "weekly" as const, priority: 1.0 },
    { path: "/blog", changeFrequency: "weekly" as const, priority: 0.9 },
    { path: "/login", changeFrequency: "monthly" as const, priority: 0.5 },
    { path: "/register", changeFrequency: "monthly" as const, priority: 0.7 },
    { path: "/terms", changeFrequency: "yearly" as const, priority: 0.3 },
    { path: "/privacy", changeFrequency: "yearly" as const, priority: 0.3 },
    { path: "/changelog", changeFrequency: "weekly" as const, priority: 0.6 },
    { path: "/docs", changeFrequency: "weekly" as const, priority: 0.8 },
  ];

  const staticEntries = publicRoutes.map(({ path, changeFrequency, priority }) => ({
    url: `${BASE_URL}${path}`,
    lastModified: now,
    changeFrequency,
    priority,
    alternates: {
      languages: {
        pt: `${BASE_URL}${path}`,
        en: `${BASE_URL}/en${path === "/" ? "" : path}`,
      },
    },
  }));

  const blogSlugs = getAllSlugs();
  const blogEntries = blogSlugs.map(({ slug, locale }) => ({
    url: `${BASE_URL}/${locale}/blog/${slug}`,
    lastModified: now,
    changeFrequency: "monthly" as const,
    priority: 0.8,
    alternates: {
      languages: {
        [locale]: `${BASE_URL}/${locale}/blog/${slug}`,
      },
    },
  }));

  return [...staticEntries, ...blogEntries];
}
