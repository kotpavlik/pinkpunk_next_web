'use client'

import type { CSSProperties } from 'react'
import Lottie from 'lottie-react'
import telegramAnimation from '@/../public/animations/telegram.json'

interface TelegramLottieJsonProps {
    className?: string
    loop?: boolean
    autoplay?: boolean
    style?: CSSProperties
}

/** Классический Lottie JSON; не использовать DotLottie — см. wasm buffer mismatch для .json в dotlottie-web. */
export default function TelegramLottieJson({
    className,
    loop = true,
    autoplay = true,
    style,
}: TelegramLottieJsonProps) {
    return (
        <Lottie
            className={className}
            animationData={telegramAnimation}
            loop={loop}
            autoplay={autoplay}
            style={{ margin: 0, ...style }}
        />
    )
}
