import type { LoyaltyStatus } from '@/api/LoyaltyApi'
import { resolveEffectiveDiscountPercent } from '@/api/LoyaltyApi'
import { getLevelTheme } from '@/utils/loyaltyLevelTheme'

/** 0% — зелёный, ~50% — янтарный, 100% — красный (читаемо на тёмном фоне). */
export function fixedDiscountPercentColor(percent: number): string {
    const t = Math.min(100, Math.max(0, percent)) / 100
    const hue = 138 * (1 - t)
    const saturation = 68 + 8 * Math.sin(t * Math.PI)
    const lightness = 54 + 4 * (1 - Math.abs(t - 0.5) * 2)
    return `hsl(${hue.toFixed(1)}, ${saturation.toFixed(0)}%, ${lightness.toFixed(0)}%)`
}

export function fixedDiscountPercentForColor(loyalty: LoyaltyStatus): number {
    const fixed = loyalty.discount?.adminFixedDiscountPercent
    if (fixed != null && !Number.isNaN(fixed)) return fixed
    return resolveEffectiveDiscountPercent(loyalty)
}

/** Цвет итоговой скидки: фикс — по шкале %, иначе цвет уровня. */
export function resolveLoyaltyDiscountColor(loyalty: LoyaltyStatus): string {
    if (loyalty.discount?.adminDiscountIsFixed === true) {
        return fixedDiscountPercentColor(fixedDiscountPercentForColor(loyalty))
    }
    return getLevelTheme(loyalty.level.id).labelColor
}
