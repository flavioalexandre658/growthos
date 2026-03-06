import type { Metadata } from "next";
import { Geist, Geist_Mono, Bricolage_Grotesque } from "next/font/google";
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

const bricolageGrotesque = Bricolage_Grotesque({
  variable: "--font-display",
  subsets: ["latin"],
  weight: ["400", "500", "600", "700", "800"],
});

export const metadata: Metadata = {
  title: {
    template: "%s | Groware",
    default: "Groware — Analytics de crescimento para SaaS",
  },
  description:
    "Receita, MRR, canais de aquisição e P&L em um único dashboard. Integra Stripe, Asaas, Kiwify e Hotmart. Feito para founders de SaaS.",
  metadataBase: new URL("https://groware.io"),

  icons: {
    icon: "/icon",
    apple: "/apple-icon",
  },

  openGraph: {
    title: "Groware — Analytics de crescimento para SaaS",
    description:
      "Receita, MRR, canais de aquisição e P&L em um único dashboard. Integra Stripe, Asaas, Kiwify e Hotmart.",
    url: "https://groware.io",
    siteName: "Groware",
    locale: "pt_BR",
    type: "website",
    images: [
      {
        url: "/assets/images/social-preview-br.png",
        width: 1200,
        height: 630,
        alt: "Groware — Analytics de crescimento para SaaS",
      },
    ],
  },

  twitter: {
    card: "summary_large_image",
    title: "Groware — Analytics de crescimento para SaaS",
    description:
      "Receita, MRR, canais de aquisição e P&L em um único dashboard. Integra Stripe, Asaas, Kiwify e Hotmart.",
    creator: "@flaviobuilds",
    images: ["/assets/images/social-preview-br.png"],
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
        className={`${geistSans.variable} ${geistMono.variable} ${bricolageGrotesque.variable} font-sans antialiased`}
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
