/** Уровни лояльности — id с бэкенда, пороги не хардкодить для логики. */
export type LoyaltyLevelId =
    | 'explorer'
    | 'regular'
    | 'vibe_keeper'
    | 'insider'
    | 'legend'

export type LoyaltyLevelView = {
    id: LoyaltyLevelId | string
    label: string
    minPoints: number
    maxPoints: number | null
}

/** Блок discount из GET /user/loyalty и CRM loyalty. */
export type LoyaltyDiscountView = {
    effectivePercent: number
    levelDiscountPercent: number
    adminBonusPercent: number
    adminDiscountIsFixed: boolean
    adminFixedDiscountPercent: number | null
}

/** GET /user/loyalty и блок loyalty в CRM (без history). */
export type LoyaltyStatus = {
    expPoints: number
    level: LoyaltyLevelView
    nextLevel: LoyaltyLevelView | null
    pointsToNextLevel: number | null
    progressPercent: number | null
    /** Дублирует discount.effectivePercent, если бэкенд отдаёт. */
    personalDiscountPercent?: number | null
    discount?: LoyaltyDiscountView | null
}

export type LoyaltyLedgerSource = 'order' | 'offline' | 'admin_adjustment' | 'migration'

export type LoyaltyLedgerEntry = {
    _id: string
    accountId?: string
    delta: number
    source: LoyaltyLedgerSource | string
    sourceRef?: string
    reason?: string
    createdBy?: string
    balanceAfter: number
    createdAt: string
}

/** CRM: статус + журнал (карточка / GET …/loyalty). */
export type CrmLoyalty = LoyaltyStatus & {
    history: LoyaltyLedgerEntry[]
}

export type LoyaltyAdjustResponse = {
    success: boolean
    loyalty: LoyaltyStatus
}

export type CrmDiscountMode = 'level_linked' | 'fixed' | 'clear'

export type CrmSetDiscountBody =
    | { mode: 'level_linked'; percent: number }
    | { mode: 'level_linked'; bonusDelta: number }
    | { mode: 'fixed'; fixedPercent: number }
    | { mode: 'clear' }

function asNumber(v: unknown): number | null {
    if (typeof v === 'number' && !Number.isNaN(v)) return v
    if (typeof v === 'string' && v.trim() !== '') {
        const n = Number(v)
        if (!Number.isNaN(n)) return n
    }
    return null
}

function normalizeDiscount(raw: unknown): LoyaltyDiscountView | null {
    if (!raw || typeof raw !== 'object') return null
    const o = raw as Record<string, unknown>
    const effectivePercent = asNumber(o.effectivePercent)
    const levelDiscountPercent = asNumber(o.levelDiscountPercent)
    const adminBonusPercent = asNumber(o.adminBonusPercent)
    if (effectivePercent === null || levelDiscountPercent === null || adminBonusPercent === null) {
        return null
    }
    const adminFixedDiscountPercent =
        o.adminFixedDiscountPercent === null || o.adminFixedDiscountPercent === undefined
            ? null
            : asNumber(o.adminFixedDiscountPercent)

    return {
        effectivePercent,
        levelDiscountPercent,
        adminBonusPercent,
        adminDiscountIsFixed: o.adminDiscountIsFixed === true,
        adminFixedDiscountPercent,
    }
}

function normalizeLevel(raw: unknown): LoyaltyLevelView | null {
    if (!raw || typeof raw !== 'object') return null
    const o = raw as Record<string, unknown>
    const id = typeof o.id === 'string' ? o.id : ''
    const label = typeof o.label === 'string' ? o.label : id || '—'
    const minPoints = asNumber(o.minPoints)
    if (minPoints === null) return null
    const maxPoints = o.maxPoints === null ? null : asNumber(o.maxPoints)
    return { id, label, minPoints, maxPoints }
}

export function normalizeLoyaltyStatus(raw: unknown): LoyaltyStatus | null {
    if (!raw || typeof raw !== 'object') return null
    const o = raw as Record<string, unknown>
    const expPoints = asNumber(o.expPoints)
    const level = normalizeLevel(o.level)
    if (expPoints === null || !level) return null

    const nextLevel = o.nextLevel === null ? null : normalizeLevel(o.nextLevel)
    const pointsToNextLevel =
        o.pointsToNextLevel === null || o.pointsToNextLevel === undefined
            ? null
            : asNumber(o.pointsToNextLevel)
    const progressPercent =
        o.progressPercent === null || o.progressPercent === undefined
            ? null
            : asNumber(o.progressPercent)
    const personalDiscountPercent =
        o.personalDiscountPercent === null || o.personalDiscountPercent === undefined
            ? null
            : asNumber(o.personalDiscountPercent)
    const discount = o.discount === null ? null : normalizeDiscount(o.discount)

    return {
        expPoints,
        level,
        nextLevel,
        pointsToNextLevel,
        progressPercent,
        personalDiscountPercent,
        discount,
    }
}

