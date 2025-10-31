import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";
import { durikFont, cabinetGroteskFont, blauerNueFont } from "@/fonts/fonts";
import Header from "@/components/ui/header/Header";
import Footer from "@/components/ui/footer/Footer";

// CabinetGrotesk - основной шрифт для латиницы

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "Pink Punk",
  description: "Pink Punk - Your Next Generation Web Experience",
  icons: {
    icon: [
      { url: "/favicon/favicon-96x96.png", sizes: "96x96", type: "image/png" },
    ],
    apple: [
      { url: "/favicon/apple-touch-icon.png", sizes: "180x180", type: "image/png" },
    ],
  },
  manifest: "/favicon/site.webmanifest",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <head>
        {/* iOS Safari viewport fixes */}
        <meta name="viewport" content="width=device-width, initial-scale=1.0, maximum-scale=1.0, user-scalable=no, viewport-fit=cover" />
        <meta name="format-detection" content="telephone=no" />
        <meta name="apple-mobile-web-app-capable" content="yes" />
        <meta name="apple-mobile-web-app-status-bar-style" content="black-translucent" />
        <link rel="apple-touch-icon" href="/favicon/apple-touch-icon.png" />
      </head>
      <body
        className={`${cabinetGroteskFont.variable} ${geistSans.variable} ${geistMono.variable} ${durikFont.variable} ${blauerNueFont.variable} antialiased`}
      >

        <Header />
        {children}
        <Footer />
      </body>
    </html>
  );
}
