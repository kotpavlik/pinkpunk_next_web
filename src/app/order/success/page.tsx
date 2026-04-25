'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { DotLottieReact } from '@lottiefiles/dotlottie-react'
import OrderConfirmedAnimation from '@/../public/animations/YourOrderIsConfirmed.json'
import AlfaMultiframeCardForm from '@/components/ui/order/AlfaMultiframeCardForm'
import OrderPendingSplash from '@/app/order/OrderPendingSplash'
import {
    getOrderStatusText,
    readOrderSuccessFromStorage,
    type OrderSuccessPayload,
} from '@/app/order/orderSuccessUtils'

export default function OrderSuccessPage() {
    const router = useRouter()
    const [data, setData] = useState<OrderSuccessPayload | null | undefined>(undefined)

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

    return (
        <div className="relative flex min-h-dvh flex-1 flex-col md:max-w-[100vw] md:px-0">
            <div className="flex flex-1 flex-col px-4 py-12 text-center text-white md:py-20">
                <div className="mb-6">
                    <div className="w-32 h-32 mx-auto mb-4">
                        <DotLottieReact
                            data={OrderConfirmedAnimation}
                            loop
                            autoplay
                            style={{ width: '100%', height: '100%' }}
                        />
                    </div>
                    <h1 className="text-xl md:text-2xl font-blauer-nue mb-2 text-[var(--pink-punk)]">
                        Заказ #{data.orderNumber} успешно создан!
                    </h1>
                    <p className="text-white/70 mb-6 max-w-lg mx-auto">
                        Корзина очищена. Скоро с вами свяжется наш менеджер.
                    </p>
                </div>

                <div className="max-w-md mx-auto space-y-3 mb-8">
                    <div className="flex justify-between items-center p-4 bg-white/5 border border-white/10">
                        <span className="text-white/70">Статус:</span>
                        <span className="text-white font-semibold">{getOrderStatusText(data.status)}</span>
                    </div>
                    <div className="flex justify-between items-center p-4 bg-white/5 border border-white/10">
                        <span className="text-white/70">Сумма заказа:</span>
                        <span className="text-[var(--mint-bright)] font-bold text-lg">
                            {data.totalAmount.toFixed(2)} BYN
                        </span>
                    </div>
                </div>

                {data.payOnlineWithCard && (
                    <div className="max-w-md mx-auto mb-8 w-full text-left">
                        <h2 className="text-lg font-blauer-nue font-semibold text-white mb-3 text-center">
                            Оплата заказа картой
                        </h2>
                        <AlfaMultiframeCardForm enableBindings={false} />
                    </div>
                )}

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
