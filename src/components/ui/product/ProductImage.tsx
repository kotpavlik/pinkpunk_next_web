'use client'

import Image from 'next/image'
import { useEffect, useState } from 'react'

interface ProductImageProps {
    src: string
    alt: string
    fill?: boolean
    /** При `fill={false}` — пропорции плейсхолдера Next/Image до загрузки (рендер: `w-full h-auto`) */
    intrinsicWidth?: number
    intrinsicHeight?: number
    sizes?: string
    className?: string
    priority?: boolean
    quality?: number
    showSkeleton?: boolean
    loading?: 'eager' | 'lazy'
}

/**
 * Безопасный компонент изображения товара
 * С минималистичным skeleton и обработкой ошибок
 */
export default function ProductImage({
    src,
    alt,
    fill = true,
    intrinsicWidth = 900,
    intrinsicHeight = 1200,
    sizes,
    className = '',
    priority = false,
    quality = 95,
    showSkeleton = true,
    loading = 'eager',
}: ProductImageProps) {
    const [imageError, setImageError] = useState(false)
    const [imageLoaded, setImageLoaded] = useState(false)

    // Fallback SVG изображение
    const fallbackImage =
        'data:image/svg+xml,%3Csvg xmlns="http://www.w3.org/2000/svg" width="400" height="600" viewBox="0 0 400 600"%3E%3Crect width="400" height="600" fill="%23171717"/%3E%3Cpath d="M200 280 L200 320 M180 300 L220 300" stroke="%23333" stroke-width="3" stroke-linecap="round"/%3E%3C/svg%3E'

    useEffect(() => {
        setImageError(false)
        setImageLoaded(false)
    }, [src])

    if (imageError) {
        if (fill) {
            return (
                <div className={`relative ${className}`}>
                    <Image
                        src={fallbackImage}
                        alt="Изображение недоступно"
                        fill
                        sizes={sizes}
                        className="object-contain"
                        unoptimized
                    />
                </div>
            )
        }
        return (
            <div className="relative w-full">
                <Image
                    src={fallbackImage}
                    alt="Изображение недоступно"
                    width={400}
                    height={600}
                    sizes={sizes}
                    className="w-full h-auto max-w-full object-contain"
                    unoptimized
                />
            </div>
        )
    }

    if (!fill) {
        return (
            <div className="relative w-full">
                {!imageLoaded && showSkeleton && (
                    <div
                        className="pointer-events-none absolute inset-0 z-[2] min-h-[45vw] bg-gradient-to-br from-white/5 to-white/10 animate-pulse md:min-h-[22vw]"
                        aria-hidden
                    />
                )}
                <Image
                    src={src}
                    alt={alt}
                    width={intrinsicWidth}
                    height={intrinsicHeight}
                    sizes={sizes}
                    className={`relative z-[1] w-full h-auto max-w-full ${className} ${imageLoaded ? 'opacity-100' : 'opacity-0'} transition-opacity duration-300`}
                    priority={priority}
                    quality={quality}
                    loading={priority ? undefined : loading}
                    onLoad={() => setImageLoaded(true)}
                    onError={() => {
                        console.warn(`Не удалось загрузить изображение: ${src}`)
                        setImageError(true)
                        setImageLoaded(true)
                    }}
                    unoptimized
                />
            </div>
        )
    }

    return (
        <>
            {/* Минималистичный skeleton - показывается только пока изображение не загружено */}
            {!imageLoaded && (
                <div className={`absolute inset-0 bg-gradient-to-br from-white/5 to-white/10 ${showSkeleton ? 'animate-pulse' : ''}`} />
            )}

            <Image
                src={src}
                alt={alt}
                fill={fill}
                sizes={sizes}
                className={`${className} ${imageLoaded ? 'opacity-100' : 'opacity-0'} transition-opacity duration-300`}
                priority={priority}
                quality={quality}
                loading={priority ? undefined : loading}
                onLoad={() => setImageLoaded(true)}
                onError={() => {
                    console.warn(`Не удалось загрузить изображение: ${src}`)
                    setImageError(true)
                    setImageLoaded(true)
                }}
                unoptimized
            />
        </>
    )
}
