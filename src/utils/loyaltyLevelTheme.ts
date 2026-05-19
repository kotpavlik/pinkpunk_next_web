import type { CSSProperties } from 'react'
import type { LoyaltyLevelId } from '@/api/LoyaltyApi'

/** Максимум шкалы для позиции маркеров на прогресс-баре (Legend от 15k). */
export const LOYALTY_LADDER_SCALE_MAX = 15_000

export const LOYALTY_LADDER = [
    {
        id: 'explorer' as const,
        label: 'Explorer',
        minPoints: 0,
        maxPoints: 999,
        colorVar: '--level-bronze',
        glowVar: '--glow-bronze',
        perk: 'Старт программы лояльности',
    },
    {
        id: 'regular' as const,
        label: 'Regular',
        minPoints: 1000,
        maxPoints: 4999,
        colorVar: '--level-silver',
        glowVar: '--glow-silver',
        perk: 'Приоритет в рассылках',
    },
    {
        id: 'vibe_keeper' as const,
        label: 'Vibe Keeper',
        minPoints: 5000,
        maxPoints: 9999,
        colorVar: '--level-gold',
        glowVar: '--glow-gold',
        perk: 'Ранний доступ к дропам',
    },
    {
        id: 'insider' as const,
        label: 'Insider',
        minPoints: 10000,
        maxPoints: 14999,
        colorVar: '--level-sapphire',
        glowVar: '--glow-sapphire',
        perk: 'Ранний доступ к коллабам',
    },
    {
        id: 'legend' as const,
        label: 'Legend',
        minPoints: 15000,
        maxPoints: null as number | null,
        colorVar: '--level-ruby',
        glowVar: '--glow-ruby',
        perk: 'Максимальные привилегии',
    },
] as const

export type LadderItemState = 'locked' | 'passed' | 'current'

export type LevelTheme = {
    id: string
    labelColor: string
    labelClass: string
    glow: string
    displayLabel: string
    expRangeLabel: string
    perk: string
    avatarRingStyle: CSSProperties
}

function normalizeLevelId(id: string): LoyaltyLevelId | string {
    return id.trim().toLowerCase().replace(/\s+/g, '_') as LoyaltyLevelId
}

export function getLadderItem(levelId: string) {
    const id = normalizeLevelId(levelId)
    return LOYALTY_LADDER.find(l => l.id === id) ?? LOYALTY_LADDER[0]
}

export function formatExpRange(min: number, max: number | null): string {
    if (max == null) return `от ${min.toLocaleString('ru-RU')} exp`
    return `${min.toLocaleString('ru-RU')} – ${max.toLocaleString('ru-RU')} exp`
}

export function getLevelTheme(levelId: string): LevelTheme {
    const item = getLadderItem(levelId)
    const color = `var(${item.colorVar})`
    const glow = `var(${item.glowVar})`

    return {
        id: item.id,
        labelColor: color,
        labelClass: `text-[var(${item.colorVar})]`,
        glow,
        displayLabel: item.label,
        expRangeLabel: formatExpRange(item.minPoints, item.maxPoints),
        perk: item.perk,
        avatarRingStyle: {
            boxShadow: glow,
            borderColor: color,
        },
    }
}

/** Подпись «скоро откроется …» — только градация (Explorer, Insider, …). */
export function getLevelLabel(levelId: string): string {
    return getLadderItem(levelId).label
}

/** Позиция маркера на общей шкале 0…15k+. */
export function markerPositionPercent(minPoints: number): number {
    return Math.min(100, (minPoints / LOYALTY_LADDER_SCALE_MAX) * 100)
}

export function resolveLadderState(itemId: string, currentLevelId: string): LadderItemState {
    const currentIdx = LOYALTY_LADDER.findIndex(l => l.id === normalizeLevelId(currentLevelId))
    const itemIdx = LOYALTY_LADDER.findIndex(l => l.id === itemId)
    if (itemIdx < 0 || currentIdx < 0) return 'locked'
    if (itemIdx === currentIdx) return 'current'
    if (itemIdx < currentIdx) return 'passed'
    return 'locked'
}

const LEVEL_UP_SEEN_KEY = 'pp_loyalty_level_id'

export function readStoredLoyaltyLevelId(): string | null {
    if (typeof window === 'undefined') return null
    return sessionStorage.getItem(LEVEL_UP_SEEN_KEY)
}

export function storeLoyaltyLevelId(levelId: string): void {
    if (typeof window === 'undefined') return
    sessionStorage.setItem(LEVEL_UP_SEEN_KEY, levelId)
}

export function detectLevelUp(
    previousId: string | null,
    newId: string,
): { isNew: boolean; previousId: string | null } {
    if (!previousId) return { isNew: false, previousId: null }
    const prevNorm = normalizeLevelId(previousId)
    const newNorm = normalizeLevelId(newId)
    if (prevNorm === newNorm) return { isNew: false, previousId }
    const prevIdx = LOYALTY_LADDER.findIndex(l => l.id === prevNorm)
    const newIdx = LOYALTY_LADDER.findIndex(l => l.id === newNorm)
    if (prevIdx < 0 || newIdx < 0) return { isNew: false, previousId }
    return { isNew: newIdx > prevIdx, previousId }
}
