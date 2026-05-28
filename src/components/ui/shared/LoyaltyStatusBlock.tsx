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
import { LayoutGroup, motion } from 'framer-motion'
import { useRouter } from 'next/navigation'
import {
    formatExpPoints,
    formatGiftCoordinates,
    isLoyaltyGiftAlreadyReceived,
    loyaltyGiftLevelHasRabbitFlow,
    resolveEffectiveDiscountPercent,
    resolveGiftLevelId,
    resolveLoyaltyProgressPercent,
    type LoyaltyGiftClaimResponse,
    type LoyaltyGiftLevelId,
    type LoyaltyStatus,
} from '@/api/LoyaltyApi'
import { UserApi } from '@/api/UserApi'
import { isAxiosError } from 'axios'
import { resolveLoyaltyDiscountColor } from '@/utils/fixedDiscountPercentColor'
import {
    CheckCircleIcon,
    KeyIcon,
    MapIcon,
    StarIcon,
    TrophyIcon,
    LockClosedIcon,
    LockOpenIcon,
    ClipboardDocumentIcon,
    CheckIcon,
} from '@heroicons/react/24/outline'
import {
    EXPLORER_LEVEL_DISCOUNT_PERCENT,
    getLevelTheme,
    getLadderItem,
    isSameLevelId,
    LOYALTY_LADDER,
    LOYALTY_LEVEL_LAYOUT_GROUP_ID,
    loyaltyLevelLayoutId,
    resolveLadderState,
    type LadderItemState,
} from '@/utils/loyaltyLevelTheme'
import LoyaltyLevelConfetti from '@/components/ui/shared/LoyaltyLevelConfetti'

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

const LOYALTY_LAYOUT_OPEN_SPRING = {
    type: 'spring' as const,
    damping: 26,
    stiffness: 118,
    mass: 1.18,
}

const LOYALTY_LAYOUT_INSTANT = { duration: 0 as const }

