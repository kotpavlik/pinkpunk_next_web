'use client'

import type { UserInstagramReel } from '@/api/InstagramReelsApi'
import { truncateReelUrl } from '@/api/InstagramReelsApi'
import {
    instagramReelModerationBadgeClass,
    instagramReelModerationBadgeLabel,
    instagramReelStatusLabel,
} from '@/utils/instagramReelUi'

type Props = {
    reels: UserInstagramReel[]
    compact?: boolean
    onRejectedClick?: (reel: UserInstagramReel) => void
}

export default function InstagramReelsList({ reels, compact = false, onRejectedClick }: Props) {
    if (reels.length === 0) {
        return null
    }

    const sorted = [...reels].sort(
        (a, b) => new Date(b.submittedAt).getTime() - new Date(a.submittedAt).getTime(),
    )

    return (
        <div className={`space-y-2 ${compact ? '' : 'mt-1'}`}>
            {sorted.map(reel => {
                const isRejected = reel.moderationStatus === 'rejected'
                const statusText = instagramReelStatusLabel(reel)

                return (
                    <div
                        key={reel._id}
                        className={`rounded-xl border border-white/10 bg-black/20 px-3 py-2.5 ${
                            isRejected ? 'cursor-pointer hover:border-[var(--pink-punk)]/35' : ''
                        }`.trim()}
                        role={isRejected && onRejectedClick ? 'button' : undefined}
                        tabIndex={isRejected && onRejectedClick ? 0 : undefined}
                        onClick={() => {
                            if (isRejected) onRejectedClick?.(reel)
                        }}
                        onKeyDown={(e) => {
                            if (isRejected && onRejectedClick && (e.key === 'Enter' || e.key === ' ')) {
                                e.preventDefault()
                                onRejectedClick(reel)
                            }
                        }}
                    >
                        <div className="flex items-start justify-between gap-2">
                            <a
                                href={reel.url}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="min-w-0 flex-1 truncate text-xs font-medium text-[#E1306C] hover:text-[#FCAF45]"
                                onClick={(e) => e.stopPropagation()}
                            >
                                {truncateReelUrl(reel.url)}
                            </a>
                            <span
                                className={`shrink-0 rounded-md border px-1.5 py-0.5 text-[10px] font-semibold uppercase tracking-wide ${instagramReelModerationBadgeClass(reel.moderationStatus)}`}
                            >
                                {instagramReelModerationBadgeLabel(reel.moderationStatus)}
                            </span>
                        </div>
                        <p className="mt-1.5 text-[11px] leading-snug text-white/60">{statusText}</p>
                        {isRejected && reel.rejectionReason ? (
                            <p className="mt-1 text-[11px] leading-snug text-[var(--pink-punk)]/90 line-clamp-2">
                                {reel.rejectionReason}
                            </p>
                        ) : null}
                        {reel.pointsOnApprove != null && reel.moderationStatus === 'approved' ? (
                            <p className="mt-1 text-[10px] text-[var(--mint-bright)]/80">
                                +{reel.pointsOnApprove} pts за одобрение
                            </p>
                        ) : null}
                    </div>
                )
            })}
        </div>
    )
}
