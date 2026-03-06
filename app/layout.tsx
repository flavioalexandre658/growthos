import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import { SessionProvider } from "@/components/providers/session-provider";
import { QueryProvider } from "@/components/providers/query-provider";
import { OrganizationProvider } from "@/components/providers/organization-provider";
import { ToasterProvider } from "@/components/providers/toaster-provider";
import "./globals.css";

const geistSans = Geist({
  variable: "--font-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: {
    template: "%s | Groware",
    default: "Groware — Growth Analytics para SaaS brasileiro",
  },
  description:
    "Receita, MRR, canais de aquisição e P&L em um dashboard. Integra Stripe, Asaas, Kiwify e Hotmart. Feito para founders de SaaS no Brasil.",
  metadataBase: new URL("https://groware.io"),

  openGraph: {
    title: "Groware — Growth Analytics para SaaS brasileiro",
    description:
      "Receita, MRR, canais de aquisição e P&L em um dashboard. Integra Stripe, Asaas, Kiwify e Hotmart.",
    url: "https://groware.io",
    siteName: "Groware",
    locale: "pt_BR",
    type: "website",
    images: [
      {
        url: "/og-image.png",
        width: 1200,
        height: 630,
        alt: "Groware — Growth Analytics para SaaS brasileiro",
      },
    ],
  },

  twitter: {
    card: "summary_large_image",
    title: "Groware — Growth Analytics para SaaS brasileiro",
    description:
      "Receita, MRR, canais de aquisição e P&L em um dashboard. Integra Stripe, Asaas, Kiwify e Hotmart.",
    creator: "@flaviobuilds",
    images: ["/og-image.png"],
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

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="pt-BR" className="dark">
      <body
        className={`${geistSans.variable} ${geistMono.variable} font-sans antialiased`}
      >
        <SessionProvider>
          <QueryProvider>
            <OrganizationProvider>
              {children}
              <ToasterProvider />
            </OrganizationProvider>
          </QueryProvider>
        </SessionProvider>
      </body>
    </html>
  );
}