function LevelLadderCard({
    id,
    apiLabel,
    state,
    onClick,
    highlighted = false,
    discoverable = false,
    activePopoutLevelId = null,
}: {
    id: string
    apiLabel: string
    state: LadderItemState
    onClick?: (levelId: string) => void
    highlighted?: boolean
    discoverable?: boolean
    activePopoutLevelId?: string | null
}) {
    const item = getLadderItem(id)
    const theme = getLevelTheme(id)
    const locked = state === 'locked'
    const passed = state === 'passed'
    const effectivelyLocked = locked && !discoverable
    const passedClosed = passed && !discoverable
    const isFlying = isSameLevelId(id, activePopoutLevelId)
    const [lockedDenied, setLockedDenied] = useState(false)
    const [passedPressed, setPassedPressed] = useState(false)
    const [passedGlowKey, setPassedGlowKey] = useState(0)

    const expLabel =
        item.minPoints >= 1000
            ? `${(item.minPoints / 1000).toFixed(0)}k${item.maxPoints != null ? `–${(item.maxPoints / 1000).toFixed(0)}k` : '+'}`
            : `0–${item.maxPoints ?? '∞'}`

    useEffect(() => {
        if (!lockedDenied) return
        const t = window.setTimeout(() => setLockedDenied(false), 680)
        return () => window.clearTimeout(t)
    }, [lockedDenied])

    useEffect(() => {
        if (!passedPressed) return
        const t = window.setTimeout(() => setPassedPressed(false), 720)
        return () => window.clearTimeout(t)
    }, [passedPressed, passedGlowKey])

    const triggerLockedFeedback = useCallback(() => {
        setLockedDenied(true)
    }, [])

    const triggerPassedFeedback = useCallback(() => {
        setPassedPressed(false)
        setPassedGlowKey(k => k + 1)
        requestAnimationFrame(() => setPassedPressed(true))
    }, [])

    const handleActivate = useCallback(() => {
        if (effectivelyLocked) {
            triggerLockedFeedback()
            return
        }
        if (passedClosed) {
            triggerPassedFeedback()
            return
        }
        onClick?.(id)
    }, [effectivelyLocked, passedClosed, id, onClick, triggerLockedFeedback, triggerPassedFeedback])

    const handleKeyDown = (e: KeyboardEvent<HTMLDivElement>) => {
        if (e.key === 'Enter' || e.key === ' ') {
            e.preventDefault()
            handleActivate()
        }
    }

    const showHighlight = highlighted && !effectivelyLocked
    const showActiveGlow = state === 'current' || discoverable || showHighlight

    const cardClassName = `group relative flex aspect-square w-full cursor-pointer flex-col rounded-xl border border-white/10 bg-white/[0.04] p-2.5 sm:p-3 text-center hover:!opacity-100 hover:border-white/25 [&_*]:cursor-pointer ${discoverable && !isFlying
        ? 'animate-loyalty-card-shake transition-[border-color,box-shadow,opacity]'
        : effectivelyLocked && lockedDenied
            ? 'animate-loyalty-locked-deny-glow'
            : passedClosed && passedPressed
                ? 'loyalty-passed-card--glow'
                : 'transition-[border-color,box-shadow,opacity]'
        } ${effectivelyLocked && !lockedDenied
            ? 'opacity-40'
            : effectivelyLocked && lockedDenied
                ? 'opacity-55'
                : passed && !discoverable && passedPressed
                    ? 'opacity-100'
                    : passed && !discoverable
                        ? 'opacity-70'
                        : 'opacity-100'
        } ${!effectivelyLocked && !discoverable && !passedClosed ? 'active:scale-[0.98]' : ''} ${state === 'current' || discoverable ? 'ring-1 ring-inset' : ''} ${showHighlight ? 'ring-2 ring-offset-1 ring-offset-transparent' : ''
        }`

    const cardStyle = {
        ...(effectivelyLocked
            ? {
                ['--loyalty-card-glow' as string]: theme.glow,
                ['--loyalty-card-color' as string]: theme.labelColor,
            }
            : undefined),
        ...(showActiveGlow && !lockedDenied
            ? { borderColor: theme.labelColor, boxShadow: theme.glow }
            : undefined),
        ...(showHighlight || discoverable
            ? { ['--tw-ring-color' as string]: theme.labelColor }
            : undefined),
    }

    const cardBody = (
        <>
            {discoverable && (
                <LockOpenIcon
                    className="absolute top-2 right-2 h-4 w-4 origin-center"
                    style={{
                        color: theme.labelColor,
                        filter: `drop-shadow(0 0 5px ${theme.labelColor})`,
                    }}
                    strokeWidth={2}
                    aria-hidden
                />
            )}
            {effectivelyLocked && (
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
            <p
                key={passedGlowKey}
                className={`loyalty-passed-label shrink-0 text-[8px] leading-tight mt-1 font-semibold ${passedClosed && passedPressed ? 'loyalty-passed-label--glow' : ''}`}
            >
                {passedClosed && '✓ уровень пройден'}
                {state === 'current' && !discoverable && '★ текущ.'}
                {discoverable && '✨ открой'}
                {effectivelyLocked && '🔒'}
            </p>
        </>
    )

    return (
        <motion.div
            role="button"
            tabIndex={isFlying ? -1 : 0}
            onClick={handleActivate}
            onKeyDown={handleKeyDown}
            aria-label={
                discoverable
                    ? `${apiLabel}, новый уровень — открой карточку`
                    : effectivelyLocked
                        ? `${apiLabel}, уровень заблокирован`
                        : passedClosed
                            ? `${apiLabel}, уровень пройден`
                            : apiLabel
            }
            aria-hidden={isFlying}
            className={`${cardClassName}${isFlying ? ' pointer-events-none' : ''}`}
            style={cardStyle}
            title={
                discoverable
                    ? `${apiLabel} — открой карточку уровня`
                    : effectivelyLocked
                        ? `${apiLabel} — уровень ещё не открыт`
                        : passedClosed
                            ? `${apiLabel} — уровень уже пройден`
                            : apiLabel
            }
            animate={{ opacity: isFlying ? 0 : 1 }}
            transition={{
                layout: isFlying ? LOYALTY_LAYOUT_OPEN_SPRING : LOYALTY_LAYOUT_INSTANT,
                opacity: isFlying ? { duration: 0.14 } : LOYALTY_LAYOUT_INSTANT,
            }}
            {...(isFlying ? { layoutId: loyaltyLevelLayoutId(id) } : {})}
        >
            {cardBody}
        </motion.div>
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

/** Подсказка: onboarding Explorer при 0 pts или прогресс к следующему уровню. */
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

    const hasPts = status.expPoints > 0
    const nextLevel = status.nextLevel
    const nextTheme = nextLevel ? getLevelTheme(nextLevel.id) : null
    const showExplorerOnboarding =
        resolveEffectiveDiscountPercent(status) === 0 && !hasPts
    const showNextLevelProgress = nextLevel != null && hasPts

    if (!showExplorerOnboarding && !showNextLevelProgress) return null

    if (showNextLevelProgress) {
        return (
            <p
                className={`mt-2 w-full cursor-default text-right text-[11px] text-white/50 leading-snug mb-4 ${className}`.trim()}
            >
                достигни следующий уровень
                {nextTheme ? (
                    <>
                        {' '}
                        <span className="font-semibold" style={{ color: nextTheme.labelColor }}>
                            {nextLevel!.label}
                        </span>
                    </>
                ) : null}{' '}
                и разблокируй новые бонусы
            </p>
        )
    }

    return (
        <button
            type="button"
            onClick={onClick}
            className={`mt-2 w-full text-right text-[11px] text-white/50 leading-snug mb-4 transition-colors hover:text-white/70 focus:outline-none focus-visible:ring-1 focus-visible:ring-white/25 rounded ${className}`.trim()}
        >
            нажми на карточку{' '}
            <span className="font-semibold" style={{ color: getLevelTheme('explorer').labelColor }}>
                Explorer
            </span>{' '}
            и получи свою скидку
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
    discoverableLevelId = null,
    activePopoutLevelId = null,
}: {
    currentLevelId: string
    onLevelClick?: (levelId: string) => void
    highlightExplorerCard?: boolean
    highlightLevelId?: string | null
    discoverableLevelId?: string | null
    activePopoutLevelId?: string | null
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
                        discoverable={isSameLevelId(l.id, discoverableLevelId)}
                        activePopoutLevelId={activePopoutLevelId}
                    />
                </div>
            ))}
        </div>
    )
}

