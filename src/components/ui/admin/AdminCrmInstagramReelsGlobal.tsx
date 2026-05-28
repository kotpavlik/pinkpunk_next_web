'use client'

import AdminCrmInstagramReelsPanel from '@/components/ui/admin/AdminCrmInstagramReelsPanel'

type Props = {
    onOpenClient: (accountId: string) => void
    onError: (message: string | null) => void
    refreshKey?: number
}

export default function AdminCrmInstagramReelsGlobal({ onOpenClient, onError, refreshKey }: Props) {
    return (
        <AdminCrmInstagramReelsPanel
            mode="global"
            onOpenClient={onOpenClient}
            onError={onError}
            refreshKey={refreshKey}
        />
    )
}