/** Итоговая скидка для UI (0–100). */
export function resolveEffectiveDiscountPercent(status: LoyaltyStatus): number {
    const fromDiscount = status.discount?.effectivePercent
    if (fromDiscount != null && !Number.isNaN(fromDiscount)) return fromDiscount
    const legacy = status.personalDiscountPercent
    if (legacy != null && !Number.isNaN(legacy)) return legacy
    return 0
}

function normalizeLedgerEntry(raw: unknown): LoyaltyLedgerEntry | null {
    if (!raw || typeof raw !== 'object') return null
    const o = raw as Record<string, unknown>
    const _id = typeof o._id === 'string' ? o._id : ''
    const delta = asNumber(o.delta)
    const balanceAfter = asNumber(o.balanceAfter)
    const createdAt = typeof o.createdAt === 'string' ? o.createdAt : ''
    const source = typeof o.source === 'string' ? o.source : 'order'
    if (!_id || delta === null || balanceAfter === null || !createdAt) return null

    return {
        _id,
        accountId: typeof o.accountId === 'string' ? o.accountId : undefined,
        delta,
        source: source as LoyaltyLedgerSource,
        sourceRef: typeof o.sourceRef === 'string' ? o.sourceRef : undefined,
        reason: typeof o.reason === 'string' ? o.reason : undefined,
        createdBy: typeof o.createdBy === 'string' ? o.createdBy : undefined,
        balanceAfter,
        createdAt,
    }
}

export function normalizeCrmLoyalty(raw: unknown): CrmLoyalty | null {
    const status = normalizeLoyaltyStatus(raw)
    if (!status) return null
    const o = raw as Record<string, unknown>
    const historyRaw = Array.isArray(o.history) ? o.history : []
    const history = historyRaw
        .map(normalizeLedgerEntry)
        .filter((e): e is LoyaltyLedgerEntry => e != null)
    return { ...status, history }
}

export function isUsableLoyaltyStatus(
    loyalty: LoyaltyStatus | null | undefined,
): loyalty is LoyaltyStatus {
    return (
        loyalty != null &&
        typeof loyalty.level?.id === 'string' &&
        loyalty.level.id.length > 0 &&
        typeof loyalty.level.label === 'string' &&
        loyalty.level.label.length > 0
    )
}

function loyaltyPayloadCandidates(data: unknown): unknown[] {
    if (data == null || typeof data !== 'object') return []
    const o = data as Record<string, unknown>
    const candidates: unknown[] = []
    if (o.loyalty !== undefined) candidates.push(o.loyalty)
    if (o.data != null && typeof o.data === 'object') {
        const inner = o.data as Record<string, unknown>
        if (inner.loyalty !== undefined) candidates.push(inner.loyalty)
        candidates.push(inner)
    }
    candidates.push(o)
    return candidates
}

/** Разбор тела GET …/loyalty и вложенных обёрток `{ loyalty }` / `{ data }`. */
export function parseLoyaltyApiResponse(data: unknown): LoyaltyStatus | null {
    for (const candidate of loyaltyPayloadCandidates(data)) {
        if (candidate == null) continue
        const crm = normalizeCrmLoyalty(candidate)
        if (crm) {
            const { history: _history, ...status } = crm
            return status
        }
        const status = normalizeLoyaltyStatus(candidate)
        if (status) return status
    }
    return null
}

/** CRM loyalty с журналом — тот же разбор, что и для списка. */
export function parseCrmLoyaltyApiResponse(data: unknown): CrmLoyalty | null {
    for (const candidate of loyaltyPayloadCandidates(data)) {
        if (candidate == null) continue
        const crm = normalizeCrmLoyalty(candidate)
        if (crm) return crm
        const status = normalizeLoyaltyStatus(candidate)
        if (status) return { ...status, history: [] }
    }
    return null
}

export const LOYALTY_SOURCE_LABELS: Record<string, string> = {
    order: 'Заказ',
    offline: 'Офлайн',
    admin_adjustment: 'Ручная правка',
    migration: 'Миграция',
}

export function loyaltySourceLabel(source: string): string {
    return LOYALTY_SOURCE_LABELS[source] ?? source
}

export function formatExpPoints(n: number): string {
    return n.toLocaleString('ru-RU')
}

/** Прогресс внутри текущего уровня до порога nextLevel (0–100). */
export function resolveLoyaltyProgressPercent(status: LoyaltyStatus): number {
    if (!status.nextLevel) return 100
    const floor = status.level.minPoints
    const ceiling = status.nextLevel.minPoints
    const span = ceiling - floor
    if (span <= 0) return 0
    const raw = ((status.expPoints - floor) / span) * 100
    return Math.min(100, Math.max(0, raw))
}
