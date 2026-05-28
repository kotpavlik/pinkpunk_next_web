'use client'

import { useCallback, useEffect, useState, type ReactNode } from 'react'
import { createPortal } from 'react-dom'
import { ArrowPathIcon, EyeIcon, InformationCircleIcon, TrashIcon, XMarkIcon } from '@heroicons/react/24/outline'
import { CheckIcon, PlayIcon } from '@heroicons/react/24/solid'
import { isAxiosError } from 'axios'
import { CrmApi } from '@/api/CrmApi'
import type {
    CrmInstagramReelListItem,
    InstagramReelModerationStatus,
    InstagramReelViewsStatus,
    UserInstagram,
    UserInstagramReel,
} from '@/api/InstagramReelsApi'
import { computeViewsBonusPts, formatInstagramReelPointsReversedMessage, reelMayHavePointsToReverse } from '@/api/InstagramReelsApi'
import {
    formatInstagramReelViewsCountdown,
    instagramReelModerationBadgeClass,
    instagramReelModerationBadgeLabel,
    instagramReelViewsCountdownIsDue,
    isInstagramReelViewsInputEnabled,
    shouldShowInstagramReelViewsButton,
} from '@/utils/instagramReelUi'

const REJECTION_DRAWER_MS = 320

type RejectionDrawerShellProps = {
    title: string
    onClose: () => void
    children: ReactNode
    footer?: ReactNode | ((requestClose: () => void) => ReactNode)
}

function RejectionDrawerShell({ title, onClose, children, footer }: RejectionDrawerShellProps) {
    const [mounted, setMounted] = useState(false)
    const [entered, setEntered] = useState(false)

    const handleClose = useCallback(() => {
        setEntered(false)
        window.setTimeout(onClose, REJECTION_DRAWER_MS)
    }, [onClose])

    useEffect(() => {
        setMounted(true)
    }, [])

    useEffect(() => {
        if (!mounted) return
        const raf = requestAnimationFrame(() => setEntered(true))
        return () => cancelAnimationFrame(raf)
    }, [mounted])

    useEffect(() => {
        if (!mounted) return
        document.body.style.overflow = 'hidden'
        const onKeyDown = (e: KeyboardEvent) => {
            if (e.key === 'Escape') handleClose()
        }
        window.addEventListener('keydown', onKeyDown)
        return () => {
            document.body.style.overflow = ''
            window.removeEventListener('keydown', onKeyDown)
        }
    }, [handleClose, mounted])

    if (!mounted || typeof document === 'undefined' || !document.body) {
        return null
    }

    return createPortal(
        <div className="fixed inset-0" style={{ zIndex: 99999 }}>
            <div
                className="absolute inset-0 bg-black/55 backdrop-blur-[2px] transition-opacity ease-out"
                style={{
                    transitionDuration: `${REJECTION_DRAWER_MS}ms`,
                    opacity: entered ? 1 : 0,
                }}
                onClick={handleClose}
                aria-hidden
            />
            <aside
                className="absolute inset-y-0 right-0 flex w-full flex-col overflow-hidden border-l border-white/[0.08] bg-[#0a0a0b]/[0.97] backdrop-blur-2xl transition-transform ease-out md:w-1/2 md:max-w-none"
                style={{
                    transitionDuration: `${REJECTION_DRAWER_MS}ms`,
                    transform: entered ? 'translateX(0)' : 'translateX(100%)',
                    paddingTop: 'env(safe-area-inset-top)',
                    paddingBottom: 'env(safe-area-inset-bottom)',
                }}
                role="dialog"
                aria-modal="true"
                aria-labelledby="rejection-reason-drawer-title"
                onClick={(e) => e.stopPropagation()}
            >
                <div className="flex shrink-0 items-center justify-between border-b border-white/[0.06] px-4 py-3">
                    <h2 id="rejection-reason-drawer-title" className="text-sm font-bold text-white">
                        {title}
                    </h2>
                    <button
                        type="button"
                        onClick={handleClose}
                        className="flex h-9 w-9 items-center justify-center rounded-full text-white/45 transition hover:bg-white/[0.06] hover:text-white"
                        aria-label="Закрыть"
                    >
                        <XMarkIcon className="h-5 w-5" />
                    </button>
                </div>
                <div className="min-h-0 flex-1 overflow-y-auto px-5 py-6 sm:px-8">{children}</div>
                {footer ? (
                    <div className="shrink-0 border-t border-white/[0.08] bg-[#0a0a0b] px-5 py-4 sm:px-8">
                        {typeof footer === 'function' ? footer(handleClose) : footer}
                    </div>
                ) : null}
            </aside>
        </div>,
        document.body,
    )
}

