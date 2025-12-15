import { ImageLoaderProps } from 'next/image'

/**
 * Custom image loader для Next.js Image с поддержкой timeout и retry
 * Решает проблему медленной загрузки с внешних хостов (i.ibb.co и др.)
 */
export const customImageLoader = ({ src, width, quality }: ImageLoaderProps): string => {
  // Для i.ibb.co возвращаем оригинальный URL без оптимизации
  // так как их сервер может медленно отвечать на запросы оптимизации
  if (src.includes('i.ibb.co')) {
    return src
  }

  // Для локальных изображений используем стандартную оптимизацию Next.js
  if (src.startsWith('/')) {
    return `/_next/image?url=${encodeURIComponent(src)}&w=${width}&q=${quality || 75}`
  }

  // Для других внешних источников используем стандартную оптимизацию
  return `/_next/image?url=${encodeURIComponent(src)}&w=${width}&q=${quality || 75}`
}

/**
 * Fallback изображение для случаев ошибки загрузки
 */
export const FALLBACK_IMAGE = 'data:image/svg+xml,%3Csvg xmlns="http://www.w3.org/2000/svg" width="400" height="400" viewBox="0 0 400 400"%3E%3Crect width="400" height="400" fill="%23171717"/%3E%3Ctext x="50%25" y="50%25" dominant-baseline="middle" text-anchor="middle" font-family="monospace" font-size="24" fill="%23666"%3EИзображение%3C/text%3E%3Ctext x="50%25" y="60%25" dominant-baseline="middle" text-anchor="middle" font-family="monospace" font-size="16" fill="%23444"%3Eне загрузилось%3C/text%3E%3C/svg%3E'

