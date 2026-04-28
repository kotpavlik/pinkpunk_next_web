'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { DotLottieReact } from '@lottiefiles/dotlottie-react'
import OrderConfirmedAnimation from '@/../public/animations/YourOrderIsConfirmed.json'
import OrderPendingSplash from '@/app/order/OrderPendingSplash'
import {
    getOrderStatusText,
    readOrderSuccessFromStorage,
    type OrderSuccessPayload,
} from '@/app/order/orderSuccessUtils'

export default function OrderSuccessPage() {
    const router = useRouter()
    const [data, setData] = useState<OrderSuccessPayload | null | undefined>(undefined)
    const [isDetailsOpen, setIsDetailsOpen] = useState(false)

    useEffect(() => {
        setData(readOrderSuccessFromStorage())
    }, [])

    if (data === undefined) {
        return <OrderPendingSplash />
    }

    if (!data) {
        return (
            <div className="relative flex min-h-dvh flex-1 flex-col items-center justify-center px-4 py-24 text-center text-white md:max-w-[100vw] md:px-0">
                <h1 className="text-2xl font-blauer-nue mb-4">Нет данных о заказе</h1>
                <p className="text-white/60 mb-8 max-w-md">
                    Откройте эту страницу сразу после оформления заказа или перейдите в профиль, чтобы увидеть заказы.
                </p>
                <div className="flex flex-col sm:flex-row gap-4">
                    <Link
                        href="/catalog"
                        className="px-6 py-3 bg-white/10 text-white hover:bg-white/20 transition-colors font-semibold border border-white/20"
                    >
                        В каталог
                    </Link>
                    <button
                        type="button"
                        onClick={() => router.push('/user_profile')}
                        className="px-6 py-3 bg-[var(--pink-punk)] text-white hover:bg-[var(--pink-light)] transition-colors font-semibold"
                    >
                        Мои заказы
                    </button>
                </div>
            </div>
        )
    }

    const itemsTotal = data.items?.reduce((sum, item) => sum + item.price * item.quantity, 0) ?? data.subtotal
    const orderDetails = (
        <div className="max-w-md mx-auto w-full mb-8 text-left">
            <button
                type="button"
                onClick={() => setIsDetailsOpen(prev => !prev)}
                className="flex w-full items-center justify-between bg-white/5 border border-white/10 p-4 text-left transition-colors hover:bg-white/10"
                aria-expanded={isDetailsOpen}
            >
                <span className="font-blauer-nue text-base font-semibold text-white">Детали заказа</span>
                <span className={`text-xl text-white/70 transition-transform ${isDetailsOpen ? 'rotate-180' : ''}`}>
                    ˅
                </span>
            </button>

            {isDetailsOpen && (
                <div className="space-y-3 border-x border-b border-white/10 bg-white/[0.03] p-4">
                    <div className="bg-white/5 border border-white/10 p-4">
                        <span className="text-white/70">Статус: </span>
                        <span className="text-white font-semibold">{getOrderStatusText(data.status)}</span>
                    </div>

                    {data.items && data.items.length > 0 && (
                        <div className="bg-white/5 border border-white/10 p-4">
                            <h2 className="text-base font-blauer-nue font-semibold text-white mb-3">
                                Товары в заказе
                            </h2>
                            <div className="space-y-3">
                                {data.items.map((item, index) => (
                                    <div key={`${item.name}-${index}`} className="border-b border-white/10 pb-3 last:border-b-0 last:pb-0">
                                        <div className="flex items-start justify-between gap-4">
                                            <div>
                                                <p className="text-white font-semibold">{item.name}</p>
                                                <p className="text-white/60 text-sm">
                                                    {item.size ? `${item.size} · ` : ''}
                                                    {item.quantity} шт. × {item.price.toFixed(2)} BYN
                                                </p>
                                            </div>
                                            <p className="text-[var(--mint-bright)] font-semibold whitespace-nowrap">
                                                {(item.price * item.quantity).toFixed(2)} BYN
                                            </p>
                                        </div>
                                    </div>
                                ))}
                            </div>
                            {typeof itemsTotal === 'number' && (
                                <div className="flex justify-between items-center mt-4 pt-3 border-t border-white/10">
                                    <span className="text-white/70">Итого по товарам:</span>
                                    <span className="text-white font-semibold">{itemsTotal.toFixed(2)} BYN</span>
                                </div>
                            )}
                        </div>
                    )}

                    <div className="flex justify-between items-center bg-white/5 border border-white/10 p-4">
                        <span className="text-white/70">Сумма заказа:</span>
                        <span className="text-[var(--mint-bright)] font-bold text-lg">
                            {data.totalAmount.toFixed(2)} BYN
                        </span>
                    </div>
                </div>
            )}
        </div>
    )

    return (
        <div className="relative flex min-h-dvh flex-1 flex-col md:max-w-[100vw] md:px-0">
            <div className="flex flex-1 flex-col px-4 pb-12 pt-24 text-center text-white md:pb-20 md:pt-28">
                <div className="mb-6">
                    <div className="mx-auto mb-4 h-32 w-32">
                        <DotLottieReact
                            data={OrderConfirmedAnimation}
                            loop
                            autoplay
                            style={{ width: '100%', height: '100%' }}
                        />
                    </div>
                    <h1 className="mb-2 font-blauer-nue text-xl text-[var(--pink-punk)] md:text-2xl">
                        Заказ #{data.orderNumber} успешно создан!
                    </h1>
                    <p className="mx-auto mb-6 max-w-lg text-white/70">
                        Скоро с вами свяжется наш менеджер.
                    </p>
                </div>

                {orderDetails}

                <p className="text-white/70 text-sm mb-6">Информация о заказе доступна в вашем профиле.</p>

                <div className="flex flex-col sm:flex-row gap-4 justify-center max-w-md mx-auto">
                    <Link
                        href="/catalog"
                        className="px-6 py-3 bg-white/10 text-white hover:bg-white/20 transition-colors font-semibold border border-white/20 text-center"
                    >
                        Вернуться в каталог
                    </Link>
                    <button
                        type="button"
                        onClick={() => router.push('/user_profile')}
                        className="px-6 py-3 bg-[var(--pink-punk)] text-white hover:bg-[var(--pink-light)] transition-colors font-semibold"
                    >
                        Отслеживать заказ
                    </button>
                </div>
            </div>
        </div>
    )
}
