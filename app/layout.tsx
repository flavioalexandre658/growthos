import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import { Toaster } from "react-hot-toast";
import { SessionProvider } from "@/components/providers/session-provider";
import { QueryProvider } from "@/components/providers/query-provider";
import { OrganizationProvider } from "@/components/providers/organization-provider";
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
  title: "GrowthOS — Convitede",
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
              <Toaster
                position="top-right"
                toastOptions={{
                  style: {
                    background: "#18181b",
                    color: "#e4e4e7",
                    border: "1px solid #27272a",
                    borderRadius: "8px",
                    fontSize: "13px",
                  },
                  success: {
                    iconTheme: {
                      primary: "#22c55e",
                      secondary: "#18181b",
                    },
                  },
                  error: {
                    iconTheme: {
                      primary: "#ef4444",
                      secondary: "#18181b",
                    },
                  },
                }}
              />
            </OrganizationProvider>
          </QueryProvider>
        </SessionProvider>
      </body>
    </html>
  );
}
