'use client'

import type { LoyaltyStatus } from '@/api/LoyaltyApi'
import { formatExpPoints } from '@/api/LoyaltyApi'
import { getLevelTheme } from '@/utils/loyaltyLevelTheme'

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
    const levelTheme = loyalty ? getLevelTheme(loyalty.level.id) : null

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
            {loyalty && levelTheme && (
                <div className="flex flex-wrap gap-x-1.5 items-baseline">
                    <dt className={metaLabelClass}>Loyalty:</dt>
                    <dd className={metaValueClass}>
                        <span className="font-semibold" style={{ color: levelTheme.labelColor }}>
                            {loyalty.level.label}
                        </span>
                        <span className="text-white/45"> · </span>
                        <span className="tabular-nums font-medium">
                            {formatExpPoints(loyalty.expPoints)} pts
                        </span>
                    </dd>
                </div>
            )}
        </dl>
    )
}
