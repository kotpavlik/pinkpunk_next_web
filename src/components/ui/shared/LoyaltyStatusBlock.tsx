'use client'

import {
    useCallback,
    useEffect,
    useRef,
    useState,
    type KeyboardEvent,
    type ReactNode,
} from 'react'
import { createPortal } from 'react-dom'
import { useRouter } from 'next/navigation'
import {
    formatExpPoints,
    resolveEffectiveDiscountPercent,
    resolveLoyaltyProgressPercent,
    type LoyaltyStatus,
} from '@/api/LoyaltyApi'
import { resolveLoyaltyDiscountColor } from '@/utils/fixedDiscountPercentColor'
import {
    CheckCircleIcon,
    KeyIcon,
    MapIcon,
    StarIcon,
    TrophyIcon,
    LockClosedIcon,
} from '@heroicons/react/24/outline'
import {
    EXPLORER_LEVEL_DISCOUNT_PERCENT,
    getLevelTheme,
    getLadderItem,
    LOYALTY_LADDER,
    resolveLadderState,
    type LadderItemState,
} from '@/utils/loyaltyLevelTheme'

type Props = {
    status: LoyaltyStatus | null
    loading?: boolean
    error?: string | null
    onRetry?: () => void
    className?: string
    embedded?: boolean
    /** Не дублировать заголовок уровня (если он рядом с аватаром) */
    hideLevelTitle?: boolean
    /** Сетка уровней (в профиле — отдельным блоком снизу страницы) */
    hideLevels?: boolean
}

function LevelIcon({ id, className, color }: { id: string; className?: string; color: string }) {
    const cn = className ?? 'h-4 w-4'
    const icon =
        id === 'explorer' ? (
            <MapIcon className={cn} strokeWidth={1.5} />
        ) : id === 'regular' ? (
            <CheckCircleIcon className={cn} strokeWidth={1.5} />
        ) : id === 'vibe_keeper' ? (
            <StarIcon className={cn} strokeWidth={1.5} />
        ) : id === 'insider' ? (
            <KeyIcon className={cn} strokeWidth={1.5} />
        ) : (
            <TrophyIcon className={cn} strokeWidth={1.5} />
        )
    return (
        <span className="inline-flex mx-auto" style={{ color }}>
            {icon}
        </span>
    )
}

type AvatarRingProps = {
    levelId?: string | null
    loading?: boolean
    className?: string
    children: ReactNode
}

export function LoyaltyAvatarRing({ levelId, loading, className = '', children }: AvatarRingProps) {
    if (loading || !levelId) {
        return (
            <div
                className={`rounded-full border-2 border-white/20 bg-white/10 flex items-center justify-center overflow-hidden transition-[box-shadow,border-color] duration-300 ${className}`}
            >
                {children}
            </div>
        )
    }

    const theme = getLevelTheme(levelId)

    return (
        <div
            className={`rounded-full overflow-hidden flex items-center justify-center loyalty-avatar-ring shrink-0 ${className}`}
            style={theme.avatarRingStyle}
        >
            <div className="rounded-full bg-white/10 flex items-center justify-center overflow-hidden w-full h-full">
                {children}
            </div>
        </div>
    )
}

/** Заголовок уровня рядом с аватаром */
export function LoyaltyLevelHeader({
    status,
    loading,
}: {
    status: LoyaltyStatus | null
    loading?: boolean
}) {
    if (loading || !status) {
        return <div className="h-12 w-32 bg-white/5 rounded animate-pulse" />
    }

    const theme = getLevelTheme(status.level.id)

    return (
        <div className="text-left min-w-0 flex-1">
            <p className="text-lg md:text-xl font-bold font-durik leading-tight truncate" style={{ color: theme.labelColor }}>
                {status.level.label}
            </p>
            <p className="text-[10px] text-white/45 mt-1">{theme.expRangeLabel}</p>
        </div>
    )
}

