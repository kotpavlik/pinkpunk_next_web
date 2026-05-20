'use client'

import type { LoyaltyStatus } from '@/api/LoyaltyApi'
import CrmLoyaltyInline from '@/components/ui/admin/CrmLoyaltyInline'

const metaLabelClass = 'text-white/55 shrink-0'
const metaValueClass = 'text-white/90'
const metaMonoClass = 'font-mono text-white/90 break-all'

type Props = {
    accountId: string
    telegramId?: number | null
    loyalty?: LoyaltyStatus | null
    className?: string
}

/** Единая шапка CRM: accountId, Telegram ID, Loyalty — один размер и иерархия цветов. */
export default function CrmUserHeaderMeta({
    accountId,
    telegramId,
    loyalty,
    className = '',
}: Props) {
    return (
        <dl className={`space-y-1 text-xs leading-snug ${className}`.trim()}>
            <div className="flex flex-wrap gap-x-1.5 min-w-0">
                <dt className={metaLabelClass}>accountId:</dt>
                <dd className={metaMonoClass} title="Mongo _id — ключ CRM и заказов">
                    {accountId || '—'}
                </dd>
            </div>
            {telegramId != null && (
                <div className="flex flex-wrap gap-x-1.5">
                    <dt className={metaLabelClass}>Telegram ID:</dt>
                    <dd className={`${metaMonoClass} tabular-nums`}>{telegramId}</dd>
                </div>
            )}
            {loyalty && (
                <div className="flex flex-wrap gap-x-1.5 items-baseline min-w-0">
                    <dt className={metaLabelClass}>Loyalty:</dt>
                    <dd className={`${metaValueClass} min-w-0`}>
                        <CrmLoyaltyInline loyalty={loyalty} className="text-xs" />
                    </dd>
                </div>
            )}
        </dl>
    )
}
