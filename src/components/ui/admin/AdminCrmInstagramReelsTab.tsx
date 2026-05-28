'use client'

import type { UserInstagram } from '@/api/InstagramReelsApi'
import AdminCrmInstagramReelsPanel from '@/components/ui/admin/AdminCrmInstagramReelsPanel'

type Props = {
    accountId: string
    instagram: UserInstagram | null
    onRefresh: () => void
    onLoyaltyRefresh?: () => void
    onError: (message: string | null) => void
}

export default function AdminCrmInstagramReelsTab({
    accountId,
    instagram,
    onRefresh,
    onLoyaltyRefresh,
    onError,
}: Props) {
    return (
        <AdminCrmInstagramReelsPanel
            mode="user"
            accountId={accountId}
            instagram={instagram}
            onRefresh={onRefresh}
            onLoyaltyRefresh={onLoyaltyRefresh}
            onError={onError}
        />
    )
}
