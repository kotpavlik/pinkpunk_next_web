'use client'

import type { CartPricing } from '@/utils/cartPricing'
import { formatByn, hasCartDiscount } from '@/utils/cartPricing'

type Props = {
    pricing: CartPricing | null | undefined
    /** Если бэкенд не отдал pricing — сумма товаров из totalPrice. */
    subtotalFallback: number
    title?: string
    size?: 'md' | 'lg'
}

export default function CartOrderTotal({
    pricing,
    subtotalFallback,
    title = 'Итого',
    size = 'md',
}: Props) {
    const subtotal = pricing?.subtotal ?? subtotalFallback
    const total = pricing?.total ?? subtotalFallback
    const withDiscount = hasCartDiscount(pricing)
    const totalClass = size === 'lg' ? 'text-3xl' : 'text-2xl'

    return (
        <div className="space-y-2">
            <div className="flex items-start justify-between gap-4">
                <span className="text-white/90 text-lg font-blauer-nue pt-1">{title}</span>
                <div className="text-right">
                    {withDiscount && pricing ? (
                        <>
                            <p className="text-sm text-white/45 line-through tabular-nums">{formatByn(subtotal)}</p>
                            <p className="text-2xl font-bold text-[var(--mint-bright)] tabular-nums leading-tight">
                                {formatByn(total)}
                            </p>
                        </>
                    ) : (
                        <p className={`font-bold text-[var(--mint-bright)] tabular-nums ${totalClass}`}>
                            {formatByn(subtotal)}
                        </p>
                    )}
                </div>
            </div>
            {withDiscount && pricing ? (
                <>
                    <p className="text-xs text-white/55 text-right tabular-nums">
                        Ваша скидка{' '}
                        <span className="text-[var(--mint-bright)] font-semibold">{pricing.discountPercent}%</span>
                        {' '}(−{formatByn(pricing.discountAmount)})
                    </p>
                    <p className="text-[10px] text-white/35 text-right leading-snug">
                        Справочно. Итог к оплате считает сервер при оформлении заказа.
                    </p>
                </>
            ) : pricing ? (
                <p className="text-[10px] text-white/35 text-right leading-snug">
                    Справочно. Итог к оплате считает сервер при оформлении заказа.
                </p>
            ) : null}
        </div>
    )
}