function LoyaltyProgressBar({
    percent,
    currentLevelId,
}: {
    percent: number
    currentLevelId: string
}) {
    const clamped = Math.min(100, Math.max(0, percent))
    const theme = getLevelTheme(currentLevelId)
    const fillWidth = `${clamped}%`

    const marker = (
        <div
            className="relative h-3 w-3 shrink-0"
            style={{ ['--marker-glow-color' as string]: theme.labelColor }}
        >
            <div className="loyalty-marker-glow pointer-events-none absolute -inset-1 rounded-full" aria-hidden />
            <div
                className="absolute inset-0 rounded-full border-2 border-[#171717]"
                style={{ backgroundColor: theme.labelColor }}
            />
        </div>
    )

    return (
        <div
            className="relative mt-2 w-full min-w-0 self-stretch py-3"
            role="progressbar"
            aria-valuenow={clamped}
            aria-valuemin={0}
            aria-valuemax={100}
        >
            <div
                className="relative h-1 w-full rounded-full overflow-visible"
                style={{
                    backgroundColor: `color-mix(in srgb, ${theme.labelColor} 22%, var(--loyalty-progress-track))`,
                }}
            >
                <div
                    className="relative h-full rounded-full transition-[width] duration-500 ease-out"
                    style={{
                        width: fillWidth,
                        backgroundColor: theme.labelColor,
                        boxShadow: theme.glow,
                    }}
                >
                    {clamped > 0 && (
                        <div className="absolute top-1/2 right-0 z-[1] -translate-y-1/2 translate-x-1/2">
                            {marker}
                        </div>
                    )}
                </div>
                {clamped <= 0 && (
                    <div className="absolute top-1/2 left-0 z-[1] -translate-y-1/2 -translate-x-1/2">
                        {marker}
                    </div>
                )}
            </div>
        </div>
    )
}

const LEVELS_GRID_COLS = 3

/** Центрирует неполный последний ряд (5 → 3+2, 7 → 3+3+1, 8 → 3+3+2). */
function levelCardColStartClass(index: number, total: number): string {
    const remainder = total % LEVELS_GRID_COLS
    if (remainder === 0) return ''
    const firstOfLastRow = total - remainder
    if (index !== firstOfLastRow) return ''
    const start = Math.floor((LEVELS_GRID_COLS - remainder) / 2) + 1
    if (start === 2) return 'col-start-2'
    if (start === 3) return 'col-start-3'
    return ''
}

function LevelLadderCard({
    id,
    apiLabel,
    state,
    onClick,
    highlighted = false,
}: {
    id: string
    apiLabel: string
    state: LadderItemState
    onClick?: (levelId: string) => void
    highlighted?: boolean
}) {
    const item = getLadderItem(id)
    const theme = getLevelTheme(id)
    const locked = state === 'locked'
    const passed = state === 'passed'
    const [lockedDenied, setLockedDenied] = useState(false)

    const expLabel =
        item.minPoints >= 1000
            ? `${(item.minPoints / 1000).toFixed(0)}k${item.maxPoints != null ? `–${(item.maxPoints / 1000).toFixed(0)}k` : '+'}`
            : `0–${item.maxPoints ?? '∞'}`

    useEffect(() => {
        if (!lockedDenied) return
        const t = window.setTimeout(() => setLockedDenied(false), 480)
        return () => window.clearTimeout(t)
    }, [lockedDenied])

    const triggerLockedFeedback = useCallback(() => {
        setLockedDenied(true)
    }, [])

    const handleActivate = useCallback(() => {
        if (locked) {
            triggerLockedFeedback()
            return
        }
        onClick?.(id)
    }, [locked, id, onClick, triggerLockedFeedback])

    const handleKeyDown = (e: KeyboardEvent<HTMLDivElement>) => {
        if (e.key === 'Enter' || e.key === ' ') {
            e.preventDefault()
            handleActivate()
        }
    }

    const showHighlight = highlighted || lockedDenied

    return (
        <div
            role="button"
            tabIndex={0}
            onClick={handleActivate}
            onKeyDown={handleKeyDown}
            aria-label={locked ? `${apiLabel}, уровень заблокирован` : apiLabel}
            className={`group relative flex aspect-square w-full cursor-pointer flex-col rounded-xl border border-white/10 bg-white/[0.04] p-2.5 sm:p-3 text-center transition-all duration-200 hover:!opacity-100 hover:border-white/25 [&_*]:cursor-pointer ${locked && !lockedDenied ? 'opacity-40' : locked && lockedDenied ? 'opacity-65' : passed ? 'opacity-70' : 'opacity-100'
                } ${!locked ? 'active:scale-[0.98]' : ''} ${state === 'current' ? 'ring-1 ring-inset' : ''} ${showHighlight ? 'ring-2 ring-offset-1 ring-offset-transparent' : ''
                } ${highlighted && !lockedDenied ? 'animate-pulse' : ''}`}
            style={{
                ...(state === 'current' || showHighlight
                    ? { borderColor: theme.labelColor, boxShadow: theme.glow }
                    : undefined),
                ...(showHighlight ? { ['--tw-ring-color' as string]: theme.labelColor } : undefined),
            }}
            title={locked ? `${apiLabel} — уровень ещё не открыт` : apiLabel}
        >
            {locked && (
                <LockClosedIcon
                    className={`absolute top-2 right-2 h-3.5 w-3.5 text-white/35 origin-center ${lockedDenied ? 'animate-loyalty-lock-shake text-white/55' : ''
                        }`}
                    strokeWidth={1.5}
                    aria-hidden
                />
            )}
            <div className="flex min-h-0 flex-1 flex-col items-center justify-center gap-1.5 w-full">
                <LevelIcon id={id} className="h-5 w-5 shrink-0" color={theme.labelColor} />
                <p
                    className="text-[10px] font-bold font-durik uppercase tracking-wide leading-tight line-clamp-2 px-0.5 w-full"
                    style={{ color: theme.labelColor }}
                >
                    {apiLabel}
                </p>
                <p className="text-[8px] text-white/40 leading-tight">{expLabel}</p>
            </div>
            <p className="shrink-0 text-[8px] leading-tight text-white/45 mt-1">
                {passed && '✓ пройден'}
                {state === 'current' && '★ текущ.'}
                {locked && '🔒'}
            </p>
        </div>
    )
}

