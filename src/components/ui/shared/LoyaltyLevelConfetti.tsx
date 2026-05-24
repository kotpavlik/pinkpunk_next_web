'use client'

import Lottie from 'lottie-react'
import snoopDogAnimation from '@/../public/animations/snoop_dog.json'

type Props = {
    className?: string
}

/** Праздничная Lottie — внизу модалки, играет до закрытия. */
export default function LoyaltyLevelConfetti({ className = '' }: Props) {
    return (
        <div
            className={`pointer-events-none shrink-0 flex h-36 items-end justify-center overflow-hidden px-2 pb-1 ${className}`.trim()}
            aria-hidden
        >
            <Lottie
                animationData={snoopDogAnimation}
                loop
                autoplay
                className="h-full w-full max-w-[11rem] object-contain object-bottom"
            />
        </div>
    )
}
