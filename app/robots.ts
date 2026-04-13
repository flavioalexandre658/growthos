import type { MetadataRoute } from "next";

export default function robots(): MetadataRoute.Robots {
  return {
    rules: [
      {
        userAgent: "*",
        allow: ["/", "/en/", "/docs", "/en/docs", "/blog", "/en/blog", "/changelog", "/en/changelog", "/terms", "/en/terms", "/privacy", "/en/privacy", "/p/"],
        disallow: ["/api/", "/onboarding", "/en/onboarding", "/organizations", "/en/organizations", "/settings", "/en/settings"],
      },
    ],
    sitemap: "https://groware.io/sitemap.xml",
  };
}
