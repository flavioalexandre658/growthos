import type { Metadata } from "next";
import { Geist, Geist_Mono, Bricolage_Grotesque } from "next/font/google";
import { NextIntlClientProvider } from "next-intl";
import { getMessages, getTranslations } from "next-intl/server";
import { SessionProvider } from "@/components/providers/session-provider";
import { QueryProvider } from "@/components/providers/query-provider";
import { OrganizationProvider } from "@/components/providers/organization-provider";
import { ToasterProvider } from "@/components/providers/toaster-provider";
import { SensitiveModeProvider } from "@/components/providers/sensitive-mode-provider";
import { GoogleTagManager, GoogleTagManagerNoScript } from "@/components/tracking/google-tag-manager";
import { routing } from "../../i18n/routing";
import { notFound } from "next/navigation";
import { getTrackerSrc } from "@/utils/tracker-url";

const geistSans = Geist({
  variable: "--font-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-mono",
  subsets: ["latin"],
});

const bricolageGrotesque = Bricolage_Grotesque({
  variable: "--font-display",
  subsets: ["latin"],
  weight: ["400", "500", "600", "700", "800"],
});

type Props = {
  children: React.ReactNode;
  params: Promise<{ locale: string }>;
};

export async function generateStaticParams() {
  return routing.locales.map((locale) => ({ locale }));
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { locale } = await params;
  const t = await getTranslations({ locale, namespace: "metadata" });

  const isPt = locale === "pt";
  const baseUrl = "https://groware.io";
  const canonicalUrl = isPt ? baseUrl : `${baseUrl}/en`;

  return {
    title: {
      template: "%s | Groware",
      default: t("defaultTitle"),
    },
    description: t("defaultDescription"),
    metadataBase: new URL(baseUrl),
    alternates: {
      canonical: canonicalUrl,
      languages: {
        pt: baseUrl,
        en: `${baseUrl}/en`,
        "x-default": baseUrl,
      },
    },
    keywords: isPt
      ? ["analytics", "receita", "MRR", "P&L", "dashboard", "SaaS", "infoprodutos", "e-commerce", "Stripe", "Kiwify", "Hotmart", "Asaas", "PayPal", "gateway", "métricas", "churn", "LTV", "CAC", "ROI"]
      : ["analytics", "revenue", "MRR", "P&L", "dashboard", "SaaS", "digital products", "e-commerce", "Stripe", "Kiwify", "Hotmart", "Asaas", "PayPal", "gateway", "metrics", "churn", "LTV", "CAC", "ROI"],
    openGraph: {
      title: t("ogTitle"),
      description: t("ogDescription"),
      url: canonicalUrl,
      siteName: "Groware",
      locale: t("ogLocale"),
      type: "website",
      images: [
        {
          url: isPt
            ? "/assets/images/social-preview-br.png"
            : "/assets/images/social-preview-en.png",
          width: 1200,
          height: 630,
          alt: t("ogTitle"),
        },
      ],
    },
    twitter: {
      card: "summary_large_image",
      title: t("ogTitle"),
      description: t("ogDescription"),
      creator: "@flaviobuilds",
      images: [
        isPt
          ? "/assets/images/social-preview-br.png"
          : "/assets/images/social-preview-en.png",
      ],
    },
    robots: {
      index: true,
      follow: true,
      googleBot: {
        index: true,
        follow: true,
        "max-image-preview": "large",
        "max-snippet": -1,
        "max-video-preview": -1,
      },
    },
  };
}

export default async function LocaleLayout({ children, params }: Props) {
  const { locale } = await params;

  if (!routing.locales.includes(locale as (typeof routing.locales)[number])) {
    notFound();
  }

  const messages = await getMessages();

  return (
    <html
      lang={locale}
      className="dark"
      suppressHydrationWarning
    >
      <head>
        <script
          async
          src={getTrackerSrc("https://groware.io")}
          data-key={process.env.NEXT_PUBLIC_GROWARE_KEY}
        />
      </head>
      <body
        className={`${geistSans.variable} ${geistMono.variable} ${bricolageGrotesque.variable} font-sans antialiased`}
      >
        <GoogleTagManagerNoScript />
        <NextIntlClientProvider messages={messages}>
          <SessionProvider>
            <QueryProvider>
              <OrganizationProvider>
                <SensitiveModeProvider>
                  {children}
                  <ToasterProvider />
                  <GoogleTagManager />
                </SensitiveModeProvider>
              </OrganizationProvider>
            </QueryProvider>
          </SessionProvider>
        </NextIntlClientProvider>
      </body>
    </html>
  );
}
