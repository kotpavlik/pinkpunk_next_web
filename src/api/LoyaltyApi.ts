/** Уровни лояльности — id с бэкенда, пороги не хардкодить для логики. */
export type LoyaltyLevelId =
    | 'explorer'
    | 'regular'
    | 'vibe_keeper'
    | 'insider'
    | 'legend'

/** Уровни с офлайн-подарком (Explorer — только скидка). */
export type LoyaltyGiftLevelId = Exclude<LoyaltyLevelId, 'explorer'>

export type LoyaltyGiftDisplayStatus = 'locked' | 'available' | 'requested' | 'issued'

export type LoyaltyGiftView = {
    levelId: LoyaltyGiftLevelId
    levelLabel: string
    status: LoyaltyGiftDisplayStatus
    claimCode?: string
    requestedAt?: string
    confirmedAt?: string
    issuedAt?: string
    issuedBy?: string
}

export type LoyaltyGiftClaimResponse = {
    levelId: LoyaltyGiftLevelId
    levelLabel: string
    status: 'requested' | 'issued'
    claimCode: string
    recipientName: string
    phone: string | null
    username: string | null
    expPoints: number
    coordinates: { lat: number; lng: number }
    addressLabel: string
    confirmedAt?: string
    issuedAt?: string
}

export const LOYALTY_GIFT_LEVEL_IDS: LoyaltyGiftLevelId[] = [
    'regular',
    'vibe_keeper',
    'insider',
    'legend',
]

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
    gifts?: Partial<Record<LoyaltyGiftLevelId, LoyaltyGiftView>>
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

const GIFT_STATUSES: LoyaltyGiftDisplayStatus[] = ['locked', 'available', 'requested', 'issued']

function isLoyaltyGiftLevelId(id: string): id is LoyaltyGiftLevelId {
    return LOYALTY_GIFT_LEVEL_IDS.includes(id as LoyaltyGiftLevelId)
}

export function resolveGiftLevelId(levelId: string | null | undefined): LoyaltyGiftLevelId | null {
    if (!levelId) return null
    const normalized = levelId.trim().toLowerCase().replace(/-/g, '_')
    return isLoyaltyGiftLevelId(normalized) ? normalized : null
}

function normalizeGift(raw: unknown): LoyaltyGiftView | null {
    if (!raw || typeof raw !== 'object') return null
    const o = raw as Record<string, unknown>
    const levelIdRaw = typeof o.levelId === 'string' ? o.levelId : ''
    if (!isLoyaltyGiftLevelId(levelIdRaw)) return null
    const statusRaw = typeof o.status === 'string' ? o.status : 'locked'
    const status = GIFT_STATUSES.includes(statusRaw as LoyaltyGiftDisplayStatus)
        ? (statusRaw as LoyaltyGiftDisplayStatus)
        : 'locked'
    const levelLabel =
        typeof o.levelLabel === 'string' && o.levelLabel.trim()
            ? o.levelLabel
            : levelIdRaw

    return {
        levelId: levelIdRaw,
        levelLabel,
        status,
        claimCode: typeof o.claimCode === 'string' ? o.claimCode : undefined,
        requestedAt: typeof o.requestedAt === 'string' ? o.requestedAt : undefined,
        confirmedAt: typeof o.confirmedAt === 'string' ? o.confirmedAt : undefined,
        issuedAt: typeof o.issuedAt === 'string' ? o.issuedAt : undefined,
        issuedBy: typeof o.issuedBy === 'string' ? o.issuedBy : undefined,
    }
}

function normalizeGifts(raw: unknown): Partial<Record<LoyaltyGiftLevelId, LoyaltyGiftView>> | undefined {
    if (!raw || typeof raw !== 'object') return undefined
    const o = raw as Record<string, unknown>
    const out: Partial<Record<LoyaltyGiftLevelId, LoyaltyGiftView>> = {}
    for (const key of LOYALTY_GIFT_LEVEL_IDS) {
        if (o[key] != null) {
            const gift = normalizeGift(o[key])
            if (gift) out[key] = gift
        }
    }
    return Object.keys(out).length > 0 ? out : undefined
}

