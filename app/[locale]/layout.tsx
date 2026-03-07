import type { Metadata } from "next";
import { Geist, Geist_Mono, Bricolage_Grotesque } from "next/font/google";
import { NextIntlClientProvider } from "next-intl";
import { getMessages, getTranslations } from "next-intl/server";
import { SessionProvider } from "@/components/providers/session-provider";
import { QueryProvider } from "@/components/providers/query-provider";
import { OrganizationProvider } from "@/components/providers/organization-provider";
import { ToasterProvider } from "@/components/providers/toaster-provider";
import { routing } from "../../i18n/routing";
import { notFound } from "next/navigation";

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

  return {
    title: {
      template: "%s | Groware",
      default: t("defaultTitle"),
    },
    description: t("defaultDescription"),
    metadataBase: new URL("https://groware.io"),
    openGraph: {
      title: t("ogTitle"),
      description: t("ogDescription"),
      url: "https://groware.io",
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
      <body
        className={`${geistSans.variable} ${geistMono.variable} ${bricolageGrotesque.variable} font-sans antialiased`}
      >
        <NextIntlClientProvider messages={messages}>
          <SessionProvider>
            <QueryProvider>
              <OrganizationProvider>
                {children}
                <ToasterProvider />
              </OrganizationProvider>
            </QueryProvider>
          </SessionProvider>
        </NextIntlClientProvider>
      </body>
    </html>
  );
}
