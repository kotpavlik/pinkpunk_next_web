'use client'

import Image from 'next/image'
import { useState } from 'react'

interface ProductImageProps {
    src: string
    alt: string
    fill?: boolean
    sizes?: string
    className?: string
    priority?: boolean
    quality?: number
    showSkeleton?: boolean
}

/**
 * Безопасный компонент изображения товара
 * С минималистичным skeleton и обработкой ошибок
 */
export default function ProductImage({ 
    src, 
    alt, 
    fill = true,
    sizes,
    className = '',
    priority = false,
    quality = 95,
    showSkeleton = true,
}: ProductImageProps) {
    const [imageError, setImageError] = useState(false)
    const [imageLoaded, setImageLoaded] = useState(false)

    // Fallback SVG изображение
    const fallbackImage = 'data:image/svg+xml,%3Csvg xmlns="http://www.w3.org/2000/svg" width="400" height="600" viewBox="0 0 400 600"%3E%3Crect width="400" height="600" fill="%23171717"/%3E%3Cpath d="M200 280 L200 320 M180 300 L220 300" stroke="%23333" stroke-width="3" stroke-linecap="round"/%3E%3C/svg%3E'

    if (imageError) {
        return (
            <div className={`relative ${className}`}>
                <Image
                    src={fallbackImage}
                    alt="Изображение недоступно"
                    fill={fill}
                    sizes={sizes}
                    className="object-contain"
                    unoptimized
                />
            </div>
        )
    }

    return (
        <>
            {/* Минималистичный skeleton - показывается только пока изображение не загружено */}
            {showSkeleton && !imageLoaded && (
                <div className="absolute inset-0 bg-gradient-to-br from-white/5 to-white/10 animate-pulse" />
            )}
            
            <Image
                src={src}
                alt={alt}
                fill={fill}
                sizes={sizes}
                className={`${className} ${imageLoaded ? 'opacity-100' : 'opacity-0'} transition-opacity duration-300`}
                priority={priority}
                quality={quality}
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