/** Процент сверху, подпись «скидка» снизу — справа от имени в шапке профиля. */
export function LoyaltyUserDiscountBadge({
    status,
    loading,
    className = '',
}: {
    status: LoyaltyStatus | null
    loading?: boolean
    className?: string
}) {
    if (loading) {
        return (
            <div className={`shrink-0 text-right ${className}`.trim()}>
                <div className="ml-auto h-7 w-10 rounded bg-white/10 animate-pulse" />
                <div className="ml-auto mt-1 h-2.5 w-12 rounded bg-white/10 animate-pulse" />
            </div>
        )
    }

    if (!status) return null

    const effectiveDiscount = resolveEffectiveDiscountPercent(status)
    const discountColor = resolveLoyaltyDiscountColor(status)

    return (
        <div className={`shrink-0 text-right ${className}`.trim()}>
            <p
                className="text-xl md:text-2xl font-bold font-durik tabular-nums leading-none"
                style={{ color: discountColor }}
            >
                {effectiveDiscount > 0 ? `−${effectiveDiscount}%` : '0%'}
            </p>
            <p className="mt-0.5 text-[9px] uppercase tracking-wider text-white/40 leading-none">
                скидка
            </p>
        </div>
    )
}

/** Подсказка при 0% скидки — на всю ширину под блоком аватар / имя / скидка. */
export function LoyaltyExplorerDiscountHint({
    status,
    loading,
    className = '',
    onClick,
}: {
    status: LoyaltyStatus | null
    loading?: boolean
    className?: string
    onClick?: () => void
}) {
    if (loading || !status) return null
    if (resolveEffectiveDiscountPercent(status) !== 0) return null

    const hasPts = status.expPoints > 0
    const nextLevel = status.nextLevel
    const nextTheme = nextLevel ? getLevelTheme(nextLevel.id) : null

    return (
        <button
            type="button"
            onClick={onClick}
            className={`w-full text-right text-[11px] text-white/50 leading-snug mb-4 transition-colors hover:text-white/70 focus:outline-none focus-visible:ring-1 focus-visible:ring-white/25 rounded ${className}`.trim()}
        >
            {hasPts ? (
                <>
                    достигни следующий уровень
                    {nextLevel && nextTheme ? (
                        <>
                            {' '}
                            <span className="font-semibold" style={{ color: nextTheme.labelColor }}>
                                {nextLevel.label}
                            </span>
                        </>
                    ) : null}{' '}
                    и разблокируй новые бонусы
                </>
            ) : (
                <>
                    нажми на карточку{' '}
                    <span className="font-semibold" style={{ color: getLevelTheme('explorer').labelColor }}>
                        Explorer
                    </span>{' '}
                    и получи свою скидку
                </>
            )}
        </button>
    )
}

