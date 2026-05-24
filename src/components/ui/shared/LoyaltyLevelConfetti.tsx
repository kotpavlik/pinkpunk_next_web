'use client'

import Lottie from 'lottie-react'
import snoopDogAnimation from '@/../public/animations/snoop_dog.json'

type Props = {
    className?: string
}

/** Праздничная Lottie — в хедере модалки уровня (слева от крестика). */
export default function LoyaltyLevelConfetti({ className = '' }: Props) {
    return (
        <div
            className={`pointer-events-none flex h-10 w-10 items-center justify-center overflow-hidden ${className}`.trim()}
            aria-hidden
        >
            <Lottie
                animationData={snoopDogAnimation}
                loop
                autoplay
                className="h-full w-full object-contain"
            />
        </div>
    )
}
