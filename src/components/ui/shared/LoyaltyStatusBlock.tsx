'use client'

import type { ReactNode } from 'react'
import type { LoyaltyStatus } from '@/api/LoyaltyApi'
import { formatExpPoints, resolveLoyaltyProgressPercent } from '@/api/LoyaltyApi'
import {
    CheckCircleIcon,
    KeyIcon,
    MapIcon,
    StarIcon,
    TrophyIcon,
    LockClosedIcon,
} from '@heroicons/react/24/outline'
import {
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
}: {
    id: string
    apiLabel: string
    state: LadderItemState
}) {
    const item = getLadderItem(id)
    const theme = getLevelTheme(id)
    const locked = state === 'locked'
    const passed = state === 'passed'

    const expLabel =
        item.minPoints >= 1000
            ? `${(item.minPoints / 1000).toFixed(0)}k${item.maxPoints != null ? `–${(item.maxPoints / 1000).toFixed(0)}k` : '+'}`
            : `0–${item.maxPoints ?? '∞'}`

    return (
        <div
            className={`group relative flex aspect-square w-full cursor-pointer flex-col rounded-xl border border-white/10 bg-white/[0.04] p-2.5 sm:p-3 text-center transition-all duration-200 hover:!opacity-100 hover:border-white/25 [&_*]:cursor-pointer ${
                locked ? 'opacity-40' : passed ? 'opacity-70' : 'opacity-100'
            } ${state === 'current' ? 'ring-1 ring-inset' : ''}`}
            style={state === 'current' ? { borderColor: theme.labelColor, boxShadow: theme.glow } : undefined}
            title={apiLabel}
        >
            {locked && (
                <LockClosedIcon
                    className="absolute top-2 right-2 h-3.5 w-3.5 text-white/35"
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

function LoyaltyLevelsGrid({ currentLevelId }: { currentLevelId: string }) {
    const total = LOYALTY_LADDER.length

    return (
        <div className="grid w-full grid-cols-3 gap-3 sm:gap-4">
            {LOYALTY_LADDER.map((l, index) => (
                <div key={l.id} className={levelCardColStartClass(index, total)}>
                    <LevelLadderCard
                        id={l.id}
                        apiLabel={l.label}
                        state={resolveLadderState(l.id, currentLevelId)}
                    />
                </div>
            ))}
        </div>
    )
}

export function LoyaltyLevelsSection({
    status,
    loading,
    className = '',
    embedded = false,
}: {
    status: LoyaltyStatus | null
    loading?: boolean
    className?: string
    /** Внутри карточки профиля — без отдельной обёртки */
    embedded?: boolean
}) {
    const wrapClass = embedded
        ? `w-full mt-4 pt-4 border-t border-white/10 ${className}`
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
            <LoyaltyLevelsGrid currentLevelId={status.level.id} />
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
