export const dynamic = "force-dynamic";

import { redirect } from "next/navigation";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth-options";
import { LandingPage } from "./_components/landing-page";

export default async function HomePage() {
  const session = await getServerSession(authOptions);

  if (session?.user) {
    redirect("/organizations");
  }

  const jsonLd = [
    {
      "@context": "https://schema.org",
      "@type": "Organization",
      name: "Groware",
      url: "https://groware.io",
      logo: "https://groware.io/assets/images/logo-256.png",
      sameAs: ["https://twitter.com/flaviobuilds"],
    },
    {
      "@context": "https://schema.org",
      "@type": "WebSite",
      name: "Groware",
      url: "https://groware.io",
      potentialAction: {
        "@type": "SearchAction",
        target: "https://groware.io/pt/blog?q={search_term_string}",
        "query-input": "required name=search_term_string",
      },
    },
    {
      "@context": "https://schema.org",
      "@type": "SoftwareApplication",
      name: "Groware",
      applicationCategory: "BusinessApplication",
      operatingSystem: "Web",
      offers: {
        "@type": "Offer",
        price: "0",
        priceCurrency: "USD",
      },
    },
  ];

  return (
    <>
      {jsonLd.map((schema, i) => (
        <script
          key={i}
          type="application/ld+json"
          dangerouslySetInnerHTML={{ __html: JSON.stringify(schema) }}
        />
      ))}
      <LandingPage />
    </>
  );
}
