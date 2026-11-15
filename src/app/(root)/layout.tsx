import type { Metadata } from "next";
import { Geist, Geist_Mono, Inter } from "next/font/google";

import "@/styles/globals.css";

import { cn } from "@/lib/utils";
import { Providers } from "@/providers";

const inter = Inter({ subsets: ["latin"], variable: "--font-sans" });
const interHeading = Inter({ subsets: ["latin"], variable: "--font-heading" });
const geistSans = Geist({ variable: "--font-geist-sans", subsets: ["latin"] });
const geistMono = Geist_Mono({ variable: "--font-geist-mono", subsets: ["latin"] });

export const metadata: Metadata = {
  title: "Chart AI",
  description: "Chat with your spreadsheet",
  applicationName: "Chart AI",
  icons: {
    icon: [
      { url: "/favicon.ico", sizes: "any" },
      { url: "/favicon.svg", type: "image/svg+xml" },
      { url: "/favicon-96x96.png", type: "image/png", sizes: "96x96" },
    ],
    shortcut: "/favicon.ico",
    apple: [{ url: "/apple-touch-icon.png", type: "image/png", sizes: "180x180" }],
  },
  manifest: "/site.webmanifest",
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html
      lang="en"
      className={cn(
        "h-full antialiased",
        geistSans.variable,
        geistMono.variable,
        inter.variable,
        interHeading.variable,
        "font-sans",
      )}
      suppressHydrationWarning
    >
      <body className="h-full">
        <Providers>{children}</Providers>
      </body>
    </html>
  );
}