/** Единый блок: аватар + имя + скидка, снизу подсказка при 0%. */
export function LoyaltyProfileIdentityBlock({
    status,
    loading,
    className = '',
    children,
    onExplorerHintClick,
}: {
    status: LoyaltyStatus | null
    loading?: boolean
    className?: string
    children: ReactNode
    onExplorerHintClick?: () => void
}) {
    return (
        <div className={`w-full text-left ${className}`.trim()}>
            <div className="flex items-start gap-3">{children}</div>
            <LoyaltyExplorerDiscountHint
                status={status}
                loading={loading}
                onClick={onExplorerHintClick}
            />
        </div>
    )
}

function LoyaltyLevelsGrid({
    currentLevelId,
    onLevelClick,
    highlightExplorerCard = false,
    highlightLevelId = null,
}: {
    currentLevelId: string
    onLevelClick?: (levelId: string) => void
    highlightExplorerCard?: boolean
    highlightLevelId?: string | null
}) {
    const total = LOYALTY_LADDER.length

    return (
        <div className="grid w-full grid-cols-3 gap-3 sm:gap-4">
            {LOYALTY_LADDER.map((l, index) => (
                <div key={l.id} className={levelCardColStartClass(index, total)}>
                    <LevelLadderCard
                        id={l.id}
                        apiLabel={l.label}
                        state={resolveLadderState(l.id, currentLevelId)}
                        onClick={onLevelClick}
                        highlighted={
                            (highlightExplorerCard && l.id === 'explorer') ||
                            (highlightLevelId != null && l.id === highlightLevelId)
                        }
                    />
                </div>
            ))}
        </div>
    )
}

const LOYALTY_DRAWER_TRANSITION_MS = 320

function NextLevelUnlockTeaser({ nextLevelLabel, nextLevelId }: { nextLevelLabel: string; nextLevelId: string }) {
    const nextTheme = getLevelTheme(nextLevelId)

    return (
        <p className="mt-6 border-t border-white/10 pt-5 text-xs leading-relaxed text-white/55">
            Быстрее разблокируй следующий уровень{' '}
            <span className="font-semibold font-durik" style={{ color: nextTheme.labelColor }}>
                {nextLevelLabel}
            </span>{' '}
            и узнай, какие сюрпризы ждут тебя дальше.
        </p>
    )
}

