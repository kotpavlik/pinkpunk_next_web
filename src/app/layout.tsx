import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";
import { durikFont, cabinetGroteskFont, blauerNueFont } from "@/fonts/fonts";
import Header from "@/components/ui/header/Header";
import Footer from "@/components/ui/footer/Footer";
import ImagePreloader from "@/components/ui/ImagePreloader";

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
      <head>
        {/* Preload критически важных изображений */}
        <link rel="preload" as="image" href="/images/about_us_img/owners.jpeg" />
        <link rel="preload" as="image" href="/images/about_us_img/owners_2.jpg" />
        <link rel="preload" as="image" href="/images/about_us_img/owners_3.jpg" />
        <link rel="preload" as="image" href="/images/about_us_img/owners_4.jpg" />
        <link rel="preload" as="image" href="/images/about_us_img/sectionTwo.jpg" />
        <link rel="preload" as="image" href="/images/about_us_img/sectionTwo1.jpg" />
        <link rel="preload" as="image" href="/images/about_us_img/sectionTwo2.jpg" />
        <link rel="preload" as="image" href="/images/about_us_img/sectionTwo3.jpg" />
        <link rel="preload" as="image" href="/images/about_us_img/sectionTwo4.jpg" />
        <link rel="preload" as="image" href="/images/about_us_img/sectionTwo7.jpg" />
        <link rel="preload" as="image" href="/images/about_us_img/sectionTwo8.jpg" />
      </head>
      <body
        className={`${cabinetGroteskFont.variable} ${geistSans.variable} ${geistMono.variable} ${durikFont.variable} ${blauerNueFont.variable}  antialiased`}
      >
        <ImagePreloader />
        <Header />
        {children}
        <Footer />
      </body>
    </html>
  );
}