const LOYALTY_DRAWER_TRANSITION_MS = 320
const GIFT_TERMINAL_MESSAGE =
    'ты знаешь, что с этим делать , беги за белым кроликом и покажи это сообщение там'
const GIFT_TERMINAL_RABBIT = '🐇'
const GIFT_TERMINAL_STATUS_LABEL = 'подарок ожидает получения'
const TERMINAL_BLINK_MS = 480
const TERMINAL_GIFT_STATUS_APPEAR_MS = 1000
const TERMINAL_RABBIT_AFTER_STATUS_MS = 1200
const GIFT_RABBIT_TAP_TARGET = 5

function resolveHumanTypingDelayMs(char: string, prevChar: string): number {
    const jitter = 16 + Math.random() * 28

    if (char === ',') return jitter + 100 + Math.random() * 85
    if (char === ' ') return jitter + 45 + Math.random() * 60
    if (prevChar === ',' || prevChar === ' ') return jitter + 62 + Math.random() * 55
    if (Math.random() < 0.08) return jitter + 72 + Math.random() * 95

    return jitter + 8 + Math.random() * 18
}

type GiftTerminalPhase = 'opening' | 'blink' | 'typing' | 'typed' | 'status' | 'rabbit'

function fmtGiftIssuedAt(iso?: string): string | null {
    if (!iso) return null
    try {
        return new Date(iso).toLocaleString('ru-RU', {
            day: '2-digit',
            month: '2-digit',
            year: 'numeric',
            hour: '2-digit',
            minute: '2-digit',
        })
    } catch {
        return null
    }
}

function resolveGiftTerminalInitialPhase(
    skipIntro: boolean,
    claimStatus: LoyaltyGiftClaimResponse['status'],
    rabbitFlowEnabled: boolean,
): GiftTerminalPhase {
    if (!skipIntro) return 'opening'
    if (claimStatus === 'issued') return 'status'
    if (rabbitFlowEnabled) return 'rabbit'
    return 'status'
}

