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
  title: "Groware, Convitede",
  description: "Painel de Growth & Analytics da Convitede",
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