export function normalizeLoyaltyGiftClaimResponse(raw: unknown): LoyaltyGiftClaimResponse | null {
    if (!raw || typeof raw !== 'object') return null
    const o = raw as Record<string, unknown>
    const levelIdRaw = typeof o.levelId === 'string' ? o.levelId : ''
    if (!isLoyaltyGiftLevelId(levelIdRaw)) return null
    const claimCode = typeof o.claimCode === 'string' ? o.claimCode : ''
    const recipientName = typeof o.recipientName === 'string' ? o.recipientName : ''
    const addressLabel = typeof o.addressLabel === 'string' ? o.addressLabel : ''
    const expPoints = asNumber(o.expPoints)
    const coordsRaw = o.coordinates
    if (!claimCode || !recipientName || expPoints === null) return null
    if (!coordsRaw || typeof coordsRaw !== 'object') return null
    const c = coordsRaw as Record<string, unknown>
    const lat = asNumber(c.lat)
    const lng = asNumber(c.lng)
    if (lat === null || lng === null) return null

    const statusRaw = o.status === 'issued' ? 'issued' : 'requested'

    return {
        levelId: levelIdRaw,
        levelLabel:
            typeof o.levelLabel === 'string' && o.levelLabel.trim() ? o.levelLabel : levelIdRaw,
        status: statusRaw,
        claimCode,
        recipientName,
        phone: typeof o.phone === 'string' ? o.phone : o.phone === null ? null : null,
        username: typeof o.username === 'string' ? o.username : o.username === null ? null : null,
        expPoints,
        coordinates: { lat, lng },
        addressLabel,
        confirmedAt: typeof o.confirmedAt === 'string' ? o.confirmedAt : undefined,
        issuedAt: typeof o.issuedAt === 'string' ? o.issuedAt : undefined,
    }
}

export function formatGiftCoordinates(coords: { lat: number; lng: number }): string {
    return `${coords.lat}, ${coords.lng}`
}

export const LOYALTY_GIFT_STATUS_LABELS: Record<LoyaltyGiftDisplayStatus, string> = {
    locked: 'Не достигнут',
    available: 'Доступен',
    requested: 'Запрошен',
    issued: 'Получен',
}

export function loyaltyGiftStatusLabel(status: LoyaltyGiftDisplayStatus | string): string {
    return LOYALTY_GIFT_STATUS_LABELS[status as LoyaltyGiftDisplayStatus] ?? status
}

/** Подарок уже выдан — повторный claim не нужен. */
export function isLoyaltyGiftAlreadyReceived(gift: LoyaltyGiftView | undefined): boolean {
    if (!gift) return false
    return gift.status === 'issued' || Boolean(gift.issuedAt?.trim())
}

/** Уровни с офлайн-подарком (explorer — только скидка). */
export function loyaltyLevelHasGift(levelId: string | null | undefined): levelId is LoyaltyGiftLevelId {
    return resolveGiftLevelId(levelId) != null
}

/** Regular — единственный уровень с кроликом (остальные flow — позже). */
export function loyaltyGiftLevelHasRabbitFlow(levelId: LoyaltyGiftLevelId): boolean {
    return levelId === 'regular'
}

export function normalizeGiftClaimCodeQuery(raw: string): string {
    return raw.trim().toUpperCase().replace(/\s+/g, '')
}

/** Похоже на код подарка (PP-A7K3 и т.п.) — для подгрузки gifts в CRM. */
export function looksLikeGiftClaimCodeSearch(raw: string): boolean {
    const n = normalizeGiftClaimCodeQuery(raw)
    if (n.length < 5) return false
    return /^PP-[A-Z0-9]+$/.test(n)
}

