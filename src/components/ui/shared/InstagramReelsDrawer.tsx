'use client'

import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { createPortal } from 'react-dom'
import { AxiosError } from 'axios'
import { UserApi } from '@/api/UserApi'
import {
    groupReelsByModeration,
    truncateReelUrl,
    type InstagramReelsByModeration,
    type UserInstagram,
    type UserInstagramReel,
} from '@/api/InstagramReelsApi'
import { instagramReelsUrlError, normalizeInstagramReelsUrl } from '@/utils/instagramReelsUrl'
import { useUserStore } from '@/zustand/user_store/UserStore'
import {
    instagramHandleError,
    normalizeInstagramHandle,
    sanitizeInstagramHandleInput,
} from '@/utils/instagramUsername'
import { instagramReelStatusLabel } from '@/utils/instagramReelUi'

const DRAWER_TRANSITION_MS = 320

type TabKey = 'pending' | 'approved' | 'rejected'

type Props = {
    isOpen: boolean
    onClose: () => void
    initialTab?: TabKey
    initialUsername?: string
    onUpdated?: (data: UserInstagram) => void
}

function fmtSubmittedAt(iso?: string): string | null {
    if (!iso) return null
    const date = new Date(iso)
    if (Number.isNaN(date.getTime())) return null
    return date.toLocaleDateString('ru-RU', {
        day: 'numeric',
        month: 'short',
        year: 'numeric',
    })
}

function ReelTabItem({ reel, tab }: { reel: UserInstagramReel; tab: TabKey }) {
    const submittedLabel = fmtSubmittedAt(reel.submittedAt)
    const statusText = tab === 'pending' ? 'На проверке' : instagramReelStatusLabel(reel)

    return (
        <div className="rounded-lg border border-white/10 bg-white/[0.04] px-2.5 py-2">
            <a
                href={reel.url}
                target="_blank"
                rel="noopener noreferrer"
                className="block truncate text-xs font-medium text-[#E1306C] hover:text-[#FCAF45]"
                title={reel.url}
            >
                {truncateReelUrl(reel.url, 48)}
            </a>
            <div className="mt-1 flex flex-wrap items-center gap-x-2 gap-y-0.5 text-[10px] leading-snug text-white/50">
                {submittedLabel ? <span>{submittedLabel}</span> : null}
                {tab !== 'rejected' ? <span className="text-white/65">{statusText}</span> : null}
                {tab === 'approved' && reel.pointsOnApprove != null ? (
                    <span className="text-[var(--mint-bright)]/80">+{reel.pointsOnApprove} pts</span>
                ) : null}
            </div>
            {tab === 'rejected' && reel.rejectionReason ? (
                <p className="mt-1 text-[11px] leading-snug text-[var(--pink-punk)]/90 line-clamp-3">
                    {reel.rejectionReason}
                </p>
            ) : null}
        </div>
    )
}

