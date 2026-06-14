'use client'

import {
    createContext,
    useCallback,
    useContext,
    useEffect,
    useState,
    type ReactNode,
} from 'react'
import { createPortal } from 'react-dom'
import { XMarkIcon } from '@heroicons/react/24/outline'
import { UserApi } from '@/api/UserApi'
import {
    formatExpPoints,
    type LeaderboardEntry,
    type LeaderboardResponse,
} from '@/api/LoyaltyApi'
import { getLevelTheme } from '@/utils/loyaltyLevelTheme'
import { tokenManager } from '@/utils/TokenManager'

function formatRankPlace(rank: number): string {
    return `${rank}-м`
}

function LeaderboardRow({
    entry,
    highlighted = false,
    compact = false,
}: {
    entry: LeaderboardEntry
    highlighted?: boolean
    compact?: boolean
}) {
    const theme = getLevelTheme(entry.level.id)
    const isPodium = entry.rank <= 3

    return (
        <li
            className={`grid items-center gap-x-3 px-1 transition-colors duration-200 ${
                compact ? 'grid-cols-[2rem_1fr_auto] py-2' : 'grid-cols-[2.5rem_1fr_auto_auto] py-2.5 sm:grid-cols-[3rem_1fr_auto_auto] sm:py-3'
            } ${
                highlighted
                    ? 'rounded-lg bg-[var(--mint-bright)]/[0.07]'
                    : isPodium
                      ? 'rounded-lg bg-white/[0.02]'
                      : ''
            }`}
        >
            <span
                className={`font-durik font-black tabular-nums leading-none ${
                    compact ? 'text-lg' : 'text-xl sm:text-2xl'
                } ${isPodium ? 'text-[var(--mint-dark)]' : 'text-white/35'}`}
                aria-label={`Место ${entry.rank}`}
            >
                {entry.rank}
            </span>
            <div className="min-w-0">
                <p
                    className={`truncate font-durik font-black uppercase tracking-wide text-white/95 ${
                        compact ? 'text-[11px] sm:text-xs' : 'text-xs sm:text-sm'
                    }`}
                >
                    {entry.displayName}
                </p>
                <p
                    className={`truncate font-durik uppercase tracking-wider leading-tight ${
                        compact ? 'text-[9px]' : 'text-[10px] sm:text-[11px]'
                    }`}
                    style={{ color: theme.labelColor }}
                >
                    {entry.level.label}
                </p>
            </div>
            {!compact && (
                <span
                    className="hidden shrink-0 font-durik text-[10px] font-black uppercase tracking-wider sm:block sm:text-xs"
                    style={{ color: theme.labelColor }}
                >
                    {entry.level.label}
                </span>
            )}
            <span
                className={`shrink-0 text-right font-durik font-black tabular-nums leading-none text-[var(--mint-dark)] ${
                    compact ? 'text-[11px]' : 'text-xs sm:text-sm'
                }`}
            >
                {formatExpPoints(entry.expPoints)}
                <span className="ml-0.5 text-[0.85em] font-black text-white/40">pts</span>
            </span>
        </li>
    )
}

function LeaderboardSkeleton({ compact = false }: { compact?: boolean }) {
    return (
        <ul className={`flex flex-col ${compact ? 'gap-0.5' : 'gap-1'}`} aria-hidden>
            {Array.from({ length: 10 }, (_, i) => (
                <li
                    key={i}
                    className={`animate-pulse rounded-md bg-white/[0.04] ${compact ? 'h-10' : 'h-12 sm:h-14'}`}
                />
            ))}
        </ul>
    )
}

function LeaderboardTitle({ compact = false }: { compact?: boolean }) {
    return (
        <div className={compact ? 'mb-3' : 'mb-6 sm:mb-8'}>
            <h2
                className={`font-durik font-black uppercase leading-none tracking-tight text-[var(--mint-dark)] ${
                    compact ? 'text-2xl lg:text-3xl' : 'text-3xl sm:text-4xl md:text-5xl'
                }`}
            >
                ТОП-10
            </h2>
        </div>
    )
}