function LoyaltyGiftTerminal({
    claim,
    skipIntro = false,
    interactive = true,
    rabbitFlowEnabled = true,
    onConfirm,
    confirmBusy = false,
    confirmError = null,
    onDeclineCatch,
}: {
    claim: LoyaltyGiftClaimResponse
    skipIntro?: boolean
    /** false после issued — только просмотр */
    interactive?: boolean
    /** Regular — кролик; остальные уровни — терминал без кролика (пока). */
    rabbitFlowEnabled?: boolean
    onConfirm?: () => void | Promise<void>
    confirmBusy?: boolean
    confirmError?: string | null
    /** Отказ от подтверждения — снова ловить кролика (5 тапов). */
    onDeclineCatch?: () => void
}) {
    const coordinates = formatGiftCoordinates(claim.coordinates)
    const introMessage = rabbitFlowEnabled ? GIFT_TERMINAL_MESSAGE : ''
    const [phase, setPhase] = useState<GiftTerminalPhase>(() =>
        resolveGiftTerminalInitialPhase(skipIntro, claim.status, rabbitFlowEnabled),
    )
    const [cursorVisible, setCursorVisible] = useState(true)
    const [typedText, setTypedText] = useState(() => {
        if (!skipIntro) return ''
        return introMessage
    })
    const [copied, setCopied] = useState(false)
    const [rabbitTapCount, setRabbitTapCount] = useState(0)
    const rabbitReady = rabbitTapCount >= GIFT_RABBIT_TAP_TARGET

    useEffect(() => {
        if (skipIntro) return
        const openTimer = window.setTimeout(
            () => setPhase(rabbitFlowEnabled ? 'blink' : 'status'),
            520,
        )
        return () => window.clearTimeout(openTimer)
    }, [skipIntro, rabbitFlowEnabled])

    useEffect(() => {
        if (phase !== 'blink') return

        let step = 0
        setCursorVisible(true)
        const interval = window.setInterval(() => {
            step += 1
            setCursorVisible(step % 2 === 1)
            if (step >= 6) {
                window.clearInterval(interval)
                setCursorVisible(true)
                setPhase('typing')
            }
        }, TERMINAL_BLINK_MS)

        return () => window.clearInterval(interval)
    }, [phase])

    useEffect(() => {
        if (phase !== 'typing' || !rabbitFlowEnabled) return

        const message = GIFT_TERMINAL_MESSAGE
        let index = 0
        let timeoutId = 0
        let cancelled = false

        const typeNext = () => {
            if (cancelled) return

            if (index >= message.length) {
                setPhase('typed')
                return
            }

            const char = message[index]
            const prevChar = index > 0 ? message[index - 1] : ''
            index += 1
            setTypedText(message.slice(0, index))

            if (index >= message.length) {
                setPhase('typed')
                return
            }

            const nextChar = message[index]
            timeoutId = window.setTimeout(typeNext, resolveHumanTypingDelayMs(nextChar, char))
        }

        timeoutId = window.setTimeout(typeNext, 95 + Math.random() * 85)

        return () => {
            cancelled = true
            window.clearTimeout(timeoutId)
        }
    }, [phase, rabbitFlowEnabled])

    useEffect(() => {
        if (phase !== 'typed') return

        const timer = window.setTimeout(() => setPhase('status'), TERMINAL_GIFT_STATUS_APPEAR_MS)
        return () => window.clearTimeout(timer)
    }, [phase])

    useEffect(() => {
        if (phase !== 'status' || !rabbitFlowEnabled) return

        const timer = window.setTimeout(() => setPhase('rabbit'), TERMINAL_RABBIT_AFTER_STATUS_MS)
        return () => window.clearTimeout(timer)
    }, [phase, rabbitFlowEnabled])

    const handleCopy = useCallback(async () => {
        try {
            await navigator.clipboard.writeText(coordinates)
            setCopied(true)
            window.setTimeout(() => setCopied(false), 1200)
        } catch {
            /* ignore */
        }
    }, [coordinates])

    const handleRabbitTap = useCallback(() => {
        if (!interactive || confirmBusy || claim.status === 'issued') return
        setRabbitTapCount(c => Math.min(GIFT_RABBIT_TAP_TARGET, c + 1))
    }, [interactive, confirmBusy, claim.status])

    const handleDeclineCatch = useCallback(() => {
        if (confirmBusy) return
        setRabbitTapCount(0)
        onDeclineCatch?.()
    }, [confirmBusy, onDeclineCatch])

    const showMessageLine = phase === 'typing' || phase === 'typed' || phase === 'status' || phase === 'rabbit'
    const showGiftStatus = phase === 'status' || phase === 'rabbit'
    const showRabbit = phase === 'rabbit' && rabbitFlowEnabled
    const showRabbitInteractive = showRabbit && interactive && claim.status !== 'issued'

    return (
        <motion.div
            initial={{ opacity: 0.65, scale: 0.98 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ duration: 0.4, ease: [0.22, 1, 0.36, 1] }}
            className="loyalty-gift-terminal loyalty-gift-terminal-shell flex w-full flex-col overflow-hidden rounded-xl border border-[#439f76]/40 font-mono text-[#439f76] shadow-[0_0_14px_rgba(67,159,118,0.12)]"
        >
            <div className="flex min-h-0 flex-1 flex-col p-2.5">
                <div className="mb-1.5 flex shrink-0 flex-col gap-0.5 border-b border-[#439f76]/20 pb-1.5">
                    <div className="flex items-start gap-1.5">
                        <span className="min-w-0 flex-1 text-[9px] leading-snug tabular-nums">{coordinates}</span>
                        <button
                            type="button"
                            onClick={() => void handleCopy()}
                            title="Скопировать координаты"
                            aria-label="Скопировать координаты"
                            className="inline-flex shrink-0 rounded p-0.5 text-[#439f76]/80 transition hover:bg-[#439f76]/10 hover:text-[#5cb88a] focus:outline-none focus-visible:ring-1 focus-visible:ring-[#439f76]"
                        >
                            {copied ? (
                                <CheckIcon className="h-3 w-3" aria-hidden />
                            ) : (
                                <ClipboardDocumentIcon className="h-3 w-3" aria-hidden />
                            )}
                        </button>
                    </div>
                    {claim.addressLabel && (
                        <p className="text-[9px] leading-snug text-[#439f76]/85">{claim.addressLabel}</p>
                    )}
                    <div className="text-[9px] leading-snug">
                        код: <span className="font-semibold tracking-wide">{claim.claimCode}</span>
                    </div>
                </div>

                <div className="min-h-0 flex-1 overflow-hidden py-0.5">
                    {phase === 'blink' && (
                        <p className="text-[10px] leading-relaxed">
                            <span
                                className="inline-block h-[0.95em] w-[0.5em] -translate-y-px bg-[#439f76] align-middle transition-opacity duration-75"
                                style={{ opacity: cursorVisible ? 1 : 0 }}
                                aria-hidden
                            />
                        </p>
                    )}

                    {showMessageLine && (
                        <p className="line-clamp-3 text-[10px] leading-relaxed whitespace-pre-wrap break-words">
                            {typedText}
                            {phase === 'typing' && (
                                <span className="loyalty-terminal-cursor ml-px inline-block h-[0.95em] w-[0.5em] -translate-y-px bg-[#439f76] align-middle" />
                            )}
                        </p>
                    )}
                </div>

                <div className="mt-auto -mx-2.5 flex shrink-0 flex-col">
                    {claim.status === 'issued' ? (
                        <div className="loyalty-terminal-rabbit-slot relative h-10 w-full shrink-0">
                            <div className="flex h-full w-full items-center justify-center bg-[#439f76]/[0.06] px-2.5">
                                <p className="text-[9px] leading-snug tracking-wide text-[#5cb88a]">
                                    подарок получен
                                    {fmtGiftIssuedAt(claim.issuedAt) ? ` · ${fmtGiftIssuedAt(claim.issuedAt)}` : ''}
                                </p>
                            </div>
                        </div>
                    ) : (
                        <>
                            <div className="flex shrink-0 items-center justify-center">
                                {showGiftStatus && (
                                    <p
                                        className={`loyalty-terminal-gift-status w-full text-[9px] leading-snug tracking-wide ${showRabbitInteractive && rabbitReady
                                            ? `loyalty-terminal-gift-status--caught${confirmError ? ' text-red-300/90' : ''}`
                                            : ''
                                            }`}
                                    >
                                        {showRabbitInteractive && rabbitReady
                                            ? confirmError ?? 'поймал кролика = подарок получен'
                                            : GIFT_TERMINAL_STATUS_LABEL}
                                    </p>
                                )}
                            </div>

                            {showRabbit && (
                                <div className="loyalty-terminal-rabbit-slot relative h-10 w-full shrink-0">
                                    {showRabbitInteractive && rabbitReady ? (
                                        <div className="flex h-full w-full items-stretch gap-1 bg-[#439f76]/[0.06] px-2.5">
                                            <button
                                                type="button"
                                                disabled={confirmBusy}
                                                onClick={() => void onConfirm?.()}
                                                className="min-w-0 flex-1 rounded border border-[#439f76]/55 bg-[#439f76]/10 px-2 py-1.5 text-[9px] font-semibold leading-snug text-[#5cb88a] transition hover:bg-[#439f76]/18 disabled:opacity-50"
                                            >
                                                {confirmBusy ? '…' : 'Поймал кролика'}
                                            </button>
                                            <button
                                                type="button"
                                                disabled={confirmBusy}
                                                onClick={handleDeclineCatch}
                                                className="min-w-0 flex-1 rounded border border-[#439f76]/25 px-2 py-1.5 text-[9px] font-semibold leading-snug text-[#439f76]/75 transition hover:border-[#439f76]/40 hover:text-[#439f76] disabled:opacity-50"
                                            >
                                                Назад
                                            </button>
                                        </div>
                                    ) : showRabbitInteractive && !rabbitReady ? (
                                        <button
                                            type="button"
                                            onClick={handleRabbitTap}
                                            aria-label="Кролик"
                                            className="loyalty-terminal-rabbit-track loyalty-terminal-rabbit-track--catch relative h-full w-full overflow-hidden"
                                        >
                                            <span className="loyalty-terminal-rabbit-runner pointer-events-none" aria-hidden>
                                                <span className="loyalty-terminal-rabbit text-base leading-none">
                                                    {GIFT_TERMINAL_RABBIT}
                                                </span>
                                            </span>
                                        </button>
                                    ) : (
                                        <div className="loyalty-terminal-rabbit-track loyalty-terminal-rabbit-track--idle relative h-full w-full overflow-hidden">
                                            <span className="loyalty-terminal-rabbit-runner pointer-events-none" aria-hidden>
                                                <span className="loyalty-terminal-rabbit text-sm leading-none">
                                                    {GIFT_TERMINAL_RABBIT}
                                                </span>
                                            </span>
                                        </div>
                                    )}
                                </div>
                            )}
                        </>
                    )}
                </div>
            </div>
        </motion.div>
    )
}