export function collectUserGiftClaimCodes(loyalty: LoyaltyStatus | null | undefined): string[] {
    const gifts = loyalty?.gifts
    if (!gifts) return []
    return Object.values(gifts)
        .map(g => g?.claimCode?.trim())
        .filter((code): code is string => !!code)
}

export function userMatchesGiftClaimCodeSearch(
    loyalty: LoyaltyStatus | null | undefined,
    query: string,
): boolean {
    const q = normalizeGiftClaimCodeQuery(query)
    if (!q) return false
    return collectUserGiftClaimCodes(loyalty).some(code => {
        const c = normalizeGiftClaimCodeQuery(code)
        return c.includes(q) || q.includes(c)
    })
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
    const gifts = normalizeGifts(o.gifts)

    return {
        expPoints,
        level,
        nextLevel,
        pointsToNextLevel,
        progressPercent,
        personalDiscountPercent,
        discount,
        gifts,
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

export type LeaderboardLevel = {
    id: LoyaltyLevelId | string
    label: string
}

export type LeaderboardEntry = {
    rank: number
    displayName: string
    level: LeaderboardLevel
    expPoints: number
}

export type LeaderboardCurrentUser = LeaderboardEntry & {
    inTop: boolean
}

export type LeaderboardResponse = {
    leaders: LeaderboardEntry[]
    totalParticipants: number
    currentUser?: LeaderboardCurrentUser
}

function normalizeLeaderboardLevel(raw: unknown): LeaderboardLevel | null {
    if (!raw || typeof raw !== 'object') return null
    const o = raw as Record<string, unknown>
    const id = typeof o.id === 'string' ? o.id : ''
    const label = typeof o.label === 'string' ? o.label : ''
    if (!id || !label) return null
    return { id, label }
}

function normalizeLeaderboardEntry(raw: unknown): LeaderboardEntry | null {
    if (!raw || typeof raw !== 'object') return null
    const o = raw as Record<string, unknown>
    const rank = typeof o.rank === 'number' && Number.isFinite(o.rank) ? o.rank : null
    const displayName = typeof o.displayName === 'string' ? o.displayName.trim() : ''
    const expPoints =
        typeof o.expPoints === 'number' && Number.isFinite(o.expPoints) ? o.expPoints : null
    const level = normalizeLeaderboardLevel(o.level)
    if (rank == null || !displayName || expPoints == null || !level) return null
    return { rank, displayName, level, expPoints }
}

function normalizeLeaderboardCurrentUser(raw: unknown): LeaderboardCurrentUser | null {
    const entry = normalizeLeaderboardEntry(raw)
    if (!entry || !raw || typeof raw !== 'object') return null
    const inTop = (raw as Record<string, unknown>).inTop === true
    return { ...entry, inTop }
}

function leaderboardPayloadCandidates(data: unknown): unknown[] {
    if (data == null || typeof data !== 'object') return []
    const o = data as Record<string, unknown>
    const candidates: unknown[] = []
    if (o.data != null && typeof o.data === 'object') candidates.push(o.data)
    candidates.push(o)
    return candidates
}

/** Разбор GET /loyalty/leaderboard. */
export function normalizeLeaderboardResponse(data: unknown): LeaderboardResponse | null {
    for (const candidate of leaderboardPayloadCandidates(data)) {
        if (!candidate || typeof candidate !== 'object') continue
        const o = candidate as Record<string, unknown>
        if (!Array.isArray(o.leaders)) continue

        const leaders = o.leaders
            .map(normalizeLeaderboardEntry)
            .filter((e): e is LeaderboardEntry => e != null)

        const totalParticipants =
            typeof o.totalParticipants === 'number' && Number.isFinite(o.totalParticipants)
                ? o.totalParticipants
                : leaders.length

        const currentUser =
            o.currentUser != null ? normalizeLeaderboardCurrentUser(o.currentUser) ?? undefined : undefined

        return { leaders, totalParticipants, currentUser }
    }
    return null
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
