'use client'

import { useCallback, useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import ProfileActionTile from '@/components/ui/shared/ProfileActionTile'
import InstagramReelsDrawer from '@/components/ui/shared/InstagramReelsDrawer'
import { UserApi } from '@/api/UserApi'
import type { UserInstagram } from '@/api/InstagramReelsApi'
import { tokenManager } from '@/utils/TokenManager'
import { useUserStore } from '@/zustand/user_store/UserStore'

export default function VideoSubmitHintBlock() {
    const router = useRouter()
    const { user } = useUserStore()
    const [drawerOpen, setDrawerOpen] = useState(false)
    const [instagramData, setInstagramData] = useState<UserInstagram | null>(null)

    const instagramHandle =
        instagramData?.username?.trim() ||
        user?.instagram?.username?.trim()?.replace(/^@+/, '') ||
        user?.instagramUsername?.trim()?.replace(/^@+/, '') ||
        ''

    const instagramSubtitle = instagramHandle
        ? `@${instagramHandle.replace(/^@+/, '')}`
        : 'Username не указан'

    const loadInstagram = useCallback(async () => {
        if (!tokenManager.isAuthenticated()) return
        try {
            const data = await UserApi.getInstagram()
            setInstagramData(data)
        } catch {
            setInstagramData(null)
        }
    }, [])

    useEffect(() => {
        void loadInstagram()
    }, [loadInstagram])

    const handleClick = () => {
        if (!tokenManager.isAuthenticated()) {
            router.push('/user_profile')
            return
        }
        setDrawerOpen(true)
    }

    return (
        <>
            <div className="mt-5 rounded-2xl border border-[#E1306C]/25 bg-gradient-to-br from-[#833AB4]/10 via-black/20 to-[#FCAF45]/8 p-4 sm:p-5">
                <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between sm:gap-5">
                    <div className="min-w-0 flex-1 space-y-1.5">
                        <p className="text-[10px] font-semibold uppercase tracking-[0.14em] text-[#E1306C]/90">
                            Как отправить видео
                        </p>
                        <p className="text-sm text-white/75 leading-relaxed max-w-prose">
                            Нажмите{' '}
                            <span className="font-medium text-white/90">«Добавить рилс»</span> справа, укажите @username
                            и ссылку на Reels — мы проверим и начислим баллы.
                        </p>
                    </div>

                    <div className="w-full sm:w-auto sm:shrink-0 sm:pt-0.5">
                        <ProfileActionTile
                            variant="instagram-reels"
                            title="Добавить рилс"
                            subtitle={instagramSubtitle}
                            onClick={handleClick}
                            className="mx-auto sm:mx-0 sm:max-w-[17rem]"
                        />
                    </div>
                </div>
            </div>

            <InstagramReelsDrawer
                isOpen={drawerOpen}
                onClose={() => setDrawerOpen(false)}
                initialTab="pending"
                initialUsername={instagramHandle}
                onUpdated={setInstagramData}
            />
        </>
    )
}
