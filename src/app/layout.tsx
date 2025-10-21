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
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
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