function RejectionReasonViewDrawer({ reason, onClose }: { reason: string; onClose: () => void }) {
    return (
        <RejectionDrawerShell title="Причина отклонения" onClose={onClose}>
            <p className="text-sm leading-relaxed text-white/80 whitespace-pre-wrap">{reason}</p>
        </RejectionDrawerShell>
    )
}

function RejectionReasonFormDrawer({
    reason,
    mayReversePoints,
    busy,
    onReasonChange,
    onSubmit,
    onClose,
}: {
    reason: string
    mayReversePoints: boolean
    busy: boolean
    onReasonChange: (value: string) => void
    onSubmit: () => void
    onClose: () => void
}) {
    return (
        <RejectionDrawerShell
            title="Причина отклонения"
            onClose={onClose}
            footer={(requestClose) => (
                <div className="flex justify-end gap-2">
                    <button
                        type="button"
                        disabled={busy}
                        className="px-4 py-2 text-sm text-white/70 hover:text-white disabled:opacity-40"
                        onClick={requestClose}
                    >
                        Отмена
                    </button>
                    <button
                        type="button"
                        disabled={busy}
                        className="rounded bg-[var(--pink-punk)] px-4 py-2 text-sm font-semibold text-white disabled:opacity-40"
                        onClick={onSubmit}
                    >
                        Отклонить
                    </button>
                </div>
            )}
        >
            {mayReversePoints ? (
                <p className="mb-4 text-xs leading-relaxed text-amber-200/90">
                    Ролик уже был одобрен или по нему начислялись очки за просмотры — при отклонении бэкенд
                    автоматически спишет их у пользователя.
                </p>
            ) : null}
            <textarea
                value={reason}
                onChange={(e) => onReasonChange(e.target.value)}
                rows={8}
                maxLength={500}
                placeholder="10–500 символов"
                disabled={busy}
                className="w-full min-h-[12rem] resize-y rounded-lg border border-white/10 bg-white/[0.04] p-4 text-sm text-white placeholder:text-white/30 focus:border-[var(--pink-punk)]/40 focus:outline-none disabled:opacity-50"
            />
        </RejectionDrawerShell>
    )
}

function ReelViewsCountdownCell({ reel, nowMs }: { reel: UserInstagramReel; nowMs: number }) {
    if (reel.moderationStatus !== 'approved') {
        return <span className="text-white/30 text-xs">—</span>
    }

    if (reel.viewsStatus === 'recorded') {
        const views = reel.viewCount ?? 0
        const pts = reel.pointsOnViews != null ? ` (+${reel.pointsOnViews} pts)` : ''
        return (
            <span className="text-[10px] text-white/70 whitespace-nowrap">
                {views.toLocaleString('ru-RU')}
                {pts ? <span className="text-white/40">{pts}</span> : null}
            </span>
        )
    }

    const countdown = formatInstagramReelViewsCountdown(reel, nowMs)
    const isDue = instagramReelViewsCountdownIsDue(reel, nowMs)

    if (!countdown) {
        return <span className="text-white/30 text-xs">—</span>
    }

    return (
        <span
            className={`inline-block min-w-[7.5rem] font-mono text-[10px] tabular-nums leading-none ${
                isDue ? 'text-amber-200' : 'text-white/45'
            }`}
        >
            {countdown}
        </span>
    )
}

type FilterKey = 'all' | 'pending' | 'approved' | 'rejected' | 'due'

function formatSubmittedAt(iso?: string): string {
    if (!iso) return '—'
    try {
        return new Date(iso).toLocaleString('ru-RU', {
            day: '2-digit',
            month: '2-digit',
            hour: '2-digit',
            minute: '2-digit',
        })
    } catch {
        return iso
    }
}

