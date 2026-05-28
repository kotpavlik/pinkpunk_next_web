export type InstagramReelModerationStatus = 'pending' | 'approved' | 'rejected'

export type InstagramReelViewsStatus =
    | 'not_applicable'
    | 'waiting_period'
    | 'due'
    | 'recorded'

export type UserInstagramReel = {
    _id: string
    url: string
    /** Instagram @username на момент отправки (если бэкенд отдаёт). */
    username?: string
    moderationStatus: InstagramReelModerationStatus
    submittedAt: string
    approvedAt?: string
    rejectedAt?: string
    rejectionReason?: string
    approvedBy?: string
    rejectedBy?: string
    viewsEligibleAt: string
    viewsStatus: InstagramReelViewsStatus
    viewCount?: number
    viewsRecordedAt?: string
    viewsRecordedBy?: string
    pointsOnApprove?: number
    pointsOnViews?: number
}

export type InstagramReelPointsReversed = {
    reversedApprove?: number
    reversedViews?: number
}

export function parseInstagramReelPointsReversed(data: unknown): InstagramReelPointsReversed | undefined {
    if (!data || typeof data !== 'object') return undefined
    const pointsRaw = (data as Record<string, unknown>).pointsReversed
    if (!pointsRaw || typeof pointsRaw !== 'object') return undefined
    const o = pointsRaw as Record<string, unknown>
    const reversedApprove = typeof o.reversedApprove === 'number' ? o.reversedApprove : undefined
    const reversedViews = typeof o.reversedViews === 'number' ? o.reversedViews : undefined
    if (reversedApprove == null && reversedViews == null) return undefined
    return { reversedApprove, reversedViews }
}

export function reelMayHavePointsToReverse(reel: UserInstagramReel): boolean {
    return (
        reel.moderationStatus === 'approved' ||
        (reel.pointsOnApprove ?? 0) > 0 ||
        (reel.pointsOnViews ?? 0) > 0
    )
}

export function formatInstagramReelPointsReversedMessage(
    pointsReversed?: InstagramReelPointsReversed,
): string | null {
    if (!pointsReversed) return null
    const parts: string[] = []
    if ((pointsReversed.reversedApprove ?? 0) > 0) {
        parts.push(`${pointsReversed.reversedApprove} pts за одобрение`)
    }
    if ((pointsReversed.reversedViews ?? 0) > 0) {
        parts.push(`${pointsReversed.reversedViews} pts за просмотры`)
    }
    if (parts.length === 0) return null
    return `Списано: ${parts.join(', ')}`
}

export type InstagramReelsByModeration = {
    pending: UserInstagramReel[]
    approved: UserInstagramReel[]
    rejected: UserInstagramReel[]
}

export type UserInstagram = {
    /** Instagram @username без @, lowercase */
    username: string
    reels: UserInstagramReel[]
    reelsByModeration?: InstagramReelsByModeration
    updatedAt?: string
}

export type InstagramReelsCounts = {
    approvedCount: number
    rejectedCount: number
    pendingCount: number
}

const MODERATION_STATUSES: InstagramReelModerationStatus[] = ['pending', 'approved', 'rejected']
const VIEWS_STATUSES: InstagramReelViewsStatus[] = [
    'not_applicable',
    'waiting_period',
    'due',
    'recorded',
]

function asString(v: unknown): string | undefined {
    return typeof v === 'string' && v.trim() ? v.trim() : undefined
}

function asNumber(v: unknown): number | undefined {
    if (typeof v === 'number' && !Number.isNaN(v)) return v
    if (typeof v === 'string' && v.trim() !== '') {
        const n = Number(v)
        if (!Number.isNaN(n)) return n
    }
    return undefined
}

function normalizeModerationStatus(raw: unknown): InstagramReelModerationStatus {
    const value = asString(raw)?.toLowerCase()
    if (value && MODERATION_STATUSES.includes(value as InstagramReelModerationStatus)) {
        return value as InstagramReelModerationStatus
    }
    return 'pending'
}

function normalizeViewsStatus(raw: unknown): InstagramReelViewsStatus {
    const value = asString(raw)?.toLowerCase()
    if (value && VIEWS_STATUSES.includes(value as InstagramReelViewsStatus)) {
        return value as InstagramReelViewsStatus
    }
    return 'not_applicable'
}

