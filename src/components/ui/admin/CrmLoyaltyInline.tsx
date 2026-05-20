'use client'

import type { LoyaltyStatus } from '@/api/LoyaltyApi'
import { formatExpPoints, resolveEffectiveDiscountPercent } from '@/api/LoyaltyApi'
import { getLevelTheme } from '@/utils/loyaltyLevelTheme'
import { resolveLoyaltyDiscountColor } from '@/utils/fixedDiscountPercentColor'

type Props = {
    loyalty: LoyaltyStatus
    className?: string
}

/** Строка уровня + очки + скидка для карточек CRM и шапки. */
export default function CrmLoyaltyInline({ loyalty, className = '' }: Props) {
    const levelTheme = getLevelTheme(loyalty.level.id)
    const effectiveDiscount = resolveEffectiveDiscountPercent(loyalty)
    const isFixed = loyalty.discount?.adminDiscountIsFixed === true
    const discountColor = resolveLoyaltyDiscountColor(loyalty)
    const showDiscount = effectiveDiscount > 0 || isFixed

    return (
        <p className={`text-[10px] leading-snug ${className}`.trim()}>
            <span className="font-semibold" style={{ color: levelTheme.labelColor }}>
                {loyalty.level.label}
            </span>
            <span className="text-white/45"> · </span>
            <span className="text-white/80 tabular-nums">{formatExpPoints(loyalty.expPoints)} pts</span>
            {showDiscount && (
                <>
                    <span className="text-white/45"> · </span>
                    <span
                        className="font-semibold tabular-nums"
                        style={{ color: discountColor }}
                        title={
                            isFixed
                                ? `Фиксированная скидка ${effectiveDiscount}%`
                                : `Скидка ${effectiveDiscount}%`
                        }
                    >
                        −{effectiveDiscount}%
                        {isFixed ? ' фикс' : ''}
                    </span>
                </>
            )}
        </p>
    )
}

export function loyaltyRowNeedsUpdate(
    prev: LoyaltyStatus | null | undefined,
    next: LoyaltyStatus,
): boolean {
    if (!prev) return true
    return (
        prev.level.id !== next.level.id ||
        prev.expPoints !== next.expPoints ||
        resolveEffectiveDiscountPercent(prev) !== resolveEffectiveDiscountPercent(next) ||
        prev.discount?.adminDiscountIsFixed !== next.discount?.adminDiscountIsFixed ||
        prev.discount?.adminFixedDiscountPercent !== next.discount?.adminFixedDiscountPercent
    )
}
