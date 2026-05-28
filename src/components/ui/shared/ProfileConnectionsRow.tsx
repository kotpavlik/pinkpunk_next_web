'use client'

import { useCallback, useEffect, useState, type ReactNode } from 'react'
import { CalendarIcon } from '@heroicons/react/24/outline'
import TelegramLottieJson from '@/components/ui/shared/TelegramLottieJson'
import ProfileActionTile from '@/components/ui/shared/ProfileActionTile'
import InstagramReelsDrawer from '@/components/ui/shared/InstagramReelsDrawer'
import { UserApi } from '@/api/UserApi'
import { countInstagramReels, type UserInstagram } from '@/api/InstagramReelsApi'

type Props = {
    isTelegramLinked: boolean
    telegramUsername?: string
    telegramPhoneHint?: string
    instagramUsername?: string
    lastActivityLabel: string
    onTelegramLink: () => void
    onTelegramRelink: () => void
}

function ConnectionCard({
    title,
    meta,
    footer,
    children,
    className = '',
}: {
    title: string
    meta?: ReactNode
    footer?: ReactNode
    children: ReactNode
    className?: string
}) {
    return (
        <div
            className={`flex h-full flex-col rounded-xl border border-white/10 bg-white/5 p-4 shadow-xl backdrop-blur-md ${className}`.trim()}
        >
            <h3 className="mb-2 shrink-0 text-sm font-bold text-white">{title}</h3>
            {meta ? (
                <div className="mb-2 shrink-0 text-[11px] leading-snug text-white/55">{meta}</div>
            ) : null}
            <div className="shrink-0">{children}</div>
            {footer ? <div className="mt-2 shrink-0">{footer}</div> : null}
        </div>
    )
}

function InstagramReelsCounters({
    approvedCount,
    rejectedCount,
    pendingCount,
    loading,
    onPendingClick,
    onRejectedClick,
    onApprovedClick,
}: {
    approvedCount: number
    rejectedCount: number
    pendingCount: number
    loading: boolean
    onPendingClick: () => void
    onRejectedClick: () => void
    onApprovedClick: () => void
}) {
    if (loading) {
        return <p className="text-center text-[10px] text-white/45">Загрузка…</p>
    }

    const chipClass =
        'flex min-w-0 flex-1 items-center justify-center gap-1 rounded-md border px-1 py-1 text-[10px] font-medium leading-none'

    return (
        <div className="grid w-full grid-cols-3 gap-1">
            <button
                type="button"
                onClick={onPendingClick}
                className={`${chipClass} border-amber-400/25 bg-amber-400/10 text-amber-200/90 hover:border-amber-400/40`}
            >
                <span className="text-white/40">Проверка</span>
                <span>{pendingCount}</span>
            </button>
            <button
                type="button"
                onClick={onApprovedClick}
                className={`${chipClass} border-[var(--mint-bright)]/20 bg-[var(--mint-bright)]/10 text-[var(--mint-bright)] hover:border-[var(--mint-bright)]/35`}
            >
                <span className="text-white/40">Одобрено</span>
                <span>{approvedCount}</span>
            </button>
            <button
                type="button"
                onClick={onRejectedClick}
                className={`${chipClass} border-[var(--pink-punk)]/25 bg-[var(--pink-punk)]/10 text-[var(--pink-punk)] hover:border-[var(--pink-punk)]/40`}
            >
                <span className="text-white/40">Отклонено</span>
                <span>{rejectedCount}</span>
            </button>
        </div>
    )
}

export default function ProfileConnectionsRow({
    isTelegramLinked,
    telegramUsername,
    telegramPhoneHint,
    instagramUsername,
    lastActivityLabel,
    onTelegramLink,
    onTelegramRelink,
}: Props) {
    const [drawerOpen, setDrawerOpen] = useState(false)
    const [drawerTab, setDrawerTab] = useState<'pending' | 'approved' | 'rejected'>('pending')
    const [instagramData, setInstagramData] = useState<UserInstagram | null>(null)
    const [instagramLoading, setInstagramLoading] = useState(false)

    const instagramHandle =
        instagramData?.username?.trim() ||
        instagramUsername?.trim().replace(/^@+/, '') ||
        ''

    const telegramSubtitle = isTelegramLinked
        ? telegramUsername
            ? `@${telegramUsername.replace(/^@+/, '')}`
            : 'Telegram подключён'
        : 'Привязка к аккаунту с телефоном'

    const loadInstagram = useCallback(async () => {
        setInstagramLoading(true)
        try {
            const data = await UserApi.getInstagram()
            setInstagramData(data)
        } catch {
            setInstagramData(null)
        } finally {
            setInstagramLoading(false)
        }
    }, [])

    useEffect(() => {
        void loadInstagram()
    }, [loadInstagram])

    const counts = countInstagramReels(instagramData?.reels ?? [])
    const pendingCount = instagramData?.reelsByModeration?.pending.length ?? counts.pendingCount

    const instagramSubtitle = instagramHandle
        ? `@${instagramHandle.replace(/^@+/, '')}`
        : 'Username не указан'

    const openDrawer = (tab: 'pending' | 'approved' | 'rejected' = 'pending') => {
        setDrawerTab(tab)
        setDrawerOpen(true)
    }

    return (
        <>
            <div className="grid grid-cols-1 items-stretch gap-3 sm:grid-cols-2 xl:grid-cols-3 md:gap-4">
                <ConnectionCard
                    title="Telegram"
                    meta={
                        !isTelegramLinked && telegramPhoneHint ? (
                            <p>{telegramPhoneHint}</p>
                        ) : null
                    }
                >
                    <ProfileActionTile
                        variant="telegram"
                        title={isTelegramLinked ? 'Обновить Telegram' : 'Привязать Telegram'}
                        subtitle={telegramSubtitle}
                        onClick={isTelegramLinked ? onTelegramRelink : onTelegramLink}
                        rightSlot={
                            <div className="pointer-events-none absolute inset-0">
                                <TelegramLottieJson loop style={{ width: '100%', height: '100%' }} />
                            </div>
                        }
                    />
                </ConnectionCard>

                <ConnectionCard
                    title="Instagram"
                    footer={
                        <InstagramReelsCounters
                            approvedCount={counts.approvedCount}
                            rejectedCount={counts.rejectedCount}
                            pendingCount={pendingCount}
                            loading={instagramLoading && !instagramData}
                            onPendingClick={() => openDrawer('pending')}
                            onApprovedClick={() => openDrawer('approved')}
                            onRejectedClick={() => openDrawer('rejected')}
                        />
                    }
                >
                    <ProfileActionTile
                        variant="instagram-reels"
                        title="Добавить рилс"
                        subtitle={instagramSubtitle}
                        onClick={() => openDrawer('pending')}
                    />
                </ConnectionCard>

                <ConnectionCard title="Активность">
                    <ProfileActionTile
                        variant="activity"
                        title={lastActivityLabel}
                        subtitle="Последняя активность"
                        readOnly
                        rightSlot={
                            <div className="flex h-full w-full items-center justify-center bg-[#2a1524]">
                                <CalendarIcon className="h-6 w-6 text-[var(--pink-punk)]" />
                            </div>
                        }
                    />
                </ConnectionCard>
            </div>

            <InstagramReelsDrawer
                isOpen={drawerOpen}
                onClose={() => setDrawerOpen(false)}
                initialTab={drawerTab}
                initialUsername={instagramHandle}
                onUpdated={setInstagramData}
            />
        </>
    )
}
