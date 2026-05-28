import type { UserInstagramReel } from '@/api/InstagramReelsApi'

function fmtDate(iso?: string): string | null {
    if (!iso) return null
    const date = new Date(iso)
    if (Number.isNaN(date.getTime())) return null
    return date.toLocaleDateString('ru-RU', {
        day: 'numeric',
        month: 'short',
        year: 'numeric',
    })
}

const VIEWS_WAIT_MS = 14 * 24 * 60 * 60 * 1000

function getViewsEligibleMs(reel: Pick<UserInstagramReel, 'viewsEligibleAt' | 'submittedAt'>): number | null {
    if (reel.viewsEligibleAt) {
        const ms = new Date(reel.viewsEligibleAt).getTime()
        if (!Number.isNaN(ms)) return ms
    }
    if (reel.submittedAt) {
        const submittedMs = new Date(reel.submittedAt).getTime()
        if (!Number.isNaN(submittedMs)) return submittedMs + VIEWS_WAIT_MS
    }
    return null
}

export function getViewsEligibleRemainingMs(reel: UserInstagramReel, nowMs = Date.now()): number | null {
    const eligibleMs = getViewsEligibleMs(reel)
    if (eligibleMs == null) return null
    return eligibleMs - nowMs
}

function pad2(n: number): string {
    return String(n).padStart(2, '0')
}

function formatRemainingDuration(ms: number): string {
    let totalSeconds = Math.max(0, Math.floor(ms / 1000))
    const days = Math.floor(totalSeconds / 86_400)
    totalSeconds %= 86_400
    const hours = Math.floor(totalSeconds / 3_600)
    totalSeconds %= 3_600
    const minutes = Math.floor(totalSeconds / 60)
    const seconds = totalSeconds % 60

    return `${pad2(days)}д ${pad2(hours)}:${pad2(minutes)}:${pad2(seconds)}`
}

/** CRM: обратный отсчёт в колонке «Просмотры»; по окончании — нули. */
export function formatInstagramReelViewsCountdown(reel: UserInstagramReel, nowMs = Date.now()): string | null {
    if (reel.viewsStatus === 'recorded') return null
    if (reel.moderationStatus !== 'approved') return null

    const remainingMs = getViewsEligibleRemainingMs(reel, nowMs)
    if (remainingMs == null) return null

    return formatRemainingDuration(remainingMs)
}

/** CRM: обратный отсчёт до срока проверки просмотров (14 дней от submittedAt). */
export function instagramReelViewsCountdownText(reel: UserInstagramReel, nowMs = Date.now()): string | null {
    if (reel.viewsStatus === 'recorded') return null

    const remainingMs = getViewsEligibleRemainingMs(reel, nowMs)
    if (remainingMs == null) return null

    const eligibleLabel = fmtDate(reel.viewsEligibleAt)

    if (reel.moderationStatus === 'approved') {
        if (reel.viewsStatus === 'due' || remainingMs <= 0) {
            return formatRemainingDuration(0)
        }
        return formatRemainingDuration(remainingMs)
    }

    if (remainingMs > 0) {
        return formatRemainingDuration(remainingMs)
    }

    return eligibleLabel
        ? `Срок с ${eligibleLabel} — после одобрения сразу можно внести просмотры`
        : '14 дней с отправки прошли — после одобрения сразу можно внести просмотры'
}

export function instagramReelViewsCountdownIsDue(reel: UserInstagramReel, nowMs = Date.now()): boolean {
    if (reel.viewsStatus === 'recorded') return false
    if (reel.viewsStatus === 'due') return true
    if (reel.moderationStatus !== 'approved') return false
    const remainingMs = getViewsEligibleRemainingMs(reel, nowMs)
    return remainingMs != null && remainingMs <= 0
}

export function isInstagramReelViewsInputEnabled(reel: UserInstagramReel, nowMs = Date.now()): boolean {
    if (reel.moderationStatus !== 'approved') return false
    if (reel.viewsStatus === 'recorded') return false
    if (reel.viewsStatus === 'due') return true
    const remainingMs = getViewsEligibleRemainingMs(reel, nowMs)
    return remainingMs != null && remainingMs <= 0
}

export function shouldShowInstagramReelViewsButton(reel: UserInstagramReel): boolean {
    return reel.moderationStatus === 'approved' && reel.viewsStatus !== 'recorded'
}

export function instagramReelStatusLabel(reel: UserInstagramReel): string {
    const { moderationStatus, viewsStatus, viewsEligibleAt, viewCount, pointsOnViews } = reel

    if (moderationStatus === 'pending') {
        return 'На проверке'
    }

    if (moderationStatus === 'rejected') {
        return 'Отклонено'
    }

    if (moderationStatus === 'approved') {
        if (viewsStatus === 'waiting_period') {
            const dateLabel = fmtDate(viewsEligibleAt)
            return dateLabel
                ? `Одобрено. Просмотры можно проверить с ${dateLabel}`
                : 'Одобрено. Ожидаем срок проверки просмотров'
        }
        if (viewsStatus === 'due') {
            return 'Ожидаем проверку просмотров командой'
        }
        if (viewsStatus === 'recorded') {
            const views = viewCount ?? 0
            const pts =
                pointsOnViews != null
                    ? ` (+${pointsOnViews} pts за просмотры)`
                    : ''
            return `Просмотры учтены: ${views.toLocaleString('ru-RU')}${pts}`
        }
    }

    return '—'
}

export function instagramReelModerationBadgeClass(status: UserInstagramReel['moderationStatus']): string {
    switch (status) {
        case 'approved':
            return 'border-[var(--mint-bright)]/30 bg-[var(--mint-bright)]/10 text-[var(--mint-bright)]'
        case 'rejected':
            return 'border-[var(--pink-punk)]/30 bg-[var(--pink-punk)]/10 text-[var(--pink-punk)]'
        default:
            return 'border-amber-400/30 bg-amber-400/10 text-amber-200'
    }
}

export function instagramReelModerationBadgeLabel(status: UserInstagramReel['moderationStatus']): string {
    switch (status) {
        case 'approved':
            return 'Одобрено'
        case 'rejected':
            return 'Отклонено'
        default:
            return 'На проверке'
    }
}
