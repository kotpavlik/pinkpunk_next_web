'use client'

import { useState, useEffect } from 'react'
import { DotLottieReact } from '@lottiefiles/dotlottie-react'
import LoadingCatAnimation from '@/../public/animations/LoadingCat.json'
import EmptyAnimation from '@/../public/animations/empty.json'
import TelegramAnimation from '@/../public/animations/telegram.json'
import AdminAnimation from '@/../public/animations/Admin.json'
import OrderConfirmedAnimation from '@/../public/animations/YourOrderIsConfirmed.json'
import ShoppingBagErrorAnimation from '@/../public/animations/ShoppingBag-error.json'

interface LoaderProps {
    src?: string
    fullScreen?: boolean
    size?: 'sm' | 'md' | 'lg' | 'xl'
    showText?: boolean
    text?: string
    className?: string
    loop?: boolean
    autoplay?: boolean
}

// Маппинг путей на JSON объекты
const animationMap: Record<string, object> = {
    '/animations/LoadingCat.lottie': LoadingCatAnimation,
    '/animations/empty.lottie': EmptyAnimation,
    '/animations/telegram.lottie': TelegramAnimation,
    '/animations/Admin.lottie': AdminAnimation,
    '/animations/YourOrderIsConfirmed!.lottie': OrderConfirmedAnimation,
    '/animations/ShoppingBag-error.lottie': ShoppingBagErrorAnimation,
}

export default function Loader({
    src = '/animations/LoadingCat.lottie',
    fullScreen = false,
    size = 'md',
    showText = false,
    text = 'Загрузка...',
    className = '',
    loop = true,
    autoplay = true,
}: LoaderProps) {
    const [hasError, setHasError] = useState(false)
    const animationData = animationMap[src]

    useEffect(() => {
        // Если анимация не найдена в маппинге, показываем ошибку
        if (!animationData) {
            console.error(`Animation not found for src: ${src}`)
            setHasError(true)
        }
    }, [src, animationData])

    const sizeClasses = {
        sm: 'w-full h-32',
        md: 'w-full h-64',
        lg: 'w-full h-80',
        xl: 'w-full h-96',
    }

    const containerClass = fullScreen
        ? 'relative min-h-screen w-full flex items-center justify-center'
        : 'relative w-full flex items-center justify-center'

    // Fallback spinner если анимация не загрузилась
    if (hasError) {
        return (
            <div className={`${containerClass} ${className}`}>
                <div className="flex flex-col items-center justify-center gap-6 w-full">
                    <div className={`relative w-full ${sizeClasses[size]} flex items-center justify-center`}>
                        <div className="relative w-20 h-20">
                            <div className="absolute inset-0 border-4 border-[var(--mint-dark)]/30 rounded-full"></div>
                            <div
                                className="absolute inset-0 border-4 border-transparent border-t-[var(--mint-bright)] rounded-full animate-spin"
                                style={{ animationDuration: '1s' }}
                            ></div>
                            <div className="absolute inset-3 border-3 border-[var(--pink-punk)]/30 rounded-full"></div>
                            <div
                                className="absolute inset-3 border-3 border-transparent border-r-[var(--pink-punk)] rounded-full animate-spin"
                                style={{ animationDuration: '1.2s', animationDirection: 'reverse' }}
                            ></div>
                        </div>
                    </div>
                    {showText && (
                        <p className="text-white/70 text-base font-blauer-nue animate-pulse mt-4">
                            {text}
                        </p>
                    )}
                </div>
            </div>
        )
    }

    return (
        <div className={`${containerClass} ${className}`}>
            <div className="flex flex-col items-center justify-center gap-6 w-full">
                {/* Lottie loader */}
                <div className={`relative ${sizeClasses[size]} flex items-center justify-center`} style={{ minHeight: '256px', width: '100%' }}>
                    <div style={{ width: '100%', height: '100%', minWidth: '100%', minHeight: '200px', flexShrink: 0 }}>
                        <DotLottieReact
                            data={animationData as Parameters<typeof DotLottieReact>[0]['data']}
                            loop={loop}
                            autoplay={autoplay}
                            style={{
                                width: '100%',
                                height: '100%',
                                display: 'block',
                                minWidth: '100%',
                            }}
                        />
                    </div>
                </div>
                {showText && (
                    <p className="text-white/70 text-base font-blauer-nue animate-pulse mt-4">
                        {text}
                    </p>
                )}
            </div>
        </div>
    )
}

