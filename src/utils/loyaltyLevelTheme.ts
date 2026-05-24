import type { CSSProperties } from 'react'
import type { LoyaltyLevelId } from '@/api/LoyaltyApi'

/** Максимум шкалы для позиции маркеров на прогресс-баре (Legend от 15k). */
export const LOYALTY_LADDER_SCALE_MAX = 15_000

/** Скидка уровня Explorer при expPoints > 0 (для подсказок в профиле). */
export const EXPLORER_LEVEL_DISCOUNT_PERCENT = 5

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

export function isSameLevelId(a: string, b: string | null | undefined): boolean {
    if (!b) return false
    return normalizeLevelId(a) === normalizeLevelId(b)
}

/** Связка shared-layout между карточкой в сетке и popout (Framer Motion). */
export const LOYALTY_LEVEL_LAYOUT_GROUP_ID = 'loyalty-level-cards'

export function loyaltyLevelLayoutId(levelId: string): string {
    return `loyalty-level-card-${normalizeLevelId(levelId)}`
}

/** CSS-filter для Lottie-confetti в палитре уровня. */
export function resolveLevelConfettiFilter(levelId: string): string {
    const id = normalizeLevelId(levelId)
    const hueByLevel: Record<string, number> = {
        explorer: 8,
        regular: 0,
        vibe_keeper: 42,
        insider: 208,
        legend: 328,
    }
    const hue = hueByLevel[id] ?? hueByLevel.explorer
    return `saturate(1.85) hue-rotate(${hue}deg) brightness(1.08) contrast(1.05)`
}

export function getLadderItem(levelId: string) {
    const id = normalizeLevelId(levelId)
    return LOYALTY_LADDER.find(l => l.id === id) ?? LOYALTY_LADDER[0]
}

export function formatExpRange(min: number, max: number | null): string {
    if (max == null) return `от ${min.toLocaleString('ru-RU')} exp`
    return `${min.toLocaleString('ru-RU')} – ${max.toLocaleString('ru-RU')} exp`
}

/** Рамка карточки CRM / профиля по градации лояльности. */
export function getLoyaltyLevelBorderStyle(levelId: string | null | undefined): CSSProperties {
    if (!levelId) {
        return { borderColor: 'rgba(255, 255, 255, 0.2)' }
    }
    const theme = getLevelTheme(levelId)
    return {
        borderColor: theme.labelColor,
        boxShadow: theme.glow,
    }
}

const LEVEL_COLOR_HEX: Record<(typeof LOYALTY_LADDER)[number]['id'], string> = {
    explorer: '#cd7f32',
    regular: '#c0c0c0',
    vibe_keeper: '#ffd700',
    insider: '#0f52ba',
    legend: '#e0115f',
}

/** Разрешённый hex цвета уровня (для CSS-анимаций, где nested var() может не сработать). */
export function resolveLevelColorHex(levelId: string): string {
    const item = getLadderItem(levelId)
    return LEVEL_COLOR_HEX[item.id as keyof typeof LEVEL_COLOR_HEX] ?? LEVEL_COLOR_HEX.explorer
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
const OPENED_LEVEL_CARDS_KEY = 'pp_loyalty_opened_cards'

/** levelId → индекс текущего уровня пользователя в момент открытия popout. */
type OpenedLevelCardsStore = Record<string, number>

function resolveLevelIndex(levelId: string): number {
    return LOYALTY_LADDER.findIndex(l => l.id === normalizeLevelId(levelId))
}

function readOpenedLevelCardsStore(): OpenedLevelCardsStore {
    if (typeof window === 'undefined') return {}
    try {
        const raw = localStorage.getItem(OPENED_LEVEL_CARDS_KEY)
        if (!raw) return {}
        const parsed = JSON.parse(raw) as unknown
        if (Array.isArray(parsed)) {
            const migrated: OpenedLevelCardsStore = {}
            for (const value of parsed) {
                const id = normalizeLevelId(String(value))
                const idx = resolveLevelIndex(id)
                if (idx >= 0) migrated[id] = idx
            }
            return migrated
        }
        if (parsed && typeof parsed === 'object') {
            const store: OpenedLevelCardsStore = {}
            for (const [key, value] of Object.entries(parsed as Record<string, unknown>)) {
                const id = normalizeLevelId(key)
                const idx = resolveLevelIndex(id)
                const openedWhenLevelIdx =
                    typeof value === 'number' && Number.isFinite(value) ? value : idx
                if (idx >= 0) store[id] = openedWhenLevelIdx
            }
            return store
        }
        return {}
    } catch {
        return {}
    }
}

function writeOpenedLevelCardsStore(store: OpenedLevelCardsStore): void {
    if (typeof window === 'undefined') return
    localStorage.setItem(OPENED_LEVEL_CARDS_KEY, JSON.stringify(store))
}

export function readOpenedLevelCards(): Set<string> {
    return new Set(Object.keys(readOpenedLevelCardsStore()))
}

/** Сбрасывает «открытые» карточки уровней, которые пользователь потерял после отката. */
export function syncOpenedLevelCards(currentLevelId: string): Set<string> {
    const currentIdx = resolveLevelIndex(currentLevelId)
    const store = readOpenedLevelCardsStore()
    if (currentIdx < 0) return new Set(Object.keys(store))

    const next: OpenedLevelCardsStore = {}
    for (const [levelId, openedWhenLevelIdx] of Object.entries(store)) {
        if (currentIdx >= openedWhenLevelIdx) {
            next[levelId] = openedWhenLevelIdx
        }
    }

    if (JSON.stringify(next) !== JSON.stringify(store)) {
        writeOpenedLevelCardsStore(next)
    }

    return new Set(Object.keys(next))
}

export function storeOpenedLevelCard(levelId: string, currentLevelId: string): void {
    if (typeof window === 'undefined') return
    const id = normalizeLevelId(levelId)
    const currentIdx = resolveLevelIndex(currentLevelId)
    if (currentIdx < 0) return

    const store = readOpenedLevelCardsStore()
    const levelIdx = resolveLevelIndex(id)
    if (levelIdx < 0) return

    if (store[id] != null && store[id] >= levelIdx) return

    store[id] = currentIdx
    writeOpenedLevelCardsStore(store)
}

function isLevelCardOpened(levelId: string, openedCards: Set<string>): boolean {
    return openedCards.has(normalizeLevelId(levelId))
}

/** Popout открыт уже на этом уровне (не превью следующего с более низкой ступени). */
function isLevelCardFullyOpened(levelId: string): boolean {
    const store = readOpenedLevelCardsStore()
    const id = normalizeLevelId(levelId)
    const openedWhen = store[id]
    if (openedWhen == null) return false
    const levelIdx = resolveLevelIndex(id)
    if (levelIdx < 0) return false
    return openedWhen >= levelIdx
}

/** Карточка уровня, которую пользователь ещё ни разу не открывал (popout), но уже может. */
export function resolveDiscoverableLevelId(
    status: { expPoints: number; level: { id: string }; nextLevel: { id: string; minPoints: number } | null; pointsToNextLevel: number | null },
    openedCards: Set<string>,
): string | null {
    const currentId = normalizeLevelId(status.level.id)
    if (!isLevelCardFullyOpened(currentId)) return currentId

    if (!status.nextLevel) return null
    const nextId = normalizeLevelId(status.nextLevel.id)
    if (isLevelCardOpened(nextId, openedCards)) return null

    const hasEnoughPts =
        status.expPoints >= status.nextLevel.minPoints ||
        status.pointsToNextLevel === 0

    return hasEnoughPts ? nextId : null
}

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