/** Панель уровня / скидки Explorer — выезд справа, как авторизация. */
export function LoyaltyLevelPopout({
    levelId,
    status,
    onClose,
}: {
    levelId: string
    status: LoyaltyStatus
    onClose: () => void
}) {
    const router = useRouter()
    const theme = getLevelTheme(levelId)
    const item = getLadderItem(levelId)
    const isExplorer = levelId === 'explorer'
    const levelDiscount =
        status.discount?.levelDiscountPercent ?? EXPLORER_LEVEL_DISCOUNT_PERCENT
    const hasExp = status.expPoints > 0

    const [mounted, setMounted] = useState(false)
    const [drawerEntered, setDrawerEntered] = useState(false)
    const closingRef = useRef(false)
    const closeTimeoutRef = useRef<number | null>(null)

    useEffect(() => {
        setMounted(true)
    }, [])

    useEffect(() => {
        let rafMain = 0
        let rafNest = 0
        rafMain = requestAnimationFrame(() => {
            rafNest = requestAnimationFrame(() => setDrawerEntered(true))
        })
        return () => {
            cancelAnimationFrame(rafMain)
            cancelAnimationFrame(rafNest)
        }
    }, [])

    useEffect(() => {
        document.body.style.overflow = 'hidden'
        return () => {
            document.body.style.overflow = ''
        }
    }, [])

    useEffect(() => {
        return () => {
            if (closeTimeoutRef.current) {
                window.clearTimeout(closeTimeoutRef.current)
            }
        }
    }, [])

    const requestCloseAnimated = useCallback(() => {
        if (closingRef.current) return
        closingRef.current = true
        setDrawerEntered(false)
        if (closeTimeoutRef.current) {
            window.clearTimeout(closeTimeoutRef.current)
        }
        closeTimeoutRef.current = window.setTimeout(() => {
            closeTimeoutRef.current = null
            closingRef.current = false
            onClose()
        }, LOYALTY_DRAWER_TRANSITION_MS)
    }, [onClose])

    useEffect(() => {
        const onKey = (e: globalThis.KeyboardEvent) => {
            if (e.key === 'Escape') requestCloseAnimated()
        }
        window.addEventListener('keydown', onKey)
        return () => window.removeEventListener('keydown', onKey)
    }, [requestCloseAnimated])

    const nextLevel = status.nextLevel

    const body = isExplorer ? (
        <div className="space-y-3 text-sm leading-relaxed text-white/80">
            {hasExp ? (
                <>
                    <p>Поздравляем! Ты только что открыл свой первый бонус.</p>
                    <p>
                        <span className="font-bold tabular-nums" style={{ color: theme.labelColor }}>
                            {levelDiscount}%
                        </span>{' '}
                        скидки теперь всегда с тобой.
                    </p>
                    <p>
                        Но это лишь первый шаг. Чем выше уровень — тем крупнее подарки, вкуснее скидки и круче
                        сюрпризы.
                    </p>
                    <p>Мы за тобой наблюдаем и готовим награды. Не останавливайся.</p>
                </>
            ) : (
                <>
                    <p>
                        Ты сделал первый шаг — авторизовался и получил свой первый уровень. Мы ценим даже простое
                        любопытство.
                    </p>
                    <p>
                        Раз ты уже здесь — значит, ты не просто зевака. Поздравляем! Разблокируй свою первую
                        награду! Сделай свою первую покупку и получи{' '}
                        <span className="font-bold tabular-nums" style={{ color: theme.labelColor }}>
                            {levelDiscount}%
                        </span>{' '}
                        скидку навсегда.
                    </p>
                    <div className="space-y-2 text-white/55 text-xs leading-relaxed">
                        <p>
                            Покупали в офлайн-магазине? Назовите продавцу телефон или Telegram — администратор
                            привяжет заказ к вашему аккаунту.
                        </p>
                        <p>Как только exp станет больше 0, скидка включится автоматически.</p>
                    </div>
                </>
            )}
        </div>
    ) : (
        <p className="text-white/70 text-sm leading-relaxed">{theme.perk}</p>
    )

    if (!mounted || typeof document === 'undefined' || !document.body) {
        return null
    }

    const drawer = (
        <div className="fixed inset-0" style={{ zIndex: 10003 }}>
            <div
                className="absolute inset-0 bg-black/55 backdrop-blur-[2px] transition-opacity ease-out"
                style={{
                    transitionDuration: `${LOYALTY_DRAWER_TRANSITION_MS}ms`,
                    opacity: drawerEntered ? 1 : 0,
                }}
                onClick={() => requestCloseAnimated()}
                aria-hidden
            />

            <aside
                className="absolute inset-y-0 right-0 flex w-[min(calc(100vw-1.5rem),21rem)] max-w-[88vw] flex-col overflow-hidden border-l border-white/[0.08] bg-[#0a0a0b]/[0.97] backdrop-blur-2xl transition-transform ease-out sm:w-[min(22rem,78vw)] md:w-[min(24rem,36vw)]"
                style={{
                    transitionDuration: `${LOYALTY_DRAWER_TRANSITION_MS}ms`,
                    transform: drawerEntered ? 'translateX(0)' : 'translateX(100%)',
                    paddingTop: 'env(safe-area-inset-top)',
                    paddingBottom: 'env(safe-area-inset-bottom)',
                    borderTopWidth: 3,
                    borderTopColor: theme.labelColor,
                }}
                role="dialog"
                aria-modal="true"
                aria-labelledby="loyalty-level-drawer-title"
                onClick={e => e.stopPropagation()}
            >
                <div className="flex shrink-0 items-center justify-end border-b border-white/[0.06] px-4 py-3">
                    <button
                        type="button"
                        onClick={() => requestCloseAnimated()}
                        className="flex h-9 w-9 items-center justify-center rounded-full text-white/45 transition hover:bg-white/[0.06] hover:text-white"
                        aria-label="Закрыть"
                    >
                        <svg className="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden>
                            <path
                                strokeLinecap="round"
                                strokeLinejoin="round"
                                strokeWidth={2}
                                d="M6 18L18 6M6 6l12 12"
                            />
                        </svg>
                    </button>
                </div>

                <div className="min-h-0 flex-1 overflow-y-auto px-5 pb-6 pt-5 sm:px-6">
                    <header className="mb-6">
                        <h2
                            id="loyalty-level-drawer-title"
                            className="text-lg font-bold font-durik leading-tight"
                            style={{ color: theme.labelColor }}
                        >
                            {item.label}
                        </h2>
                        <p className="text-[10px] text-white/45 mt-1">{theme.expRangeLabel}</p>
                    </header>

                    {body}

                    <div className="mt-6 flex flex-col gap-2">
                        {isExplorer && (
                            <button
                                type="button"
                                onClick={() => {
                                    requestCloseAnimated()
                                    window.setTimeout(() => router.push('/catalog'), LOYALTY_DRAWER_TRANSITION_MS)
                                }}
                                className="w-full rounded-xl border border-[#12c998]/45 bg-transparent px-4 py-3 text-sm font-semibold text-[#12c998] transition hover:border-[#12c998]/70 hover:bg-[#12c998]/10"
                            >
                                В каталог
                            </button>
                        )}
                        <button
                            type="button"
                            onClick={() => requestCloseAnimated()}
                            className="w-full rounded-xl border border-white/15 bg-white/[0.06] px-4 py-3 text-sm font-semibold text-white/85 transition hover:border-white/25 hover:bg-white/[0.09]"
                        >
                            Закрыть
                        </button>
                    </div>

                    {isExplorer && nextLevel && (
                        <NextLevelUnlockTeaser
                            nextLevelLabel={nextLevel.label}
                            nextLevelId={nextLevel.id}
                        />
                    )}
                </div>
            </aside>
        </div>
    )

    return createPortal(drawer, document.body)
}

