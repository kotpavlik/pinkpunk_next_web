import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  /* config options here */
  reactStrictMode: true,
  allowedDevOrigins: ['pinkpunk.ru.tuna.am'],
  images: {
    remotePatterns: [
      {
        protocol: 'https',
        hostname: 'images.unsplash.com',
        port: '',
        pathname: '/**',
      },
      {
        protocol: 'https',
        hostname: 'pinkpunknestbot-production.up.railway.app',
        port: '',
        pathname: '/**',
      },
      {
        protocol: 'https',
        hostname: 'i.ibb.co',
        port: '',
        pathname: '/**',
      },
    ],
    // Оптимизация включена: каталог/карусель отдают лёгкие версии под размер экрана,
    // что убирает повторное декодирование тяжёлых картинок на мобильных.
    // Компоненты, которым нужен оригинал, по-прежнему ставят unoptimized точечно.
    formats: ['image/avif', 'image/webp'],
    minimumCacheTTL: 31536000,
    qualities: [75, 95],
    dangerouslyAllowSVG: true,
  },
  webpack(config) {
    config.module.rules.push({
      test: /\.svg$/,
      use: [
        {
          loader: "@svgr/webpack",
          options: {
            icon: true
          }
        }
      ]
    });
    return config;
  },
  turbopack: {
    rules: {
      '*.svg': {
        loaders: ['@svgr/webpack'],
        as: '*.js',
      },
    },
  },
};

export default nextConfig;