function hasRichLevelPopout(levelId: string): boolean {
    return (
        isSameLevelId(levelId, 'explorer') ||
        isSameLevelId(levelId, 'regular') ||
        isSameLevelId(levelId, 'insider')
    )
}

function LoyaltyLevelPopoutBody({
    levelId,
    theme,
    levelDiscount,
    hasExp,
}: {
    levelId: string
    theme: ReturnType<typeof getLevelTheme>
    levelDiscount: number
    hasExp: boolean
}) {
    if (isSameLevelId(levelId, 'explorer')) {
        return (
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
                                5%
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
        )
    }

    if (isSameLevelId(levelId, 'regular')) {
        return (
            <div className="space-y-3 text-sm leading-relaxed text-white/80">
                {hasExp ? (
                    <>
                        <p>
                            Поздравляем! Ты вышел на уровень Regular — ты уже не новичок, а наш постоянный бро.
                        </p>
                        <p>
                            <span className="font-bold tabular-nums" style={{ color: theme.labelColor }}>
                                {levelDiscount}%
                            </span>{' '}
                            скидки теперь твои. Но это ещё не всё — нажми кнопку «получить подарок» и посмотрим, что
                            будет.
                        </p>
                        <p>Дальше — ещё круче. Чем выше уровень, тем больше сюрпризов. Не останавливайся.</p>
                    </>
                ) : (
                    <>
                        <p>
                            Regular — уровень для тех, кто остаётся с нами. Это уже не первый шаг, а настоящая
                            вовлечённость.
                        </p>
                        <p>
                            Набери 1 000 exp и получи приоритет в рассылках, постоянную скидку и доступ к бонусам
                            для постоянных.
                        </p>
                        <div className="space-y-2 text-white/55 text-xs leading-relaxed">
                            <p>
                                Покупали в офлайн-магазине? Назовите продавцу телефон или Telegram — администратор
                                привяжет заказ к вашему аккаунту.
                            </p>
                            <p>Как только exp станет больше 0, прогресс к Regular пойдёт автоматически.</p>
                        </div>
                    </>
                )}
            </div>
        )
    }

    if (isSameLevelId(levelId, 'insider')) {
        return (
            <div className="space-y-3 text-sm leading-relaxed text-white/80">
                {hasExp ? (
                    <>
                        <p>Поздравляем! Ты дошёл до Insider — теперь ты в нашем внутреннем круге.</p>
                        <p>
                            <span className="font-bold tabular-nums" style={{ color: theme.labelColor }}>
                                {levelDiscount}%
                            </span>{' '}
                            скидки теперь всегда с тобой.
                        </p>
                        <p>
                            Тебе открыт ранний доступ к коллабам и закрытым дропам — мы делимся с Insider первыми,
                            ещё до всех остальных.
                        </p>
                        <p>До Legend остался один шаг. Мы готовим для тебя максимальные привилегии. Не останавливайся.</p>
                    </>
                ) : (
                    <>
                        <p>
                            Insider — уровень для тех, кто с нами по-настоящему. Это статус внутреннего круга Pink Punk.
                        </p>
                        <p>
                            Набери 10 000 exp и получи ранний доступ к коллабам, постоянную скидку и привилегии,
                            которые мы не показываем всем.
                        </p>
                        <div className="space-y-2 text-white/55 text-xs leading-relaxed">
                            <p>
                                Покупали в офлайн-магазине? Назовите продавцу телефон или Telegram — администратор
                                привяжет заказ к вашему аккаунту.
                            </p>
                            <p>Как только exp станет больше 0, прогресс к Insider пойдёт автоматически.</p>
                        </div>
                    </>
                )}
            </div>
        )
    }

    return <p className="text-white/70 text-sm leading-relaxed">{theme.perk}</p>
}

