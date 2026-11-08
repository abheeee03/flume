import type { Metadata } from "next";
import { Geist, Geist_Mono, Inter } from "next/font/google";
import { Providers } from "@/app/providers";
import { GlazePortalProvider } from "@/lib/glaze/portal";
import "@/components/glaze/styles.css";
import "./globals.css";

const geistSans = Geist({
  subsets: ["latin"],
  variable: "--font-geist-sans",
});

const geistMono = Geist_Mono({
  subsets: ["latin"],
  variable: "--font-geist-mono",
});

const inter = Inter();

export const metadata: Metadata = {
  title: "Flume",
  description: "Capital, constantly optimized. The yield router for Solana.",
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html lang="en" data-theme="dark" className={`${inter.className}`}>
      <body className="glaze min-h-dvh bg-page text-text-1">
        <GlazePortalProvider>
          <Providers>{children}</Providers>
        </GlazePortalProvider>
      </body>
    </html>
  );
}
