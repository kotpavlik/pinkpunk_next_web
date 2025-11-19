'use client'

import Image from 'next/image'
import { useState } from 'react'

interface LazyImageProps {
    src: string
    alt: string
    className?: string
}

export default function LazyImage({ src, alt, className = '' }: LazyImageProps) {
    const [imageError, setImageError] = useState(false)
    const [isLoading, setIsLoading] = useState(true)

    const getImageUrl = (photoUrl: string) => {
        if (photoUrl.startsWith('http://') || photoUrl.startsWith('https://')) {
            return photoUrl
        }
        if (photoUrl.startsWith('/')) {
            const baseURL = process.env.NEXT_PUBLIC_BASE_URL || 'https://pinkpunknestbot-production.up.railway.app'
            return `${baseURL}${photoUrl}`
        }
        return photoUrl
    }

    if (imageError) {
        return (
            <div className={`bg-white/10 flex items-center justify-center ${className}`}>
                <span className="text-white/40 text-xs">📦</span>
            </div>
        )
    }

    return (
        <div className={`relative ${className}`}>
            {isLoading && (
                <div className="absolute inset-0 bg-white/10 animate-pulse" />
            )}
            <Image
                src={getImageUrl(src)}
                alt={alt}
                fill
                className="object-cover"
                onLoad={() => setIsLoading(false)}
                onError={() => {
                    setImageError(true)
                    setIsLoading(false)
                }}
                unoptimized
            />
        </div>
    )
}