function customerLabel(customer: CrmInstagramReelListItem['customer']): string {
    const name = [customer.personalFirstName, customer.personalLastName]
        .map(part => part?.trim())
        .filter((part): part is string => Boolean(part))
        .join(' ')
    if (name) return name
    return customer.userPhoneNumber?.trim() || '—'
}

function formatInstaUsername(raw?: string): string | null {
    const trimmed = raw?.trim().replace(/^@+/, '')
    return trimmed ? `@${trimmed}` : null
}

type ReelRowProps = {
    reel: UserInstagramReel
    accountId: string
    username?: string
    customer?: CrmInstagramReelListItem['customer']
    highlightDue?: boolean
    showClientColumn?: boolean
    showInstagramColumn?: boolean
    busy: boolean
    onApprove: (accountId: string, reelId: string) => void
    onReject: (accountId: string, reelId: string, reel: UserInstagramReel) => void
    onRecordViews: (accountId: string, reelId: string) => void
    onDelete: (accountId: string, reelId: string) => void
    onShowRejectionReason: (reason: string) => void
    onOpenClient?: (accountId: string) => void
}

function ReelRow({
    reel,
    accountId,
    username,
    customer,
    highlightDue,
    showClientColumn = false,
    showInstagramColumn = false,
    busy,
    onApprove,
    onReject,
    onRecordViews,
    onDelete,
    onShowRejectionReason,
    onOpenClient,
}: ReelRowProps) {
    const [nowMs, setNowMs] = useState(() => Date.now())

    useEffect(() => {
        const tick = () => setNowMs(Date.now())
        tick()
        const id = window.setInterval(tick, 1_000)
        return () => window.clearInterval(id)
    }, [])

    const canApprove = reel.moderationStatus !== 'approved'
    const canReject = reel.moderationStatus !== 'rejected'
    const showViewsButton = shouldShowInstagramReelViewsButton(reel)
    const viewsButtonEnabled = isInstagramReelViewsInputEnabled(reel, nowMs)
    const instaLabel = formatInstaUsername(username)
    const rejectionReason = reel.rejectionReason?.trim() || null

    return (
        <tr
            className={`border-b border-[#333] text-sm ${
                highlightDue || reel.viewsStatus === 'due' || viewsButtonEnabled
                    ? 'bg-amber-500/10'
                    : ''
            }`}
        >
            {showClientColumn ? (
                <td className="px-1.5 py-1 align-middle">
                    {customer && onOpenClient ? (
                        <button
                            type="button"
                            className="max-w-[7rem] truncate text-left text-[var(--mint-bright)] hover:underline text-[10px]"
                            onClick={() => onOpenClient(accountId)}
                            title={customerLabel(customer)}
                        >
                            {customerLabel(customer)}
                        </button>
                    ) : (
                        <span className="text-white/70 text-[10px]">—</span>
                    )}
                </td>
            ) : null}
            {showInstagramColumn ? (
                <td className="px-1.5 py-1 align-middle text-[10px] text-white/80 whitespace-nowrap">
                    {instaLabel ?? '—'}
                </td>
            ) : null}
            <td className="px-1.5 py-1 align-middle whitespace-nowrap">
                <a
                    href={reel.url}
                    target="_blank"
                    rel="noopener noreferrer"
                    title={reel.url}
                    className="inline-flex items-center gap-1 rounded px-1 py-0.5 text-[10px] font-medium text-[#E1306C] hover:bg-[#E1306C]/10 hover:text-[#FCAF45]"
                >
                    <PlayIcon className="h-3 w-3 shrink-0" aria-hidden />
                    Смотреть
                </a>
            </td>
            <td className="px-1.5 py-1 align-middle text-[10px] text-white/55 whitespace-nowrap">
                {formatSubmittedAt(reel.submittedAt)}
            </td>
            <td className="px-1.5 py-1 align-middle whitespace-nowrap">
                <div className="inline-flex items-center gap-0.5">
                    <span
                        className={`inline-flex rounded border px-1 py-0.5 text-[9px] font-semibold uppercase ${instagramReelModerationBadgeClass(reel.moderationStatus)}`}
                    >
                        {instagramReelModerationBadgeLabel(reel.moderationStatus)}
                    </span>
                    <span className="inline-flex h-5 w-5 shrink-0 items-center justify-center">
                        {rejectionReason ? (
                            <button
                                type="button"
                                onClick={() => onShowRejectionReason(rejectionReason)}
                                title="Причина отклонения"
                                className="inline-flex h-5 w-5 items-center justify-center rounded text-[var(--pink-punk)] hover:bg-[var(--pink-punk)]/15"
                            >
                                <InformationCircleIcon className="h-3.5 w-3.5" />
                            </button>
                        ) : null}
                    </span>
                </div>
            </td>
            <td className="px-1.5 py-1 align-middle">
                <ReelViewsCountdownCell reel={reel} nowMs={nowMs} />
            </td>
            <td className="px-1.5 py-1 align-middle">
                <div className="flex flex-nowrap items-center gap-0.5 whitespace-nowrap">
                    {canApprove ? (
                        <button
                            type="button"
                            disabled={busy}
                            onClick={() => onApprove(accountId, reel._id)}
                            title="Одобрить"
                            className="inline-flex h-6 w-6 items-center justify-center rounded bg-[var(--mint-bright)]/15 text-[var(--mint-bright)] hover:bg-[var(--mint-bright)]/25 disabled:opacity-40"
                        >
                            <CheckIcon className="h-3.5 w-3.5" />
                        </button>
                    ) : null}
                    {canReject ? (
                        <button
                            type="button"
                            disabled={busy}
                            onClick={() => onReject(accountId, reel._id, reel)}
                            title="Отклонить"
                            className="inline-flex h-6 w-6 items-center justify-center rounded bg-[var(--pink-punk)]/15 text-[var(--pink-punk)] hover:bg-[var(--pink-punk)]/25 disabled:opacity-40"
                        >
                            <XMarkIcon className="h-3.5 w-3.5" />
                        </button>
                    ) : null}
                    {showViewsButton ? (
                        <button
                            type="button"
                            disabled={busy || !viewsButtonEnabled}
                            onClick={() => onRecordViews(accountId, reel._id)}
                            title={!viewsButtonEnabled ? 'Дождитесь окончания отсчёта' : 'Просмотры'}
                            className="inline-flex h-6 w-6 items-center justify-center rounded bg-amber-400/15 text-amber-200 hover:bg-amber-400/25 disabled:cursor-not-allowed disabled:opacity-40"
                        >
                            <EyeIcon className="h-3.5 w-3.5" />
                        </button>
                    ) : null}
                    <button
                        type="button"
                        disabled={busy}
                        onClick={() => onDelete(accountId, reel._id)}
                        title="Удалить"
                        className="inline-flex h-6 w-6 items-center justify-center rounded bg-white/10 text-white/55 hover:bg-white/15 hover:text-white/80 disabled:opacity-40"
                    >
                        <TrashIcon className="h-3.5 w-3.5" />
                    </button>
                </div>
            </td>
        </tr>
    )
}