function LeaderboardBody({
    data,
    loading,
    error,
    isAuthenticated,
    compact = false,
    onRetry,
}: {
    data: LeaderboardResponse | null
    loading: boolean
    error: boolean
    isAuthenticated: boolean
    compact?: boolean
    onRetry: () => void
}) {
    const currentUser = data?.currentUser
    const highlightRank = currentUser?.inTop ? currentUser.rank : null

    return (
        <>
            <LeaderboardTitle compact={compact} />

            {loading && <LeaderboardSkeleton compact={compact} />}

            {!loading && error && (
                <div className={`text-center ${compact ? 'px-1 py-5' : 'px-4 py-8'}`}>
                    <p className={`font-durik text-white/55 ${compact ? 'text-xs' : 'text-sm'}`}>
                        Рейтинг временно недоступен
                    </p>
                    <button
                        type="button"
                        onClick={onRetry}
                        className={`mt-2 font-durik uppercase tracking-wide text-[var(--mint-dark)] underline-offset-2 hover:underline ${compact ? 'text-xs' : 'text-sm'}`}
                    >
                        Повторить
                    </button>
                </div>
            )}

            {!loading && !error && data && (
                <>
                    {data.leaders.length === 0 ? (
                        <p className={`text-center font-durik text-white/45 ${compact ? 'py-4 text-xs' : 'py-6 text-sm'}`}>
                            Пока никто не набрал pts — будь первым
                        </p>
                    ) : (
                        <ul className={`flex flex-col ${compact ? 'gap-0' : 'gap-0.5'}`}>
                            {data.leaders.map(entry => (
                                <LeaderboardRow
                                    key={entry.rank}
                                    entry={entry}
                                    highlighted={highlightRank === entry.rank}
                                    compact={compact}
                                />
                            ))}
                        </ul>
                    )}

                    {isAuthenticated && currentUser && (
                        <div className={compact ? 'mt-4 pt-1' : 'mt-6 pt-2'}>
                            <p className={`text-center font-durik leading-snug text-white/70 ${compact ? 'text-[10px]' : 'text-xs sm:text-sm'}`}>
                                Вы на{' '}
                                <span className="font-black text-[var(--mint-dark)]">
                                    {formatRankPlace(currentUser.rank)}
                                </span>{' '}
                                месте ·{' '}
                                <span
                                    className="font-black uppercase tracking-wide"
                                    style={{ color: getLevelTheme(currentUser.level.id).labelColor }}
                                >
                                    {currentUser.level.label}
                                </span>{' '}
                                ·{' '}
                                <span className="font-black tabular-nums text-[var(--mint-dark)]">
                                    {formatExpPoints(currentUser.expPoints)} pts
                                </span>
                            </p>
                        </div>
                    )}
                </>
            )}
        </>
    )
}

type LeaderboardHeroContextValue = {
    data: LeaderboardResponse | null
    loading: boolean
    error: boolean
    isAuthenticated: boolean
    load: () => void
    openModal: () => void
}

const LeaderboardHeroContext = createContext<LeaderboardHeroContextValue | null>(null)

function useLeaderboardHeroContext() {
    const ctx = useContext(LeaderboardHeroContext)
    if (!ctx) {
        throw new Error('Leaderboard hero components must be used within LoyaltyLeaderboardHeroRoot')
    }
    return ctx
}

function useLoyaltyLeaderboard() {
    const [data, setData] = useState<LeaderboardResponse | null>(null)
    const [loading, setLoading] = useState(true)
    const [error, setError] = useState(false)
    const [isAuthenticated, setIsAuthenticated] = useState(false)

    const load = useCallback(async () => {
        setLoading(true)
        setError(false)
        try {
            setIsAuthenticated(tokenManager.isAuthenticated())
            const response = await UserApi.getLeaderboard()
            setData(response)
        } catch {
            setData(null)
            setError(true)
        } finally {
            setLoading(false)
        }
    }, [])

    useEffect(() => {
        void load()
    }, [load])

    return { data, loading, error, isAuthenticated, load }
}