export function LoyaltyLevelsSection({
    status,
    loading,
    className = '',
    embedded = false,
    /** Без mt-4 сверху — когда над полоской уже есть подсказка с mb-4 */
    embeddedCompactTop = false,
    onLevelClick,
    highlightExplorerCard = false,
    highlightLevelId = null,
}: {
    status: LoyaltyStatus | null
    loading?: boolean
    className?: string
    /** Внутри карточки профиля — без отдельной обёртки */
    embedded?: boolean
    embeddedCompactTop?: boolean
    onLevelClick?: (levelId: string) => void
    highlightExplorerCard?: boolean
    highlightLevelId?: string | null
}) {
    const wrapClass = embedded
        ? embeddedCompactTop
            ? `w-full pt-4 border-t border-white/10 ${className}`
            : `w-full mt-4 pt-4 border-t border-white/10 ${className}`
        : `bg-white/5 backdrop-blur-md rounded-xl border border-white/10 p-5 shadow-xl ${className}`

    if (loading) {
        return (
            <div className={wrapClass}>
                <div className="h-4 w-20 mx-auto bg-white/10 rounded animate-pulse mb-4" />
                <div className="grid w-full grid-cols-3 gap-3 sm:gap-4">
                    {Array.from({ length: LOYALTY_LADDER.length }, (_, i) => (
                        <div
                            key={i}
                            className="aspect-square w-full rounded-xl bg-white/5 animate-pulse"
                        />
                    ))}
                </div>
            </div>
        )
    }

    if (!status) return null

    return (
        <div className={wrapClass}>
            <p className="text-[10px] uppercase tracking-wider text-white/35 text-center mb-4">
                уровни
            </p>
            <LoyaltyLevelsGrid
                currentLevelId={status.level.id}
                onLevelClick={onLevelClick}
                highlightExplorerCard={highlightExplorerCard}
                highlightLevelId={highlightLevelId}
            />
        </div>
    )
}