export function normalizeUserInstagramReel(raw: unknown): UserInstagramReel | null {
    if (!raw || typeof raw !== 'object') return null
    const o = raw as Record<string, unknown>
    const _id = asString(o._id) ?? asString(o.id)
    const url = asString(o.url) ?? asString(o.reelUrl) ?? asString(o.link)
    const submittedAt = asString(o.submittedAt) ?? asString(o.createdAt)
    if (!_id || !url || !submittedAt) return null

    const moderationStatus = normalizeModerationStatus(
        o.moderationStatus ?? o.status ?? o.reviewStatus ?? o.state,
    )
    const viewsStatus = normalizeViewsStatus(o.viewsStatus)
    const viewCount = asNumber(o.viewCount)

    return {
        _id,
        url,
        moderationStatus,
        submittedAt,
        approvedAt: asString(o.approvedAt),
        rejectedAt: asString(o.rejectedAt),
        rejectionReason:
            moderationStatus === 'rejected'
                ? asString(o.rejectionReason) ??
                  asString(o.rejectReason) ??
                  asString(o.reason)
                : asString(o.rejectionReason),
        approvedBy: asString(o.approvedBy),
        rejectedBy: asString(o.rejectedBy),
        viewsEligibleAt: asString(o.viewsEligibleAt) ?? submittedAt,
        viewsStatus,
        viewCount: viewCount ?? undefined,
        viewsRecordedAt: asString(o.viewsRecordedAt),
        viewsRecordedBy: asString(o.viewsRecordedBy),
        pointsOnApprove: asNumber(o.pointsOnApprove),
        pointsOnViews: asNumber(o.pointsOnViews),
        username: normalizeInstagramUsernameField(o) || undefined,
    }
}

function sortReelsNewestFirst(reels: UserInstagramReel[]): UserInstagramReel[] {
    return [...reels].sort(
        (a, b) => new Date(b.submittedAt).getTime() - new Date(a.submittedAt).getTime(),
    )
}

export function groupReelsByModeration(reels: UserInstagramReel[]): InstagramReelsByModeration {
    const sorted = sortReelsNewestFirst(reels)
    return {
        pending: sorted.filter(reel => reel.moderationStatus === 'pending'),
        approved: sorted.filter(reel => reel.moderationStatus === 'approved'),
        rejected: sorted.filter(reel => reel.moderationStatus === 'rejected'),
    }
}

function normalizeReelsByModeration(
    raw: unknown,
    reels: UserInstagramReel[],
): InstagramReelsByModeration {
    if (raw && typeof raw === 'object') {
        const o = raw as Record<string, unknown>
        const normalizeList = (value: unknown) =>
            (Array.isArray(value) ? value : [])
                .map(normalizeUserInstagramReel)
                .filter((item): item is UserInstagramReel => item != null)

        return {
            pending: sortReelsNewestFirst(normalizeList(o.pending)),
            approved: sortReelsNewestFirst(normalizeList(o.approved)),
            rejected: sortReelsNewestFirst(normalizeList(o.rejected)),
        }
    }
    return groupReelsByModeration(reels)
}

function normalizeInstagramUsernameField(o: Record<string, unknown>): string {
    return (
        asString(o.username) ??
        asString(o.instaUsername) ??
        asString(o.instagramUsername) ??
        asString(o.instagramHandle) ??
        ''
    )
}

export function normalizeUserInstagram(raw: unknown): UserInstagram {
    if (!raw || typeof raw !== 'object') {
        return { username: '', reels: [], reelsByModeration: { pending: [], approved: [], rejected: [] } }
    }
    const o = raw as Record<string, unknown>
    const username = normalizeInstagramUsernameField(o)

    const reelsRaw = Array.isArray(o.reels)
        ? o.reels
        : Array.isArray(o.submissions)
          ? o.submissions
          : Array.isArray(o.items)
            ? o.items
            : []

    const reels = reelsRaw
        .map(normalizeUserInstagramReel)
        .filter((item): item is UserInstagramReel => item != null)

    const reelsByModeration = normalizeReelsByModeration(o.reelsByModeration, reels)

    return {
        username: username.replace(/^@+/, '').toLowerCase(),
        reels: sortReelsNewestFirst(reels),
        reelsByModeration,
        updatedAt: asString(o.updatedAt),
    }
}