function LeaderboardModal({
    isOpen,
    onClose,
    data,
    loading,
    error,
    isAuthenticated,
    onRetry,
}: {
    isOpen: boolean
    onClose: () => void
    data: LeaderboardResponse | null
    loading: boolean
    error: boolean
    isAuthenticated: boolean
    onRetry: () => void
}) {
    const [mounted, setMounted] = useState(false)

    useEffect(() => {
        setMounted(true)
    }, [])

    useEffect(() => {
        if (!isOpen) return
        const prev = document.body.style.overflow
        document.body.style.overflow = 'hidden'
        return () => {
            document.body.style.overflow = prev
        }
    }, [isOpen])

    useEffect(() => {
        if (!isOpen) return
        const onKey = (e: KeyboardEvent) => {
            if (e.key === 'Escape') onClose()
        }
        window.addEventListener('keydown', onKey)
        return () => window.removeEventListener('keydown', onKey)
    }, [isOpen, onClose])

    if (!mounted || !isOpen) return null

    return createPortal(
        <div
            className="fixed inset-0 z-[10001] flex items-end justify-center bg-black/70 p-4 sm:items-center"
            role="presentation"
            onClick={onClose}
        >
            <div
                role="dialog"
                aria-modal="true"
                aria-labelledby="leaderboard-modal-title"
                className="w-full max-w-md rounded-t-2xl bg-[#0a0a0b]/98 backdrop-blur-xl sm:rounded-2xl"
                onClick={e => e.stopPropagation()}
            >
                <div className="flex items-center justify-end px-3 py-3">
                    <button
                        type="button"
                        onClick={onClose}
                        className="flex h-9 w-9 items-center justify-center rounded-full text-white/50 transition hover:bg-white/10 hover:text-white"
                        aria-label="Закрыть"
                    >
                        <XMarkIcon className="h-5 w-5" />
                    </button>
                </div>
                <div className="px-5 pb-8 pt-0">
                    <span id="leaderboard-modal-title" className="sr-only">
                        Список лидеров
                    </span>
                    <LeaderboardBody
                        data={data}
                        loading={loading}
                        error={error}
                        isAuthenticated={isAuthenticated}
                        onRetry={onRetry}
                    />
                </div>
            </div>
        </div>,
        document.body,
    )
}

export function LoyaltyLeaderboardHeroRoot({ children }: { children: ReactNode }) {
    const { data, loading, error, isAuthenticated, load } = useLoyaltyLeaderboard()
    const [modalOpen, setModalOpen] = useState(false)

    const openModal = useCallback(() => setModalOpen(true), [])
    const closeModal = useCallback(() => setModalOpen(false), [])

    return (
        <LeaderboardHeroContext.Provider
            value={{ data, loading, error, isAuthenticated, load, openModal }}
        >
            {children}
            <LeaderboardModal
                isOpen={modalOpen}
                onClose={closeModal}
                data={data}
                loading={loading}
                error={error}
                isAuthenticated={isAuthenticated}
                onRetry={() => void load()}
            />
        </LeaderboardHeroContext.Provider>
    )
}

export function LoyaltyLeaderboardDesktopPanel({ className = '' }: { className?: string }) {
    const { data, loading, error, isAuthenticated, load } = useLeaderboardHeroContext()

    return (
        <aside
            className={`hidden md:flex w-full max-w-[min(22rem,34vw)] shrink-0 flex-col p-1 lg:max-w-[340px] lg:p-2 ${className}`.trim()}
        >
            <LeaderboardBody
                data={data}
                loading={loading}
                error={error}
                isAuthenticated={isAuthenticated}
                compact
                onRetry={() => void load()}
            />
        </aside>
    )
}

export function LoyaltyLeaderboardMobileButton({ className = '' }: { className?: string }) {
    const { openModal } = useLeaderboardHeroContext()

    return (
        <button
            type="button"
            onClick={openModal}
            className={`md:hidden w-full px-6 py-3 sm:py-4 border-2 border-foreground/30 hover:border-mint-bright text-foreground hover:text-mint-bright font-cabinet-grotesk font-semibold rounded-lg transition-all duration-300 text-center text-sm sm:text-base ${className}`.trim()}
        >
            Список лидеров
        </button>
    )
}

/** @deprecated Используйте LoyaltyLeaderboardHeroRoot + DesktopPanel + MobileButton */
export default function LoyaltyLeaderboardOnHero() {
    return (
        <LoyaltyLeaderboardHeroRoot>
            <LoyaltyLeaderboardDesktopPanel />
            <LoyaltyLeaderboardMobileButton />
        </LoyaltyLeaderboardHeroRoot>
    )
}
