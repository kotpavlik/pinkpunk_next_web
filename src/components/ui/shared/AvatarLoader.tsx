'use client'

import { DotLottieReact } from '@lottiefiles/dotlottie-react'
import AvatarAnimation from '@/../public/animations/krmtmBvaNA.json'

interface AvatarLoaderProps {
    className?: string
    size?: number
    loop?: boolean
    autoplay?: boolean
}

export default function AvatarLoader({
    className = '',
    size,
    loop = true,
    autoplay = true,
}: AvatarLoaderProps) {
    const sizeStyle = size ? { width: size, height: size } : {}

    return (
        <div
            className={`relative flex items-center justify-center ${className}`}
            style={sizeStyle}
        >
            <DotLottieReact
                data={AvatarAnimation as Parameters<typeof DotLottieReact>[0]['data']}
                loop={loop}
                autoplay={autoplay}
                style={{
                    width: '100%',
                    height: '100%',
                    display: 'block',
                }}
            />
        </div>
    )
}

