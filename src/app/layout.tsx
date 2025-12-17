import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";
import { durikFont, cabinetGroteskFont, blauerNueFont } from "@/fonts/fonts";
import Header from "@/components/ui/header/Header";
import ConditionalFooter from "@/components/ui/footer/ConditionalFooter";
import TokenEventHandler from "@/components/ui/shared/TokenEventHandler";

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
  title: {
    default: "Pink Punk - Оверсайз Одежда | Доставка по России: Москва, СПб, Екатеринбург, Ростов-на-Дону",
    template: "%s | Pink Punk - Оверсайз Одежда с доставкой по России"
  },
  description: "Pink Punk - белорусский бренд оверсайз одежды для парней и девушек. Унисекс вещи, которые подходят всем. Доставка по России: Москва, Санкт-Петербург, Екатеринбург, Ростов-на-Дону и другие города. Оверсайз одежда с доставкой по всей России. Уникальные дизайны, высокое качество, стиль для всех.",
  keywords: [
    // Основные ключевые слова
    "оверсайз одежда беларусь",
    "оверсайз вещи минск",
    "белорусская одежда оверсайз",
    "унисекс одежда беларусь",
    "оверсайз для парней и девушек",
    "белорусский бренд одежды",
    "одежда оверсайз минск",
    "оверсайз одежда унисекс",
    "oversize одежда беларусь",
    "белорусская мода оверсайз",
    // Российские регионы - Москва
    "оверсайз одежда москва",
    "oversize одежда москва",
    "унисекс одежда москва",
    "оверсайз одежда с доставкой в москву",
    "купить оверсайз одежду москва",
    // Санкт-Петербург
    "оверсайз одежда санкт-петербург",
    "оверсайз одежда спб",
    "oversize одежда санкт-петербург",
    "унисекс одежда спб",
    "оверсайз одежда с доставкой в спб",
    "купить оверсайз одежду санкт-петербург",
    // Екатеринбург
    "оверсайз одежда екатеринбург",
    "oversize одежда екатеринбург",
    "унисекс одежда екатеринбург",
    "оверсайз одежда с доставкой в екатеринбург",
    "купить оверсайз одежду екатеринбург",
    // Ростов-на-Дону
    "оверсайз одежда ростов-на-дону",
    "оверсайз одежда ростов",
    "oversize одежда ростов-на-дону",
    "унисекс одежда ростов",
    "оверсайз одежда с доставкой в ростов-на-дону",
    "купить оверсайз одежду ростов",
    // Общие по России
    "оверсайз одежда россия",
    "oversize одежда россия",
    "унисекс одежда россия",
    "оверсайз одежда с доставкой по россии",
    "купить оверсайз одежду россия",
    "доставка оверсайз одежды по россии",
    // Дополнительные
    "оверсайз пальто",
    "черный худи",
    "спортивные штаны",
    "оверсайз одежда для парней и девушек",
    "Pink Punk",
    "оверсайз",
    "унисекс",
    "одежда беларусь",
    "модная одежда",
    "стильная одежда",
    "oversize",
    "белорусский бренд",
    "одежда для всех",
    "оверсайз вещи",
    "унисекс вещи"
  ],
  authors: [{ name: "Pink Punk", url: "https://pinkpunk.by" }],
  creator: "Pink Punk",
  publisher: "Pink Punk",
  applicationName: "Pink Punk",
  category: "Fashion, Clothing, E-commerce",
  classification: "Белорусский бренд оверсайз одежды унисекс",
  formatDetection: {
    email: false,
    address: false,
    telephone: false,
  },
  icons: {
    icon: [
      { url: "/favicon.ico", sizes: "any" },
      { url: "/favicon/favicon.svg", type: "image/svg+xml" },
      { url: "/favicon/favicon-96x96.png", sizes: "96x96", type: "image/png" },
      { url: "/favicon/web-app-manifest-192x192.png", sizes: "192x192", type: "image/png" },
      { url: "/favicon/web-app-manifest-512x512.png", sizes: "512x512", type: "image/png" },
    ],
    apple: [
      { url: "/favicon/apple-touch-icon.png", sizes: "180x180", type: "image/png" },
    ],
    shortcut: ["/favicon.ico"],
  },
  manifest: "/favicon/site.webmanifest",
  metadataBase: new URL(process.env.NEXT_PUBLIC_SITE_URL || 'https://pinkpunk.by'),
  alternates: {
    canonical: "/",
    languages: {
      'ru-BY': 'https://pinkpunk.by',
      'ru-RU': 'https://pinkpunk.by',
      'be-BY': 'https://pinkpunk.by',
    },
  },
  openGraph: {
    type: "website",
    locale: "ru_RU",
    alternateLocale: ["ru_BY", "be_BY"],
    url: "/",
    title: "Pink Punk - Оверсайз Одежда Беларусь | Унисекс Одежда Минск",
    description: "Белорусский бренд оверсайз одежды для парней и девушек. Унисекс вещи, которые подходят всем. Доставка по России: Москва, Санкт-Петербург, Екатеринбург, Ростов-на-Дону и другие города. Оверсайз одежда с доставкой по всей России.",
    siteName: "Pink Punk",
    images: [
      {
        url: "/favicon/web-app-manifest-512x512.png",
        width: 512,
        height: 512,
        alt: "Pink Punk - Белорусский бренд оверсайз одежды",
        type: "image/png",
      },
    ],
  },
  twitter: {
    card: "summary_large_image",
    title: "Pink Punk - Оверсайз Одежда Беларусь | Унисекс",
    description: "Белорусский бренд оверсайз одежды для парней и девушек. Унисекс вещи, которые подходят всем.",
    images: ["/favicon/web-app-manifest-512x512.png"],
    creator: "@pinkpunk",
    site: "@pinkpunk",
  },
  robots: {
    index: true,
    follow: true,
    nocache: false,
    googleBot: {
      index: true,
      follow: true,
      noimageindex: false,
      'max-video-preview': -1,
      'max-image-preview': 'large',
      'max-snippet': -1,
    },
  },
  verification: {
    // Добавьте сюда коды верификации от Google Search Console когда получите
    // google: 'your-google-verification-code',
    // yandex: 'your-yandex-verification-code',
  },
  other: {
    'geo.region': 'BY-RU',
    'geo.placename': 'Минск, Москва, Санкт-Петербург, Екатеринбург, Ростов-на-Дону',
    'geo.position': '53.9045;27.5615',
    'ICBM': '53.9045, 27.5615',
    'distribution': 'RU, BY',
    'target': 'RU, BY',
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="ru-BY">
      <head>
        {/* Primary Meta Tags */}
        <meta name="viewport" content="width=device-width, initial-scale=1.0, maximum-scale=1.0, user-scalable=no, viewport-fit=cover" />
        <meta name="theme-color" content="#444444" />
        <meta name="color-scheme" content="dark light" />

        {/* Favicon - Multiple formats for better compatibility */}
        <link rel="icon" href="/favicon.ico" sizes="any" />
        <link rel="icon" href="/favicon/favicon.svg" type="image/svg+xml" />
        <link rel="icon" href="/favicon/favicon-96x96.png" sizes="96x96" type="image/png" />
        <link rel="icon" href="/favicon/web-app-manifest-192x192.png" sizes="192x192" type="image/png" />
        <link rel="icon" href="/favicon/web-app-manifest-512x512.png" sizes="512x512" type="image/png" />
        <link rel="apple-touch-icon" href="/favicon/apple-touch-icon.png" sizes="180x180" />

        {/* iOS Safari fixes */}
        <meta name="format-detection" content="telephone=no" />
        <meta name="mobile-web-app-capable" content="yes" />
        <meta name="apple-mobile-web-app-capable" content="yes" />
        <meta name="apple-mobile-web-app-status-bar-style" content="black-translucent" />
        <meta name="apple-mobile-web-app-title" content="Pink Punk" />

        {/* Preconnect to external domains for performance */}
        <link rel="preconnect" href="https://pinkpunknestbot-production.up.railway.app" />
        <link rel="dns-prefetch" href="https://pinkpunknestbot-production.up.railway.app" />

        {/* Hreflang для локализации */}
        <link rel="alternate" hrefLang="ru-BY" href="https://pinkpunk.by" />
        <link rel="alternate" hrefLang="ru-RU" href="https://pinkpunk.by" />
        <link rel="alternate" hrefLang="be-BY" href="https://pinkpunk.by" />
        <link rel="alternate" hrefLang="x-default" href="https://pinkpunk.by" />

        {/* Canonical URL */}
        <link rel="canonical" href="https://pinkpunk.by" />

        {/* Yandex метатеги для лучшей индексации в России */}
        <meta name="yandex-verification" content="" />
        <meta name="yandex" content="index, follow" />
        <meta name="geo.region" content="RU-BY" />
        <meta name="geo.placename" content="Москва, Санкт-Петербург, Екатеринбург, Ростов-на-Дону, Минск" />
        <meta name="geo.position" content="55.7558;37.6173" />
        <meta name="ICBM" content="55.7558, 37.6173" />
        <meta name="language" content="ru-RU" />
        <meta name="distribution" content="RU, BY" />
        <meta name="target" content="RU, BY" />
        {/* Региональные метатеги для Yandex */}
        <meta name="yandex-city" content="Москва, Санкт-Петербург, Екатеринбург, Ростов-на-Дону" />
        <meta name="yandex-region" content="RU" />

        {/* Structured Data - Organization Schema */}
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{
            __html: JSON.stringify({
              "@context": "https://schema.org",
              "@type": "Organization",
              "name": "Pink Punk",
              "alternateName": "Pink Punk - Оверсайз Одежда с доставкой по России",
              "url": "https://pinkpunk.by",
              "logo": "https://pinkpunk.by/favicon/web-app-manifest-512x512.png",
              "description": "Белорусский бренд оверсайз одежды для парней и девушек. Унисекс вещи, которые подходят всем. Доставка по России: Москва, Санкт-Петербург, Екатеринбург, Ростов-на-Дону и другие города.",
              "address": {
                "@type": "PostalAddress",
                "addressCountry": "BY",
                "addressLocality": "Минск",
                "addressRegion": "Минская область"
              },
              "contactPoint": {
                "@type": "ContactPoint",
                "contactType": "Customer Service",
                "availableLanguage": ["Russian", "Belarusian"],
              "areaServed": [
                {
                  "@type": "Country",
                  "name": "Russia"
                },
                {
                  "@type": "Country",
                  "name": "Belarus"
                },
                {
                  "@type": "City",
                  "name": "Москва"
                },
                {
                  "@type": "City",
                  "name": "Санкт-Петербург"
                },
                {
                  "@type": "City",
                  "name": "Екатеринбург"
                },
                {
                  "@type": "City",
                  "name": "Ростов-на-Дону"
                }
              ]
              },
              "sameAs": [
                // Добавьте ссылки на соцсети когда будут
                // "https://instagram.com/pinkpunk",
                // "https://vk.com/pinkpunk",
                // "https://t.me/pinkpunk"
              ],
              "areaServed": [
                {
                  "@type": "Country",
                  "name": "Belarus"
                },
                {
                  "@type": "Country",
                  "name": "Russia"
                },
                {
                  "@type": "City",
                  "name": "Москва"
                },
                {
                  "@type": "City",
                  "name": "Санкт-Петербург"
                },
                {
                  "@type": "City",
                  "name": "Екатеринбург"
                },
                {
                  "@type": "City",
                  "name": "Ростов-на-Дону"
                }
              ],
              "brand": {
                "@type": "Brand",
                "name": "Pink Punk"
              }
            })
          }}
        />

        {/* Structured Data - WebSite Schema */}
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{
            __html: JSON.stringify({
              "@context": "https://schema.org",
              "@type": "WebSite",
              "name": "Pink Punk",
              "alternateName": "Pink Punk - Оверсайз Одежда с доставкой по России",
              "url": "https://pinkpunk.by",
              "description": "Белорусский бренд оверсайз одежды для парней и девушек. Унисекс вещи, которые подходят всем. Доставка по России: Москва, Санкт-Петербург, Екатеринбург, Ростов-на-Дону и другие города.",
              "inLanguage": ["ru-RU", "ru-BY", "be-BY"],
              "potentialAction": {
                "@type": "SearchAction",
                "target": {
                  "@type": "EntryPoint",
                  "urlTemplate": "https://pinkpunk.by/catalog?search={search_term_string}"
                },
                "query-input": "required name=search_term_string"
              }
            })
          }}
        />

        {/* Structured Data - Store Schema */}
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{
            __html: JSON.stringify({
              "@context": "https://schema.org",
              "@type": "Store",
              "name": "Pink Punk",
              "image": "https://pinkpunk.by/favicon/web-app-manifest-512x512.png",
              "description": "Онлайн-магазин оверсайз одежды. Белорусский бренд унисекс одежды для парней и девушек. Доставка по России: Москва, Санкт-Петербург, Екатеринбург, Ростов-на-Дону и другие города.",
              "address": {
                "@type": "PostalAddress",
                "addressCountry": "BY",
                "addressLocality": "Минск"
              },
              "priceRange": "$$",
              "telephone": "",
              "areaServed": [
                {
                  "@type": "Country",
                  "name": "Russia"
                },
                {
                  "@type": "Country",
                  "name": "Belarus"
                },
                {
                  "@type": "City",
                  "name": "Москва"
                },
                {
                  "@type": "City",
                  "name": "Санкт-Петербург"
                },
                {
                  "@type": "City",
                  "name": "Екатеринбург"
                },
                {
                  "@type": "City",
                  "name": "Ростов-на-Дону"
                }
              ],
              "openingHoursSpecification": {
                "@type": "OpeningHoursSpecification",
                "dayOfWeek": [
                  "Monday",
                  "Tuesday",
                  "Wednesday",
                  "Thursday",
                  "Friday",
                  "Saturday",
                  "Sunday"
                ],
                "opens": "00:00",
                "closes": "23:59"
              }
            })
          }}
        />
      </head>
      <body
        className={`${cabinetGroteskFont.variable} ${geistSans.variable} ${geistMono.variable} ${durikFont.variable} ${blauerNueFont.variable} antialiased`}
      >
        <TokenEventHandler />
        <Header />
        {children}
        <ConditionalFooter />
      </body>
    </html>
  );
}
