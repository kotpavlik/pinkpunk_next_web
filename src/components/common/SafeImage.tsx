'use client'

import Image, { ImageProps } from 'next/image'
import { useState } from 'react'
import { FALLBACK_IMAGE } from '@/utils/imageLoader'

interface SafeImageProps extends Omit<ImageProps, 'src' | 'onError' | 'onLoad'> {
    src: string
    fallbackSrc?: string
    showLoader?: boolean
}

/**
 * Безопасный компонент изображения с автоматической обработкой ошибок
 * и отключением оптимизации для проблемных источников (i.ibb.co)
 */
export default function SafeImage({ 
    src, 
    fallbackSrc = FALLBACK_IMAGE,
    showLoader = true,
    alt,
    className,
    ...props 
}: SafeImageProps) {
    const [imageError, setImageError] = useState(false)
    const [isLoading, setIsLoading] = useState(true)
    const [currentSrc, setCurrentSrc] = useState(src)

    // Определяем, нужно ли отключать оптимизацию для данного источника
    const shouldDisableOptimization = (url: string): boolean => {
        const problematicHosts = ['i.ibb.co', 'ibb.co']
        return problematicHosts.some(host => url.includes(host))
    }

    const handleError = () => {
        console.warn(`Ошибка загрузки изображения: ${currentSrc}`)
        if (currentSrc !== fallbackSrc) {
            setCurrentSrc(fallbackSrc)
            setImageError(true)
        }
        setIsLoading(false)
    }

    const handleLoad = () => {
        setIsLoading(false)
        setImageError(false)
    }

    return (
        <div className={`relative ${className || ''}`}>
            {showLoader && isLoading && !imageError && (
                <div className="absolute inset-0 bg-white/10 backdrop-blur-sm animate-pulse rounded-lg flex items-center justify-center">
                    <svg className="animate-spin h-8 w-8 text-white/50" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                    </svg>
                </div>
            )}
            <Image
                {...props}
                src={currentSrc}
                alt={alt}
                className={className}
                onLoad={handleLoad}
                onError={handleError}
                unoptimized={shouldDisableOptimization(src)}
                loading="lazy"
            />
        </div>
    )
}

