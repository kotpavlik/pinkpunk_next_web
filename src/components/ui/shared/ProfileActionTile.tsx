'use client'

import Link from 'next/link'
import type { ReactNode } from 'react'
import InstagramIcon from '@/components/ui/shared/InstagramIcon'

export type ProfileActionTileVariant = 'telegram' | 'instagram-reels' | 'instagram-account' | 'activity'

type Props = {
    title: string
    subtitle?: string
    variant: ProfileActionTileVariant
    onClick?: () => void
    href?: string
    disabled?: boolean
    /** Некликабельная плитка без dimmed opacity (например, «Активность»). */
    readOnly?: boolean
    badge?: number
    rightSlot?: ReactNode
    className?: string
}

const variantStyles: Record<ProfileActionTileVariant, string> = {
    telegram:
        'border-[#2AABEE]/50 bg-gradient-to-r from-[#2AABEE]/28 via-[#229ED9]/22 to-[#0088cc]/18 hover:border-[#2AABEE]/70 hover:from-[#2AABEE]/38 hover:via-[#229ED9]/30 hover:to-[#0088cc]/24',
    'instagram-reels':
        'border-[#E1306C]/35 bg-gradient-to-r from-[#833AB4]/20 via-[#FD1D1D]/15 to-[#FCAF45]/20 hover:border-[#E1306C]/55 hover:from-[#833AB4]/28 hover:via-[#FD1D1D]/22 hover:to-[#FCAF45]/28',
    'instagram-account':
        'border-[#E1306C]/30 bg-gradient-to-r from-[#833AB4]/15 via-[#C13584]/10 to-[#FCAF45]/15 hover:border-[#E1306C]/50 hover:from-[#833AB4]/22 hover:via-[#C13584]/16 hover:to-[#FCAF45]/20',
    activity:
        'border-white/20 bg-[#1a1a1e] text-white',
}

const variantTitleClass: Record<ProfileActionTileVariant, string> = {
    telegram: 'text-white',
    'instagram-reels': 'text-white',
    'instagram-account': 'text-white',
    activity: 'text-white',
}

const variantSubtitleClass: Record<ProfileActionTileVariant, string> = {
    telegram: 'text-[#D6F0FF]/75',
    'instagram-reels': 'text-[#FFD6EC]/75',
    'instagram-account': 'text-white/55',
    activity: 'text-white/55',
}

const variantRightBorderClass: Record<ProfileActionTileVariant, string> = {
    telegram: 'border-[#2AABEE]/30',
    'instagram-reels': 'border-[#E1306C]/25',
    'instagram-account': 'border-[#E1306C]/25',
    activity: 'border-white/15',
}

function RightSlotDefault({ variant }: { variant: ProfileActionTileVariant }) {
    if (variant === 'telegram') {
        return (
            <div className="flex h-full w-full items-center justify-center bg-gradient-to-br from-[#2AABEE]/45 to-[#229ED9]/55" />
        )
    }

    return (
        <div className="flex h-full w-full items-center justify-center bg-gradient-to-br from-[#833AB4]/35 via-[#C13584]/30 to-[#FCAF45]/35">
            <InstagramIcon className="h-6 w-6 sm:h-7 sm:w-7 text-white drop-shadow-sm" />
        </div>
    )
}

export default function ProfileActionTile({
    title,
    subtitle,
    variant,
    onClick,
    href,
    disabled = false,
    readOnly = false,
    badge,
    rightSlot,
    className = '',
}: Props) {
    const interactive = !readOnly && !disabled
    const classes = `grid w-full grid-cols-[minmax(0,1fr)_3.5rem] sm:grid-cols-[minmax(0,1fr)_4rem] overflow-hidden rounded-xl border text-left transition ${
        interactive ? 'active:opacity-95' : ''
    } ${disabled && !readOnly ? 'disabled:opacity-50 disabled:pointer-events-none' : readOnly ? 'pointer-events-none' : ''} ${variantStyles[variant]} ${className}`.trim()

    const content = (
        <>
            <div className="flex min-h-[3.25rem] sm:min-h-[3.5rem] flex-col justify-center py-2 pl-3 pr-2">
                <div className="flex items-center gap-2">
                    <p className={`text-sm font-semibold leading-tight ${variantTitleClass[variant]}`}>{title}</p>
                    {badge != null && badge > 0 ? (
                        <span className="inline-flex min-w-[1.25rem] items-center justify-center rounded-full bg-amber-400/90 px-1.5 py-0.5 text-[10px] font-bold text-black">
                            {badge}
                        </span>
                    ) : null}
                </div>
                {subtitle ? (
                    <p
                        className={`text-[10px] sm:text-[11px] leading-snug mt-0.5 line-clamp-2 ${variantSubtitleClass[variant]}`}
                    >
                        {subtitle}
                    </p>
                ) : null}
            </div>
            <div
                className={`relative min-h-[3.25rem] sm:min-h-[3.5rem] overflow-hidden border-l ${variantRightBorderClass[variant]}`}
                aria-hidden
            >
                {rightSlot ?? <RightSlotDefault variant={variant} />}
            </div>
        </>
    )

    if (readOnly) {
        return <div className={classes}>{content}</div>
    }

    if (href && !disabled) {
        return (
            <Link href={href} className={classes}>
                {content}
            </Link>
        )
    }

    return (
        <button type="button" onClick={onClick} disabled={disabled} className={classes}>
            {content}
        </button>
    )
}
