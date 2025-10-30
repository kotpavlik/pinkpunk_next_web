'use client'
import { useEffect, useState } from 'react'
import Image from 'next/image'
import SectionText from "@/components/ui/shared/SectionText"

export default function GiftCertificate() {
    const [isImageVisible, setIsImageVisible] = useState(false)

    useEffect(() => {
        const timerId = setTimeout(() => setIsImageVisible(true), 300)
        return () => clearTimeout(timerId)
    }, [])

    return (
        <div className="relative md:max-w-[80vw] px-4 md:px-0 m-auto min-h-screen mb-20">

            {/* Content Overlay с затемненным фоном */}
            <div className="relative z-10 flex flex-col pt-20 ">
                <div className="bg-white/5 backdrop-blur-sm rounded-lg p-6 border border-white/10 relative overflow-hidden">
                    <div className="flex-[0_0_10%] flex">
                        <SectionText title="Подарочные сертификаты">
                            <p className="text-sm leading-relaxed ">
                                Отличный подарок для тех, кто любит бренд PINK PUNK! <br />Давайте мы вам посдсветим почему мы такие крутые и почему вы должны купить подарочный сертификат 🤟🏻
                            </p>
                        </SectionText>
                    </div>
                    <div
                        className='flex-1 flex flex-col justify-center md:absolute top-0 right-0 md:w-1/2 w-full h-full transition-transform duration-700 ease-out'
                        style={{
                            transform: isImageVisible ? 'translateX(0)' : 'translateX(100%)',
                            WebkitTransform: isImageVisible ? 'translate3d(0,0,0)' : 'translate3d(100%,0,0)',
                            willChange: 'transform',
                            backfaceVisibility: 'hidden',
                            WebkitBackfaceVisibility: 'hidden',
                            animationName: isImageVisible ? 'shake' : 'none',
                            animationDuration: '3s',
                            animationTimingFunction: 'ease-in-out',
                            animationIterationCount: isImageVisible ? 'infinite' : 'none',
                            animationDelay: '0.5s',
                        }}
                    >
                        <Image src="/images/gift_certificates/gift_certificate.png" alt="Подарочный сертификат" width={600} height={800} className='w-full h-full object-contain' />
                    </div>
                </div>

            </div>
            <div className="relative z-10 flex flex-col pt-4 ">
                <div className="flex-1 flex flex-col justify-center">
                    <div className="space-y-6 md:space-y-8">
                        <div className="bg-white/5 backdrop-blur-sm rounded-lg p-6 border border-white/10">
                            <h3 className="text-lg font-semibold text-white mb-4">Наши сертификаты:</h3>
                            <div className="text-gray-300 space-y-2">
                                <p>• мы сами красиво упаковываем </p>
                                <p>• не имеют ограничений на сумму (123 BYN или 321 BYN — все подходит)</p>
                                <p>• бессрочны, и вам не нужно волноваться, что они вот-вот просрочатся</p>
                                <p>• мы доставляем наши сертификаты (от 200 BYN) бесплатно по всей Беларуси</p>
                                <p>• чтобы заказать сертификат, вам нужно просто связаться с нами любым удобным способом</p>
                            </div>
                        </div>

                    </div>
                </div>
            </div>
        </div>
    )
}