export default function InstagramReelsDrawer({
    isOpen,
    onClose,
    initialTab = 'pending',
    initialUsername = '',
    onUpdated,
}: Props) {
    const { user, patchInstagramUsername } = useUserStore()
    const [mounted, setMounted] = useState(false)
    const [drawerEntered, setDrawerEntered] = useState(false)
    const closingRef = useRef(false)
    const closeTimeoutRef = useRef<number | null>(null)

    const [tab, setTab] = useState<TabKey>(initialTab)
    const [instagram, setInstagram] = useState<UserInstagram | null>(null)
    const [loading, setLoading] = useState(false)
    const [loadError, setLoadError] = useState<string | null>(null)

    const [handle, setHandle] = useState('')
    const [url, setUrl] = useState('')
    const [submitError, setSubmitError] = useState<string | null>(null)
    const [submitting, setSubmitting] = useState(false)
    const [submitSuccess, setSubmitSuccess] = useState(false)

    const savedHandle = useMemo(() => {
        const fromInstagram = instagram?.username?.trim() || user.instagram?.username?.trim()
        const fromLegacy = user.instagramUsername?.trim()
        const fromProp = initialUsername?.trim()
        return normalizeInstagramHandle(fromInstagram || fromLegacy || fromProp || '')
    }, [initialUsername, instagram?.username, user.instagram?.username, user.instagramUsername])

    const reelsByModeration: InstagramReelsByModeration = useMemo(() => {
        if (instagram?.reelsByModeration) return instagram.reelsByModeration
        return groupReelsByModeration(instagram?.reels ?? [])
    }, [instagram])

    const tabReels = reelsByModeration[tab]

    const loadInstagram = useCallback(async () => {
        setLoading(true)
        setLoadError(null)
        try {
            const data = await UserApi.getInstagram()
            setInstagram(data)
            onUpdated?.(data)
        } catch {
            setLoadError('Не удалось загрузить Instagram Reels')
            setInstagram(null)
        } finally {
            setLoading(false)
        }
    }, [onUpdated])

    const requestCloseAnimated = useCallback(() => {
        if (closingRef.current || !isOpen) return
        closingRef.current = true
        setDrawerEntered(false)
        if (closeTimeoutRef.current) window.clearTimeout(closeTimeoutRef.current)
        closeTimeoutRef.current = window.setTimeout(() => {
            closeTimeoutRef.current = null
            closingRef.current = false
            onClose()
        }, DRAWER_TRANSITION_MS)
    }, [isOpen, onClose])

    useEffect(() => {
        setMounted(true)
    }, [])

    useEffect(() => {
        if (!isOpen) {
            closingRef.current = false
            if (closeTimeoutRef.current) {
                window.clearTimeout(closeTimeoutRef.current)
                closeTimeoutRef.current = null
            }
            setDrawerEntered(false)
            setSubmitError(null)
            setSubmitSuccess(false)
            setUrl('')
            return
        }

        setTab(initialTab)
        void loadInstagram()

        let rafMain = 0
        let rafNest = 0
        rafMain = requestAnimationFrame(() => {
            rafNest = requestAnimationFrame(() => setDrawerEntered(true))
        })
        return () => {
            cancelAnimationFrame(rafMain)
            cancelAnimationFrame(rafNest)
        }
    }, [isOpen, initialTab, loadInstagram])

    useEffect(() => {
        if (isOpen) setHandle(savedHandle)
    }, [isOpen, savedHandle])

    useEffect(() => {
        if (!isOpen) {
            document.body.style.overflow = ''
            return
        }
        document.body.style.overflow = 'hidden'
        return () => {
            document.body.style.overflow = ''
        }
    }, [isOpen])

    useEffect(() => {
        const onKeyDown = (e: KeyboardEvent) => {
            if (e.key === 'Escape' && isOpen) requestCloseAnimated()
        }
        window.addEventListener('keydown', onKeyDown)
        return () => window.removeEventListener('keydown', onKeyDown)
    }, [isOpen, requestCloseAnimated])

    useEffect(() => {
        return () => {
            if (closeTimeoutRef.current) window.clearTimeout(closeTimeoutRef.current)
        }
    }, [])

    const handleSubmit = async () => {
        setSubmitError(null)
        setSubmitSuccess(false)

        const normalizedHandle = normalizeInstagramHandle(handle)
        const handleValidationError = instagramHandleError(handle)
        if (handleValidationError) {
            setSubmitError(handleValidationError)
            return
        }

        const trimmedUrl = url.trim()
        const urlValidationError = instagramReelsUrlError(trimmedUrl)
        if (urlValidationError) {
            setSubmitError(urlValidationError)
            return
        }

        const normalizedUrl = normalizeInstagramReelsUrl(trimmedUrl)
        if (!normalizedUrl) {
            setSubmitError('Не удалось распознать ссылку на Reels')
            return
        }

        setSubmitting(true)
        try {
            if (normalizedHandle !== savedHandle) {
                const saveResult = await patchInstagramUsername(normalizedHandle)
                if (!saveResult.success) {
                    setSubmitError(saveResult.error ?? 'Не удалось сохранить Instagram username')
                    return
                }
            }

            await UserApi.submitInstagramReel({
                username: normalizedHandle,
                url: normalizedUrl,
            })

            setUrl('')
            setSubmitSuccess(true)
            setTab('pending')
            await loadInstagram()
        } catch (e: unknown) {
            const axiosError = e as AxiosError<{ message?: string; error?: string }>
            const msg =
                axiosError.response?.data?.message ??
                axiosError.response?.data?.error ??
                (e instanceof Error && e.message ? e.message : 'Не удалось отправить ссылку. Попробуйте позже.')
            setSubmitError(typeof msg === 'string' ? msg : 'Не удалось отправить ссылку. Попробуйте позже.')
        } finally {
            setSubmitting(false)
        }
    }

    const canSubmit = Boolean(normalizeInstagramHandle(handle)) && Boolean(url.trim())

    if (!mounted || !isOpen) return null

    const tabStyles: Record<TabKey, { active: string; inactive: string; countActive: string; countInactive: string }> = {
        pending: {
            active: 'border-amber-400/40 bg-amber-400/15 text-amber-200',
            inactive: 'border-transparent bg-white/[0.04] text-white/45 hover:border-amber-400/20 hover:bg-amber-400/10 hover:text-amber-200/80',
            countActive: 'text-amber-100',
            countInactive: 'text-white/35',
        },
        approved: {
            active: 'border-[var(--mint-bright)]/35 bg-[var(--mint-bright)]/15 text-[var(--mint-bright)]',
            inactive: 'border-transparent bg-white/[0.04] text-white/45 hover:border-[var(--mint-bright)]/20 hover:bg-[var(--mint-bright)]/10 hover:text-[var(--mint-bright)]/80',
            countActive: 'text-[var(--mint-bright)]',
            countInactive: 'text-white/35',
        },
        rejected: {
            active: 'border-[var(--pink-punk)]/40 bg-[var(--pink-punk)]/15 text-[var(--pink-punk)]',
            inactive: 'border-transparent bg-white/[0.04] text-white/45 hover:border-[var(--pink-punk)]/20 hover:bg-[var(--pink-punk)]/10 hover:text-[var(--pink-punk)]/80',
            countActive: 'text-[var(--pink-punk)]',
            countInactive: 'text-white/35',
        },
    }

    const tabBtn = (key: TabKey, label: string, count: number) => {
        const isActive = tab === key
        const styles = tabStyles[key]
        return (
            <button
                type="button"
                onClick={() => setTab(key)}
                className={`flex min-w-0 flex-1 items-center justify-center gap-1 rounded-md border px-1 py-1 text-[10px] font-semibold leading-none transition ${
                    isActive ? styles.active : styles.inactive
                }`}
            >
                <span className="truncate">{label}</span>
                <span className={`tabular-nums ${isActive ? styles.countActive : styles.countInactive}`}>{count}</span>
            </button>
        )
    }

    return createPortal(
        <div className="fixed inset-0" style={{ zIndex: 99998 }}>
            <div
                className="absolute inset-0 bg-black/55 backdrop-blur-[2px] transition-opacity ease-out"
                style={{
                    transitionDuration: `${DRAWER_TRANSITION_MS}ms`,
                    opacity: drawerEntered ? 1 : 0,
                }}
                onClick={() => {
                    if (!submitting) requestCloseAnimated()
                }}
                aria-hidden
            />

            <aside
                className="absolute inset-y-0 right-0 flex w-full flex-col overflow-hidden border-l border-white/[0.08] bg-[#0a0a0b]/[0.97] backdrop-blur-2xl transition-transform ease-out md:w-1/2 md:max-w-none"
                style={{
                    transitionDuration: `${DRAWER_TRANSITION_MS}ms`,
                    transform: drawerEntered ? 'translateX(0)' : 'translateX(100%)',
                    paddingTop: 'env(safe-area-inset-top)',
                    paddingBottom: 'env(safe-area-inset-bottom)',
                }}
                role="dialog"
                aria-modal="true"
                aria-labelledby="instagram-reels-drawer-title"
                onClick={(e) => e.stopPropagation()}
            >
                <div className="flex shrink-0 items-center justify-between border-b border-white/[0.06] px-4 py-3">
                    <h2 id="instagram-reels-drawer-title" className="text-sm font-bold text-white">
                        Instagram Reels
                    </h2>
                    <button
                        type="button"
                        onClick={() => requestCloseAnimated()}
                        disabled={submitting}
                        className="flex h-9 w-9 items-center justify-center rounded-full text-white/45 transition hover:bg-white/[0.06] hover:text-white"
                        aria-label="Закрыть"
                    >
                        <svg className="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                        </svg>
                    </button>
                </div>

                <div className="flex shrink-0 gap-1 border-b border-white/[0.06] px-3 py-2">
                    {tabBtn('pending', 'Проверка', reelsByModeration.pending.length)}
                    {tabBtn('approved', 'Одобрено', reelsByModeration.approved.length)}
                    {tabBtn('rejected', 'Отклонено', reelsByModeration.rejected.length)}
                </div>

                <div className="min-h-0 flex-1 overflow-y-auto px-3 py-2">
                    {loading ? (
                        <p className="py-8 text-center text-sm text-white/45">Загрузка…</p>
                    ) : loadError ? (
                        <div className="space-y-3 py-4">
                            <p className="text-sm text-[var(--pink-punk)]">{loadError}</p>
                            <button
                                type="button"
                                onClick={() => void loadInstagram()}
                                className="text-sm text-[var(--mint-bright)] underline"
                            >
                                Повторить
                            </button>
                        </div>
                    ) : tabReels.length === 0 ? (
                        <p className="rounded-lg border border-white/10 bg-white/[0.04] px-3 py-4 text-center text-[11px] text-white/45">
                            Пока нет роликов
                        </p>
                    ) : (
                        <div className="space-y-1.5">
                            {tabReels.map(reel => (
                                <ReelTabItem key={reel._id} reel={reel} tab={tab} />
                            ))}
                        </div>
                    )}
                </div>

                <div className="shrink-0 border-t border-white/[0.08] bg-[#0a0a0b] px-4 py-4">
                    <p className="mb-3 text-xs font-semibold text-white/70">Отправить новый Reels</p>

                    {submitSuccess ? (
                        <p className="mb-3 rounded-lg border border-[var(--mint-bright)]/30 bg-[var(--mint-bright)]/10 px-3 py-2 text-xs text-[var(--mint-bright)]">
                            Ссылка отправлена — проверим видео и начислим баллы после одобрения.
                        </p>
                    ) : null}

                    <label className="block text-[11px] font-medium text-white/50">Instagram username</label>
                    <div className="mt-1 flex items-center overflow-hidden rounded-xl border border-white/15 bg-white/[0.06] focus-within:border-[#E1306C]/60">
                        <span className="pl-3 text-sm text-white/45">@</span>
                        <input
                            type="text"
                            value={handle}
                            onChange={(e) => {
                                setHandle(sanitizeInstagramHandleInput(e.target.value))
                                if (submitError) setSubmitError(null)
                                if (submitSuccess) setSubmitSuccess(false)
                            }}
                            placeholder="username"
                            className="flex-1 bg-transparent py-2.5 pr-3 text-sm text-white placeholder-white/35 focus:outline-none"
                            disabled={submitting}
                            autoComplete="off"
                        />
                    </div>

                    <label className="mt-3 block text-[11px] font-medium text-white/50">Ссылка на Reels</label>
                    <input
                        type="url"
                        value={url}
                        onChange={(e) => {
                            setUrl(e.target.value.replace(/\s/g, ''))
                            if (submitError) setSubmitError(null)
                            if (submitSuccess) setSubmitSuccess(false)
                        }}
                        placeholder="https://www.instagram.com/reel/…"
                        className="mt-1 w-full rounded-xl border border-white/15 bg-white/[0.06] px-3 py-2.5 text-sm text-white placeholder-white/35 focus:border-[#E1306C]/60 focus:outline-none"
                        disabled={submitting}
                    />

                    {submitError ? <p className="mt-2 text-xs text-[var(--pink-punk)]">{submitError}</p> : null}

                    <button
                        type="button"
                        onClick={() => void handleSubmit()}
                        disabled={submitting || !canSubmit}
                        className="mt-3 w-full rounded-xl bg-[#E1306C] py-2.5 text-sm font-semibold text-white transition hover:bg-[#C13584] disabled:opacity-40"
                    >
                        {submitting ? 'Отправка…' : 'Отправить на проверку'}
                    </button>
                </div>
            </aside>
        </div>,
        document.body,
    )
}
