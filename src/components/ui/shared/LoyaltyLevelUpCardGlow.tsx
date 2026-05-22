'use client'

import { resolveLevelColorHex } from '@/utils/loyaltyLevelTheme'

type Props = {
    levelId: string
    onComplete: () => void
}

export function LoyaltyLevelUpCardGlow({ levelId, onComplete }: Props) {
    return (
        <div
            className="loyalty-level-up-glow-ring pointer-events-none absolute -inset-1 rounded-xl"
            style={{ ['--level-up-glow-color' as string]: resolveLevelColorHex(levelId) }}
            onAnimationEnd={(event) => {
                if (event.target !== event.currentTarget) return
                onComplete()
            }}
            aria-hidden
        />
    )
}
