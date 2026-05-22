'use client'

import { useState } from 'react'
import type { UserType } from '@/zustand/user_store/UserStore'
import { storefrontProfileDisplayName } from '@/utils/crmUserDisplayName'
import ProfileIdentityEditModal from '@/components/ui/shared/ProfileIdentityEditModal'

type Props = {
    user: UserType
}

export default function ProfileIdentityFields({ user }: Props) {
    const [isEditModalOpen, setIsEditModalOpen] = useState(false)
    const displayName = storefrontProfileDisplayName(user)
    const telegramUsername = user.username?.trim()

    return (
        <>
            <div
                role="button"
                tabIndex={0}
                title="Двойной клик для редактирования"
                aria-label="Имя и Telegram username. Двойной клик для редактирования"
                onDoubleClick={(e) => {
                    e.preventDefault()
                    setIsEditModalOpen(true)
                }}
                onKeyDown={(e) => {
                    if (e.key === 'Enter') {
                        e.preventDefault()
                        setIsEditModalOpen(true)
                    }
                }}
                className="min-w-0 flex-1 cursor-pointer rounded-lg px-2.5 py-2 -mx-2.5 -my-2 text-left focus:outline-none focus-visible:ring-1 focus-visible:ring-[#12c998]/50"
            >
                <h2 className="text-lg md:text-xl font-bold text-white leading-tight truncate">
                    {displayName}
                </h2>
                {telegramUsername && (
                    <p className="text-white/70 text-sm mt-0.5 truncate">
                        @{telegramUsername.replace(/^@/, '')}
                    </p>
                )}
                {user.userPhoneNumber && (
                    <p className="text-white/60 text-xs mt-1 truncate">
                        {user.userPhoneNumber}
                    </p>
                )}
            </div>

            <ProfileIdentityEditModal
                isOpen={isEditModalOpen}
                onClose={() => setIsEditModalOpen(false)}
                user={user}
            />
        </>
    )
}