function LoyaltyContent({
    status,
    loading,
    error,
    onRetry,
    hideLevelTitle,
    hideLevels,
}: Pick<Props, 'status' | 'loading' | 'error' | 'onRetry' | 'hideLevelTitle' | 'hideLevels'>) {
    if (loading) {
        return <p className="text-white/45 text-xs text-center py-2">загрузка уровня…</p>
    }

    if (error) {
        return (
            <div className="text-center py-2 space-y-2">
                <p className="text-red-300/90 text-xs">{error}</p>
                {onRetry && (
                    <button
                        type="button"
                        onClick={onRetry}
                        className="text-xs text-[var(--mint-bright)] hover:text-[var(--mint-dark)] underline"
                    >
                        повторить
                    </button>
                )}
            </div>
        )
    }

    if (!status) return null

    const isMaxLevel = status.nextLevel == null
    const progress = resolveLoyaltyProgressPercent(status)
    const currentId = status.level.id
    const currentTheme = getLevelTheme(currentId)
    const nextLevelLabel = status.nextLevel?.label ?? null
    const segmentEarned = status.nextLevel
        ? Math.max(0, status.expPoints - status.level.minPoints)
        : 0
    const segmentTotal = status.nextLevel
        ? Math.max(0, status.nextLevel.minPoints - status.level.minPoints)
        : 0

    return (
        <div className="w-full mt-4 pt-4 border-t border-white/10">
            {!hideLevelTitle && (
                <div className="flex items-center justify-between gap-3 mb-1">
                    <p
                        className="text-lg font-bold font-durik leading-none"
                        style={{ color: getLevelTheme(currentId).labelColor }}
                    >
                        {status.level.label}
                    </p>
                    <p className="text-white/80 text-sm font-semibold tabular-nums">
                        {formatExpPoints(status.expPoints)}{' '}
                        <span className="text-white/45 font-normal text-xs">pts</span>
                    </p>
                </div>
            )}

            {hideLevelTitle && (
                <p className="text-right text-sm font-semibold tabular-nums text-white/80 mb-2">
                    {formatExpPoints(status.expPoints)}{' '}
                    <span className="text-white/45 font-normal text-xs">pts</span>
                </p>
            )}

            {!isMaxLevel && (
                <div className="w-full min-w-0">
                    <LoyaltyProgressBar percent={progress} currentLevelId={currentId} />
                    <p className="text-[10px] uppercase tracking-wider text-white/40 text-center mt-1">
                        прогресс до {nextLevelLabel}
                    </p>
                    <p className="text-center text-sm text-white/80 tabular-nums">
                        <span className="font-semibold" style={{ color: currentTheme.labelColor }}>
                            {formatExpPoints(segmentEarned)}
                        </span>
                        <span className="text-white/35"> / </span>
                        <span>{formatExpPoints(segmentTotal)}</span>
                        <span className="text-white/45 text-xs ml-1">exp</span>
                    </p>
                </div>
            )}

            {isMaxLevel && (
                <p className="text-xs text-center leading-relaxed text-white/55 mt-2">
                    максимальный уровень —{' '}
                    <span className="font-durik font-semibold" style={{ color: currentTheme.labelColor }}>
                        {status.level.label}
                    </span>
                </p>
            )}

            {!hideLevels && (
                <div className="mt-4 pt-4 border-t border-white/[0.06]">
                    <p className="text-[10px] uppercase tracking-wider text-white/35 text-center mb-4">
                        уровни
                    </p>
                    <LoyaltyLevelsGrid currentLevelId={currentId} />
                </div>
            )}
        </div>
    )
}

export default function LoyaltyStatusBlock({
    status,
    loading,
    error,
    onRetry,
    className = '',
    embedded = false,
    hideLevelTitle = false,
    hideLevels = false,
}: Props) {
    if (embedded) {
        return (
            <div className={`w-full min-w-0 self-stretch ${className}`.trim()}>
                <LoyaltyContent
                    status={status}
                    loading={loading}
                    error={error}
                    onRetry={onRetry}
                    hideLevelTitle={hideLevelTitle}
                    hideLevels={hideLevels}
                />
            </div>
        )
    }

    const cardClass = `bg-white/5 backdrop-blur-md rounded-xl border border-white/10 p-5 shadow-xl ${className}`

    return (
        <div className={cardClass}>
            <LoyaltyContent
                status={status}
                loading={loading}
                error={error}
                onRetry={onRetry}
                hideLevelTitle={hideLevelTitle}
                hideLevels={hideLevels}
            />
        </div>
    )
}
