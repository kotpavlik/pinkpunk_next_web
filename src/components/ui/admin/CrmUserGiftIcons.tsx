'use client'

import { GiftIcon } from '@heroicons/react/24/outline'
import { resolveGiftLevelId, type LoyaltyStatus } from '@/api/LoyaltyApi'
import { LOYALTY_LADDER } from '@/utils/loyaltyLevelTheme'

const GIFT_ICON_COLOR_ISSUED = '#5cb88a'
const GIFT_ICON_COLOR_REQUESTED = '#fbbf24'
const GIFT_ICON_COLOR_IDLE = 'rgba(255,255,255,0.28)'

function resolveCrmGiftIconColor(
    levelId: string,
    gifts: LoyaltyStatus['gifts'] | undefined,
): string {
    const giftLevelId = resolveGiftLevelId(levelId)
    if (!giftLevelId) return GIFT_ICON_COLOR_IDLE
    const status = gifts?.[giftLevelId]?.status
    if (status === 'issued') return GIFT_ICON_COLOR_ISSUED
    if (status === 'requested') return GIFT_ICON_COLOR_REQUESTED
    return GIFT_ICON_COLOR_IDLE
}

export default function CrmUserGiftIcons({ gifts }: { gifts?: LoyaltyStatus['gifts'] }) {
    return (
        <div
            className="absolute bottom-2.5 right-2.5 z-[1] flex items-center gap-1"
            aria-hidden
        >
            {LOYALTY_LADDER.map(level => (
                <GiftIcon
                    key={level.id}
                    className="h-3.5 w-3.5 shrink-0"
                    style={{ color: resolveCrmGiftIconColor(level.id, gifts) }}
                />
            ))}
        </div>
    )
}
