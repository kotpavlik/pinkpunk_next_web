'use client'

import { DotLottieReact } from '@lottiefiles/dotlottie-react'

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
    const sizeClasses = {
        sm: 'max-w-xs h-32',
        md: 'max-w-md h-64',
        lg: 'max-w-lg h-80',
        xl: 'max-w-2xl h-96',
    }

    const containerClass = fullScreen
        ? 'relative min-h-screen w-full flex items-center justify-center'
        : 'relative w-full flex items-center justify-center'

    return (
        <div className={`${containerClass} ${className}`}>
            <div className="flex flex-col items-center justify-center gap-6 w-full">
                {/* Lottie loader */}
                <div className={`relative w-full ${sizeClasses[size]} flex items-center justify-center`}>
                    <DotLottieReact
                        src={src}
                        loop={loop}
                        autoplay={autoplay}
                        className="w-full h-full"
                    />
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

