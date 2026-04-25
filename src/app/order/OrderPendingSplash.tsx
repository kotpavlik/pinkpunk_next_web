'use client'

import { useEffect } from 'react'
import { DotLottieReact } from '@lottiefiles/dotlottie-react'
import OrderConfirmedAnimation from '@/../public/animations/YourOrderIsConfirmed.json'

/** Ожидание: переход на success или гидрация данных из sessionStorage */
export default function OrderPendingSplash() {
    useEffect(() => {
        window.scrollTo({ top: 0, left: 0, behavior: 'auto' })
    }, [])

    return (
        <div className="relative flex min-h-dvh flex-1 flex-col items-center justify-start px-4 pb-12 pt-24 text-center text-white md:max-w-[100vw] md:px-0 md:pt-28">
            <div className="mx-auto mb-8 aspect-square w-[min(88vw,18rem)] sm:w-56 md:w-64 lg:w-72">
                <DotLottieReact
                    data={OrderConfirmedAnimation}
                    loop
                    autoplay
                    style={{ width: '100%', height: '100%' }}
                />
            </div>
            <p className="max-w-md text-balance text-xl font-blauer-nue text-white/80 animate-pulse md:text-2xl">
                Ждём, скоро всё случится
            </p>
        </div>
    )
}
