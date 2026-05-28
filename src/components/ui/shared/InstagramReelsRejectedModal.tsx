'use client'

import { useEffect, useState } from 'react'
import { createPortal } from 'react-dom'
import { XMarkIcon } from '@heroicons/react/24/outline'
import type { UserInstagramReel } from '@/api/InstagramReelsApi'
import { truncateReelUrl } from '@/api/InstagramReelsApi'

type Props = {
    isOpen: boolean
    onClose: () => void
    reels: UserInstagramReel[]
    focusReelId?: string | null
}

function formatReviewDate(value?: string): string | null {
    if (!value) return null
    const date = new Date(value)
    if (Number.isNaN(date.getTime())) return null
    return date.toLocaleDateString('ru-RU', {
        day: 'numeric',
        month: 'short',
        year: 'numeric',
    })
}

export default function InstagramReelsRejectedModal({
    isOpen,
    onClose,
    reels,
    focusReelId,
}: Props) {
    const [mounted, setMounted] = useState(false)

    useEffect(() => {
        setMounted(true)
    }, [])

    if (!mounted || !isOpen) return null

    const sorted = [...reels].sort(
        (a, b) => new Date(b.rejectedAt ?? b.submittedAt).getTime() - new Date(a.rejectedAt ?? a.submittedAt).getTime(),
    )

    return createPortal(
        <div
            className="fixed inset-0 z-[10001] flex items-center justify-center bg-black/70 p-4 backdrop-blur-sm"
            onClick={(e) => {
                if (e.target === e.currentTarget) onClose()
            }}
        >
            <div
                className="relative flex max-h-[min(80vh,32rem)] w-full max-w-md flex-col rounded-2xl border border-white/10 bg-[#121214] p-5 shadow-2xl"
                onClick={(e) => e.stopPropagation()}
                role="dialog"
                aria-modal="true"
                aria-labelledby="reels-rejected-title"
            >
                <button
                    type="button"
                    onClick={onClose}
                    className="absolute right-3 top-3 text-white/50 hover:text-white"
                    aria-label="Закрыть"
                >
                    <XMarkIcon className="h-5 w-5" />
                </button>

                <h2 id="reels-rejected-title" className="pr-8 text-lg font-bold text-white font-blauer-nue">
                    Отклонённые видео
                </h2>
                <p className="mt-2 text-sm leading-relaxed text-white/60">
                    Причина отклонения указана модератором. Ссылку можно открыть в Instagram.
                </p>

                <div className="mt-4 flex-1 space-y-3 overflow-y-auto pr-1">
                    {sorted.length === 0 ? (
                        <p className="rounded-xl border border-white/10 bg-white/[0.04] px-4 py-3 text-sm text-white/55">
                            Отклонённых видео пока нет.
                        </p>
                    ) : (
                        sorted.map((item) => {
                            const reviewedLabel = formatReviewDate(item.rejectedAt ?? item.submittedAt)
                            const highlighted = focusReelId != null && item._id === focusReelId
                            return (
                                <div
                                    key={item._id}
                                    className={`rounded-xl border px-3 py-3 ${
                                        highlighted
                                            ? 'border-[var(--pink-punk)]/50 bg-[var(--pink-punk)]/10'
                                            : 'border-[var(--pink-punk)]/25 bg-[var(--pink-punk)]/5'
                                    }`}
                                >
                                    <a
                                        href={item.url}
                                        target="_blank"
                                        rel="noopener noreferrer"
                                        className="block truncate text-sm font-medium text-[#E1306C] hover:text-[#FCAF45]"
                                        title={item.url}
                                    >
                                        {truncateReelUrl(item.url, 56)}
                                    </a>
                                    {reviewedLabel ? (
                                        <p className="mt-1 text-[11px] text-white/45">{reviewedLabel}</p>
                                    ) : null}
                                    <p className="mt-2 text-sm leading-relaxed text-white/85">
                                        {item.rejectionReason ?? 'Причина не указана'}
                                    </p>
                                </div>
                            )
                        })
                    )}
                </div>
            </div>
        </div>,
        document.body,
    )
}