type UserTabProps = {
    mode: 'user'
    accountId: string
    instagram: UserInstagram | null
    onRefresh: () => void
    onLoyaltyRefresh?: () => void
    onError: (message: string | null) => void
}

type GlobalTabProps = {
    mode: 'global'
    onOpenClient: (accountId: string) => void
    onError: (message: string | null) => void
    refreshKey?: number
}

type Props = UserTabProps | GlobalTabProps

export default function AdminCrmInstagramReelsPanel(props: Props) {
    const [filter, setFilter] = useState<FilterKey>('all')
    const [loading, setLoading] = useState(false)
    const [busyReelId, setBusyReelId] = useState<string | null>(null)
    const [globalItems, setGlobalItems] = useState<CrmInstagramReelListItem[]>([])
    const [rejectTarget, setRejectTarget] = useState<{
        accountId: string
        reelId: string
        reel: UserInstagramReel
    } | null>(null)
    const [rejectReason, setRejectReason] = useState('')
    const [viewsTarget, setViewsTarget] = useState<{ accountId: string; reelId: string } | null>(null)
    const [viewCountInput, setViewCountInput] = useState('')
    const [deleteTarget, setDeleteTarget] = useState<{ accountId: string; reelId: string } | null>(null)
    const [viewRejectionReason, setViewRejectionReason] = useState<string | null>(null)
    const [actionNotice, setActionNotice] = useState<string | null>(null)

    const onError = props.onError

    const loadGlobal = useCallback(async () => {
        if (props.mode !== 'global') return
        setLoading(true)
        onError(null)
        try {
            const query: {
                moderationStatus?: InstagramReelModerationStatus
                viewsStatus?: InstagramReelViewsStatus
                dueOnly?: boolean
                limit?: number
            } = { limit: 100 }

            if (filter === 'pending') query.moderationStatus = 'pending'
            if (filter === 'approved') query.moderationStatus = 'approved'
            if (filter === 'rejected') query.moderationStatus = 'rejected'
            if (filter === 'due') query.dueOnly = true

            const data = await CrmApi.getInstagramReels(query)
            setGlobalItems(data.items)
        } catch (e) {
            const msg = isAxiosError(e)
                ? String(e.response?.data?.message ?? e.message)
                : 'Не удалось загрузить Reels'
            onError(msg)
        } finally {
            setLoading(false)
        }
    }, [filter, onError, props.mode])

    const globalRefreshKey = props.mode === 'global' ? props.refreshKey : undefined

    useEffect(() => {
        if (props.mode === 'global') void loadGlobal()
    }, [loadGlobal, props.mode, globalRefreshKey])

    const refresh = () => {
        if (props.mode === 'global') void loadGlobal()
        else props.onRefresh()
    }

    const userRows: CrmInstagramReelListItem[] =
        props.mode === 'user' && props.instagram
            ? props.instagram.reels.map(reel => ({
                  reel,
                  accountId: props.accountId,
                  customer: {},
                  username: props.instagram?.username,
                  highlightDue: reel.viewsStatus === 'due',
              }))
            : []

    const filteredUserRows =
        props.mode === 'user'
            ? userRows.filter(({ reel }) => {
                  if (filter === 'all') return true
                  if (filter === 'due') return reel.viewsStatus === 'due'
                  return reel.moderationStatus === filter
              })
            : []

    const rows = props.mode === 'global' ? globalItems : filteredUserRows

    const runAction = async (fn: () => Promise<void>, refreshLoyalty = false) => {
        try {
            await fn()
            refresh()
            if (refreshLoyalty && props.mode === 'user') {
                props.onLoyaltyRefresh?.()
            }
        } catch (e) {
            setActionNotice(null)
            const msg = isAxiosError(e)
                ? String(e.response?.data?.message ?? e.message)
                : 'Операция не выполнена'
            onError(msg)
        }
    }

    const handleApprove = (accountId: string, reelId: string) => {
        setBusyReelId(reelId)
        void runAction(async () => {
            await CrmApi.approveInstagramReel(accountId, reelId)
        }, true).finally(() => setBusyReelId(null))
    }

    const submitReject = () => {
        if (!rejectTarget) return
        const reason = rejectReason.trim()
        if (reason.length < 10) {
            onError('Причина отклонения — от 10 до 500 символов')
            return
        }
        if (reason.length > 500) {
            onError('Причина отклонения — не более 500 символов')
            return
        }
        setBusyReelId(rejectTarget.reelId)
        const shouldRefreshLoyalty = reelMayHavePointsToReverse(rejectTarget.reel)
        void runAction(async () => {
            const { pointsReversed } = await CrmApi.rejectInstagramReel(
                rejectTarget.accountId,
                rejectTarget.reelId,
                reason,
            )
            setRejectTarget(null)
            setRejectReason('')
            onError(null)
            const reversedMsg = formatInstagramReelPointsReversedMessage(pointsReversed)
            setActionNotice(reversedMsg)
        }, shouldRefreshLoyalty).finally(() => setBusyReelId(null))
    }

    const submitViews = () => {
        if (!viewsTarget) return
        const n = Number(viewCountInput.replace(/\s+/g, ''))
        if (!Number.isInteger(n) || n < 0) {
            onError('viewCount — целое число >= 0')
            return
        }
        setBusyReelId(viewsTarget.reelId)
        void runAction(async () => {
            await CrmApi.recordInstagramReelViews(viewsTarget.accountId, viewsTarget.reelId, n)
            setViewsTarget(null)
            setViewCountInput('')
        }, true).finally(() => setBusyReelId(null))
    }

    const submitDelete = () => {
        if (!deleteTarget) return
        setBusyReelId(deleteTarget.reelId)
        void runAction(async () => {
            await CrmApi.deleteInstagramReel(deleteTarget.accountId, deleteTarget.reelId)
            setDeleteTarget(null)
        }, true).finally(() => setBusyReelId(null))
    }

    const instagramUsername = props.mode === 'user' ? props.instagram?.username : undefined
    const instagramUsernameLabel = formatInstaUsername(instagramUsername)
    const isGlobal = props.mode === 'global'
    const columnCount = isGlobal ? 7 : 5
    const rejectMayReversePoints = rejectTarget ? reelMayHavePointsToReverse(rejectTarget.reel) : false
    const previewBonus = Number(viewCountInput.replace(/\s+/g, ''))
    const previewPts = Number.isFinite(previewBonus) && previewBonus >= 0 ? computeViewsBonusPts(previewBonus) : 0

    const filterBtn = (key: FilterKey, label: string) => (
        <button
            type="button"
            onClick={() => setFilter(key)}
            className={`rounded px-2 py-0.5 text-[11px] font-medium transition ${
                filter === key
                    ? 'bg-[var(--mint-bright)]/20 text-[var(--mint-bright)]'
                    : 'bg-white/5 text-white/55 hover:text-white/80'
            }`}
        >
            {label}
        </button>
    )

    return (
        <div className="space-y-2">
            {props.mode === 'user' ? (
                <div className="flex flex-wrap items-center justify-between gap-2">
                    <p className="text-xs text-white/60">
                        <span className="text-white/40">Instagram:</span>{' '}
                        {instagramUsernameLabel ?? 'не указан'}
                    </p>
                    <button
                        type="button"
                        onClick={refresh}
                        disabled={loading}
                        className="inline-flex items-center gap-1 rounded bg-white/10 px-2 py-1 text-[11px] text-white/75 hover:bg-white/15 disabled:opacity-50"
                    >
                        <ArrowPathIcon className={`h-3.5 w-3.5 ${loading ? 'animate-spin' : ''}`} />
                        Обновить
                    </button>
                </div>
            ) : null}

            <div className="flex flex-wrap gap-1.5">
                {filterBtn('all', 'Все')}
                {filterBtn('pending', 'На проверке')}
                {filterBtn('approved', 'Одобрено')}
                {filterBtn('rejected', 'Отклонено')}
                {filterBtn('due', 'Пора внести просмотры')}
            </div>

            {actionNotice ? (
                <p className="rounded border border-[var(--mint-bright)]/25 bg-[var(--mint-bright)]/10 px-2 py-1.5 text-[11px] text-[var(--mint-bright)]">
                    {actionNotice}
                </p>
            ) : null}

            <div className="overflow-x-auto rounded border border-[#333]">
                <table className="min-w-full text-left">
                    <thead className="bg-[#1a1a1a] text-[10px] uppercase tracking-wide text-white/45">
                        <tr>
                            {isGlobal ? <th className="px-1.5 py-1">Клиент</th> : null}
                            {isGlobal ? <th className="px-1.5 py-1">username</th> : null}
                            <th className="px-1.5 py-1">Reels</th>
                            <th className="px-1.5 py-1">Отправлен</th>
                            <th className="px-1.5 py-1">Модерация</th>
                            <th className="px-1.5 py-1 w-[7.5rem]">Просмотры</th>
                            <th className="px-1.5 py-1">Действия</th>
                        </tr>
                    </thead>
                    <tbody>
                        {rows.length === 0 ? (
                            <tr>
                                <td
                                    colSpan={columnCount}
                                    className="px-2 py-4 text-center text-xs text-white/45"
                                >
                                    {loading ? 'Загрузка…' : 'Reels не найдены'}
                                </td>
                            </tr>
                        ) : (
                            rows.map(({ reel, accountId, customer, username: rowUsername, highlightDue }) => (
                                <ReelRow
                                    key={`${accountId}-${reel._id}`}
                                    reel={reel}
                                    accountId={accountId}
                                    username={rowUsername}
                                    customer={customer}
                                    highlightDue={highlightDue}
                                    showClientColumn={isGlobal}
                                    showInstagramColumn={isGlobal}
                                    busy={busyReelId === reel._id}
                                    onApprove={handleApprove}
                                    onReject={(acc, id, reel) => {
                                        setRejectTarget({ accountId: acc, reelId: id, reel })
                                        setRejectReason('')
                                        setActionNotice(null)
                                        onError(null)
                                    }}
                                    onRecordViews={(acc, id) => {
                                        setViewsTarget({ accountId: acc, reelId: id })
                                        setViewCountInput('')
                                        onError(null)
                                    }}
                                    onDelete={(acc, id) => {
                                        setDeleteTarget({ accountId: acc, reelId: id })
                                        onError(null)
                                    }}
                                    onShowRejectionReason={setViewRejectionReason}
                                    onOpenClient={isGlobal ? props.onOpenClient : undefined}
                                />
                            ))
                        )}
                    </tbody>
                </table>
            </div>

            {rejectTarget ? (
                <RejectionReasonFormDrawer
                    reason={rejectReason}
                    mayReversePoints={rejectMayReversePoints}
                    busy={busyReelId === rejectTarget.reelId}
                    onReasonChange={setRejectReason}
                    onSubmit={submitReject}
                    onClose={() => {
                        setRejectTarget(null)
                        setRejectReason('')
                    }}
                />
            ) : null}

            {viewsTarget ? (
                <div className="fixed inset-0 z-[120] flex items-center justify-center bg-black/70 p-4">
                    <div className="w-full max-w-md rounded-lg border border-[#444] bg-[#252525] p-4">
                        <h4 className="text-white font-semibold mb-2">Подтвердить просмотры</h4>
                        <input
                            type="text"
                            inputMode="numeric"
                            pattern="[0-9]*"
                            value={viewCountInput}
                            onChange={(e) => setViewCountInput(e.target.value.replace(/\D/g, ''))}
                            onWheel={(e) => e.currentTarget.blur()}
                            className="w-full rounded border border-[#444] bg-[#1a1a1a] p-3 text-sm text-white"
                            placeholder="Число просмотров"
                        />
                        <p className="mt-2 text-sm text-amber-200/90">
                            Будет начислено: {previewPts} pts
                        </p>
                        <div className="mt-3 flex justify-end gap-2">
                            <button
                                type="button"
                                className="px-3 py-1.5 text-sm text-white/70"
                                onClick={() => setViewsTarget(null)}
                            >
                                Отмена
                            </button>
                            <button
                                type="button"
                                className="px-3 py-1.5 rounded bg-amber-400 text-sm font-semibold text-black"
                                onClick={submitViews}
                            >
                                Подтвердить
                            </button>
                        </div>
                    </div>
                </div>
            ) : null}

            {viewRejectionReason ? (
                <RejectionReasonViewDrawer
                    reason={viewRejectionReason}
                    onClose={() => setViewRejectionReason(null)}
                />
            ) : null}

            {deleteTarget ? (
                <div className="fixed inset-0 z-[120] flex items-center justify-center bg-black/70 p-4">
                    <div className="w-full max-w-md rounded-lg border border-[#444] bg-[#252525] p-4">
                        <h4 className="text-white font-semibold mb-2">Удалить заявку Reels?</h4>
                        <p className="text-sm text-white/60 leading-relaxed">
                            Запись будет удалена из профиля клиента. Если очки уже начислялись, бэкенд откатит их
                            автоматически.
                        </p>
                        <div className="mt-3 flex justify-end gap-2">
                            <button
                                type="button"
                                className="px-3 py-1.5 text-sm text-white/70"
                                onClick={() => setDeleteTarget(null)}
                            >
                                Отмена
                            </button>
                            <button
                                type="button"
                                className="px-3 py-1.5 rounded bg-red-500 text-sm font-semibold text-white"
                                onClick={submitDelete}
                            >
                                Удалить
                            </button>
                        </div>
                    </div>
                </div>
            ) : null}
        </div>
    )
}