function NextLevelUnlockTeaser({ nextLevelLabel, nextLevelId }: { nextLevelLabel: string; nextLevelId: string }) {
    const nextTheme = getLevelTheme(nextLevelId)

    return (
        <p className="mt-6 border-t border-white/10 pt-5 text-xs leading-relaxed text-white/55">
            Медианный уровень{' '}
            <span className="font-semibold font-durik" style={{ color: nextTheme.labelColor }}>
                {nextLevelLabel}
            </span>{' '}
            уже близко
        </p>
    )
}

/** Панель уровня — shared layout morph из карточки сетки + confetti при первом открытии. */
export function LoyaltyLevelPopout({
    levelId,
    status,
    onClose,
    onOpened,
    onLoyaltyRefresh,
    onNeedContactInfo,
    celebrate = false,
    layoutMorph = true,
}: {
    levelId: string
    status: LoyaltyStatus
    onClose: () => void
    /** Popout полностью открыт — карточку уровня можно считать «просмотренной». */
    onOpened?: (levelId: string) => void
    onLoyaltyRefresh?: () => void | Promise<void>
    onNeedContactInfo?: () => void
    /** Первое «открытие» discoverable-карточки — confetti в цвете уровня. */
    celebrate?: boolean
    /** Shared layout morph из карточки (false = мгновенное закрытие без обратного morph). */
    layoutMorph?: boolean
}) {
    const router = useRouter()
    const theme = getLevelTheme(levelId)
    const item = getLadderItem(levelId)
    const richPopout = hasRichLevelPopout(levelId)
    const giftLevelId = resolveGiftLevelId(levelId)
    const levelGift = giftLevelId ? status.gifts?.[giftLevelId] : undefined
    const levelDiscount =
        status.discount?.levelDiscountPercent ?? EXPLORER_LEVEL_DISCOUNT_PERCENT
    const hasExp = status.expPoints > 0

    const [mounted, setMounted] = useState(false)
    const [showConfetti, setShowConfetti] = useState(celebrate)
    const [giftClaim, setGiftClaim] = useState<LoyaltyGiftClaimResponse | null>(null)
    const [showGiftTerminal, setShowGiftTerminal] = useState(false)
    const [giftSkipIntro, setGiftSkipIntro] = useState(false)
    const [giftClaimBusy, setGiftClaimBusy] = useState(false)
    const [giftConfirmBusy, setGiftConfirmBusy] = useState(false)
    const [giftError, setGiftError] = useState<string | null>(null)
    const [giftConfirmError, setGiftConfirmError] = useState<string | null>(null)
    const openedReportedRef = useRef(false)
    const giftBootstrapRef = useRef(false)

    useEffect(() => {
        setMounted(true)
    }, [])

    useEffect(() => {
        openedReportedRef.current = false
        giftBootstrapRef.current = false
        setShowConfetti(celebrate)
        setGiftClaim(null)
        setShowGiftTerminal(false)
        setGiftSkipIntro(false)
        setGiftClaimBusy(false)
        setGiftConfirmBusy(false)
        setGiftError(null)
        setGiftConfirmError(null)
    }, [levelId, celebrate])

    const resolveGiftApiError = useCallback((e: unknown): string => {
        if (isAxiosError(e)) {
            const msg = e.response?.data?.message ?? e.response?.data?.error
            if (typeof msg === 'string' && msg.trim()) return msg
        }
        if (e instanceof Error && e.message) return e.message
        return 'Не удалось выполнить операцию'
    }, [])

    const isContactInfoError = useCallback((message: string) => {
        const lower = message.toLowerCase()
        return lower.includes('имя') || lower.includes('телефон') || lower.includes('профил')
    }, [])

    const loadGiftTerminal = useCallback(
        async (
            targetLevelId: LoyaltyGiftLevelId,
            options?: { showTerminal?: boolean; skipIntro?: boolean; mode?: 'claim' | 'issued' },
        ) => {
            const mode = options?.mode ?? 'claim'
            setGiftClaimBusy(true)
            setGiftError(null)
            try {
                let claim: LoyaltyGiftClaimResponse
                try {
                    claim =
                        mode === 'issued'
                            ? await UserApi.confirmLoyaltyGiftReceived(targetLevelId)
                            : await UserApi.claimLoyaltyGift(targetLevelId)
                } catch (e) {
                    const msg = resolveGiftApiError(e)
                    if (
                        mode === 'claim' &&
                        (msg.toLowerCase().includes('уже выдан') || msg.toLowerCase().includes('already'))
                    ) {
                        claim = await UserApi.confirmLoyaltyGiftReceived(targetLevelId)
                        setGiftSkipIntro(true)
                    } else {
                        throw e
                    }
                }
                setGiftClaim(claim)
                if (options?.showTerminal !== false) {
                    setShowGiftTerminal(true)
                }
                if (options?.skipIntro != null) {
                    setGiftSkipIntro(options.skipIntro)
                }
                await onLoyaltyRefresh?.()
                return claim
            } catch (e) {
                const msg = resolveGiftApiError(e)
                setGiftError(msg)
                if (isContactInfoError(msg)) onNeedContactInfo?.()
                return null
            } finally {
                setGiftClaimBusy(false)
            }
        },
        [isContactInfoError, onLoyaltyRefresh, onNeedContactInfo, resolveGiftApiError],
    )

    const giftAlreadyReceived = isLoyaltyGiftAlreadyReceived(levelGift)
    const giftRabbitFlow = giftLevelId ? loyaltyGiftLevelHasRabbitFlow(giftLevelId) : false
    const canClaimGift = levelGift?.status === 'available' && !giftAlreadyReceived
    const shouldBootstrapTerminal =
        levelGift?.status === 'requested' || giftAlreadyReceived

    useEffect(() => {
        if (!giftLevelId || !levelGift || giftBootstrapRef.current) return
        if (!shouldBootstrapTerminal) return

        giftBootstrapRef.current = true
        setGiftSkipIntro(true)
        void loadGiftTerminal(giftLevelId, {
            showTerminal: true,
            skipIntro: true,
            mode: giftAlreadyReceived ? 'issued' : 'claim',
        })
    }, [giftAlreadyReceived, giftLevelId, levelGift, loadGiftTerminal, shouldBootstrapTerminal])

    const handleClaimGift = useCallback(() => {
        if (!giftLevelId || giftAlreadyReceived) return
        giftBootstrapRef.current = true
        setGiftSkipIntro(false)
        void loadGiftTerminal(giftLevelId, { showTerminal: true, skipIntro: false, mode: 'claim' })
    }, [giftAlreadyReceived, giftLevelId, loadGiftTerminal])

    const handleConfirmGift = useCallback(async () => {
        if (!giftLevelId || !giftClaim) return
        setGiftConfirmBusy(true)
        setGiftConfirmError(null)
        try {
            const confirmed = await UserApi.confirmLoyaltyGiftReceived(giftLevelId)
            setGiftClaim(confirmed)
            await onLoyaltyRefresh?.()
        } catch (e) {
            setGiftConfirmError(resolveGiftApiError(e))
        } finally {
            setGiftConfirmBusy(false)
        }
    }, [giftClaim, giftLevelId, onLoyaltyRefresh, resolveGiftApiError])

    useEffect(() => {
        document.body.style.overflow = 'hidden'
        return () => {
            document.body.style.overflow = ''
        }
    }, [])

    useEffect(() => {
        if (openedReportedRef.current) return
        openedReportedRef.current = true
        onOpened?.(levelId)
    }, [levelId, onOpened])

    const requestClose = useCallback(() => {
        onClose()
    }, [onClose])

    const layoutTransition = layoutMorph ? LOYALTY_LAYOUT_OPEN_SPRING : LOYALTY_LAYOUT_INSTANT

    useEffect(() => {
        const onKey = (e: globalThis.KeyboardEvent) => {
            if (e.key === 'Escape') requestClose()
        }
        window.addEventListener('keydown', onKey)
        return () => window.removeEventListener('keydown', onKey)
    }, [requestClose])

    const nextLevel = status.nextLevel

    const body = (
        <LoyaltyLevelPopoutBody
            levelId={levelId}
            theme={theme}
            levelDiscount={levelDiscount}
            hasExp={hasExp}
        />
    )

    if (!mounted || typeof document === 'undefined' || !document.body) {
        return null
    }

    const drawer = (
        <LayoutGroup id={LOYALTY_LEVEL_LAYOUT_GROUP_ID}>
            <div className="fixed inset-0" style={{ zIndex: 10003 }}>
                <motion.div
                    className="absolute inset-0 bg-black/55 backdrop-blur-[2px]"
                    onClick={requestClose}
                    aria-hidden
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    transition={{ duration: 0.28, ease: 'easeOut' }}
                />

                <motion.aside
                    {...(layoutMorph ? { layoutId: loyaltyLevelLayoutId(levelId) } : {})}
                    transition={{ layout: layoutTransition }}
                    className="absolute inset-y-0 right-0 flex w-[min(calc(100vw-1.5rem),21rem)] max-w-[88vw] flex-col overflow-hidden rounded-xl border border-white/10 bg-[#0a0a0b]/[0.97] backdrop-blur-2xl sm:w-[min(22rem,78vw)] md:w-[min(24rem,36vw)]"
                    style={{
                        paddingTop: 'env(safe-area-inset-top)',
                        paddingBottom: 'env(safe-area-inset-bottom)',
                        borderTopWidth: 3,
                        borderTopColor: theme.labelColor,
                        boxShadow: theme.glow,
                    }}
                    role="dialog"
                    aria-modal="true"
                    aria-labelledby="loyalty-level-drawer-title"
                    onClick={e => e.stopPropagation()}
                >
                    <div className="relative flex min-h-0 flex-1 flex-col">
                        <div className="flex shrink-0 items-center justify-between border-b border-white/[0.06] px-4 py-3">
                            <div className="flex h-9 w-9 shrink-0 items-center justify-center">
                                {showConfetti && <LoyaltyLevelConfetti />}
                            </div>
                            <button
                                type="button"
                                onClick={requestClose}
                                className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full text-white/45 transition hover:bg-white/[0.06] hover:text-white"
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
                                {giftLevelId && levelGift && levelGift.status !== 'locked' && (
                                    <>
                                        {showGiftTerminal && giftClaim ? (
                                            <LoyaltyGiftTerminal
                                                claim={giftClaim}
                                                skipIntro={giftSkipIntro || giftClaim.status === 'issued'}
                                                interactive={giftClaim.status !== 'issued'}
                                                rabbitFlowEnabled={giftRabbitFlow}
                                                onConfirm={() => void handleConfirmGift()}
                                                confirmBusy={giftConfirmBusy}
                                                confirmError={giftConfirmError}
                                                onDeclineCatch={() => setGiftConfirmError(null)}
                                            />
                                        ) : shouldBootstrapTerminal ? (
                                            giftClaimBusy ? (
                                                <p className="text-center text-xs text-white/45 py-2">Загрузка экрана подарка…</p>
                                            ) : giftError ? (
                                                <p className="text-center text-xs text-red-300/90">{giftError}</p>
                                            ) : (
                                                <p className="text-center text-xs text-white/45 py-2">Загрузка экрана подарка…</p>
                                            )
                                        ) : canClaimGift ? (
                                            <>
                                                {giftError && (
                                                    <p className="text-center text-xs text-red-300/90">{giftError}</p>
                                                )}
                                                <button
                                                    type="button"
                                                    disabled={giftClaimBusy}
                                                    onClick={handleClaimGift}
                                                    className="w-full rounded-xl border border-[#12c998]/45 bg-transparent px-4 py-3 text-sm font-semibold text-[#12c998] transition hover:border-[#12c998]/70 hover:bg-[#12c998]/10 disabled:opacity-50"
                                                >
                                                    {giftClaimBusy ? 'Запрос…' : 'Получить подарок'}
                                                </button>
                                            </>
                                        ) : null}
                                    </>
                                )}
                                {richPopout && (
                                    <button
                                        type="button"
                                        onClick={() => {
                                            requestClose()
                                            window.setTimeout(() => router.push('/catalog'), LOYALTY_DRAWER_TRANSITION_MS)
                                        }}
                                        className="w-full rounded-xl border border-[#12c998]/45 bg-transparent px-4 py-3 text-sm font-semibold text-[#12c998] transition hover:border-[#12c998]/70 hover:bg-[#12c998]/10"
                                    >
                                        В каталог
                                    </button>
                                )}
                                <button
                                    type="button"
                                    onClick={requestClose}
                                    className="w-full rounded-xl border border-white/15 bg-white/[0.06] px-4 py-3 text-sm font-semibold text-white/85 transition hover:border-white/25 hover:bg-white/[0.09]"
                                >
                                    Закрыть
                                </button>
                            </div>

                            {richPopout && nextLevel && (
                                <NextLevelUnlockTeaser
                                    nextLevelLabel={nextLevel.label}
                                    nextLevelId={nextLevel.id}
                                />
                            )}
                        </div>
                    </div>
                </motion.aside>
            </div>
        </LayoutGroup>
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
    discoverableLevelId = null,
    activePopoutLevelId = null,
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
    discoverableLevelId?: string | null
    activePopoutLevelId?: string | null
}) {
    const wrapClass = embedded
        ? embeddedCompactTop
            ? `w-full pt-4 border-t border-white/10 ${className}`
            : `w-full mt-4 pt-4 border-t border-white/10 ${className}`
        : `bg-white/5 backdrop-blur-md rounded-xl border border-white/10 p-5 shadow-xl ${className}`

    if (loading && !status) {
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
            <LayoutGroup id={LOYALTY_LEVEL_LAYOUT_GROUP_ID}>
                <LoyaltyLevelsGrid
                    currentLevelId={status.level.id}
                    onLevelClick={onLevelClick}
                    highlightExplorerCard={highlightExplorerCard}
                    highlightLevelId={highlightLevelId}
                    discoverableLevelId={discoverableLevelId}
                    activePopoutLevelId={activePopoutLevelId}
                />
            </LayoutGroup>
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
    if (loading && !status) {
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