export function countInstagramReels(reels: UserInstagramReel[]): InstagramReelsCounts {
    return reels.reduce(
        (acc, reel) => {
            if (reel.moderationStatus === 'approved') acc.approvedCount += 1
            else if (reel.moderationStatus === 'rejected') acc.rejectedCount += 1
            else acc.pendingCount += 1
            return acc
        },
        { approvedCount: 0, rejectedCount: 0, pendingCount: 0 },
    )
}

export {
    instagramReelsUrlError,
    isLikelyInstagramReelsUrl,
    normalizeInstagramReelsUrl,
} from '@/utils/instagramReelsUrl'

export function truncateReelUrl(url: string, max = 48): string {
    if (url.length <= max) return url
    return `${url.slice(0, max - 1)}…`
}

export function computeViewsBonusPts(viewCount: number): number {
    if (!Number.isFinite(viewCount) || viewCount < 0) return 0
    return Math.floor(viewCount / 1000)
}

/** CRM: клиент в глобальном списке Reels (без Telegram @username). */
export type CrmInstagramReelCustomer = {
    personalFirstName?: string
    personalLastName?: string
    userPhoneNumber?: string
}

export type CrmInstagramReelListItem = {
    reel: UserInstagramReel
    accountId: string
    customer: CrmInstagramReelCustomer
    /** Instagram @username */
    username?: string
    highlightDue?: boolean
}

export type CrmInstagramReelsListResponse = {
    items: CrmInstagramReelListItem[]
    total: number
}

export type CrmInstagramReelsQuery = {
    moderationStatus?: InstagramReelModerationStatus
    viewsStatus?: InstagramReelViewsStatus
    dueOnly?: boolean
    page?: number
    limit?: number
    accountId?: string
}

function normalizeCrmInstagramReelCustomer(raw: unknown): CrmInstagramReelCustomer {
    if (!raw || typeof raw !== 'object') return {}
    const o = raw as Record<string, unknown>
    return {
        personalFirstName: asString(o.personalFirstName),
        personalLastName: asString(o.personalLastName),
        userPhoneNumber: asString(o.userPhoneNumber),
    }
}

function normalizeItemInstagramUsername(row: Record<string, unknown>): string | undefined {
    const fromRow =
        asString(row.username) ?? asString(row.instaUsername) ?? asString(row.instagramUsername)
    if (fromRow) return fromRow.replace(/^@+/, '').toLowerCase()

    const reelRaw = row.reel
    if (reelRaw && typeof reelRaw === 'object') {
        const fromReel = normalizeInstagramUsernameField(reelRaw as Record<string, unknown>)
        if (fromReel) return fromReel.replace(/^@+/, '').toLowerCase()
    }

    const instagramRaw = row.instagram
    if (instagramRaw && typeof instagramRaw === 'object') {
        const fromBlock = normalizeInstagramUsernameField(instagramRaw as Record<string, unknown>)
        if (fromBlock) return fromBlock.replace(/^@+/, '').toLowerCase()
    }

    return undefined
}

export function normalizeCrmInstagramReelsListResponse(raw: unknown): CrmInstagramReelsListResponse {
    if (!raw || typeof raw !== 'object') {
        return { items: [], total: 0 }
    }
    const o = raw as Record<string, unknown>
    const listRaw = Array.isArray(o.items)
        ? o.items
        : Array.isArray(o.reels)
          ? o.reels
          : Array.isArray(raw)
            ? raw
            : []

    const items = listRaw
        .map((entry): CrmInstagramReelListItem | null => {
            if (!entry || typeof entry !== 'object') return null
            const row = entry as Record<string, unknown>
            const reelRaw = row.reel ?? row
            const reel = normalizeUserInstagramReel(reelRaw)
            const accountId = asString(row.accountId) ?? asString(row.userId)
            if (!reel || !accountId) return null
            const customerRaw = row.customer ?? row.owner
            const customer = normalizeCrmInstagramReelCustomer(customerRaw)
            const username = normalizeItemInstagramUsername(row)
            return {
                reel,
                accountId,
                customer,
                username,
                highlightDue: row.highlightDue === true || reel.viewsStatus === 'due',
            }
        })
        .filter((item): item is CrmInstagramReelListItem => item != null)

    const total =
        typeof o.total === 'number' && !Number.isNaN(o.total) ? o.total : items.length

    return { items, total }
}
