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
                            <a href="https://t.me/pozdnee_utro" target="_blank" rel="noopener noreferrer" aria-label="Telegram" className='cursor-pointer'>
                                <div className='relative lg:absolute lg:top-5 lg:right-5 flex mt-5  lg:mt-0 justify-center bg-white/5 backdrop-blur-sm rounded-lg p-6 border border-white/10 text-white/60 hover:text-[var(--pink-light)] transition-colors ease-in-out duration-300  overflow-hidden group ' >
                                    {/* gradient shine overlay */}
                                    <span
                                        aria-hidden
                                        className="pointer-events-none absolute inset-0 rounded-lg opacity-0 group-hover:opacity-100 transition-opacity duration-300"
                                        style={{
                                            background: 'linear-gradient(135deg, rgba(255,255,255,0.00) 0%, rgba(255,255,255,0.08) 35%, rgba(255,255,255,0.00) 70%)'
                                        }}
                                    />
                                    <span
                                        aria-hidden
                                        className="pointer-events-none absolute -inset-[1px] rounded-lg -translate-x-full group-hover:translate-x-[200%] transition-transform duration-1000 ease-in-out"
                                        style={{
                                            background: 'linear-gradient(110deg, transparent 0%, rgba(22, 255, 189, 0.2) 15%, transparent 30%)'
                                        }}
                                    />

                                    <button className='flex items-center cursor-pointer justify-center gap-3'>
                                        <svg className="md:w-8 md:h-8 w-12 h-12" fill="currentColor" viewBox="0 0 24 24" aria-hidden="true">
                                            <path d="M11.944 0A12 12 0 0 0 0 12a12 12 0 0 0 12 12 12 12 0 0 0 12-12A12 12 0 0 0 12 0a12 12 0 0 0-.056 0zm4.962 7.224c.1-.002.321.023.465.14a.506.506 0 0 1 .171.325c.016.093.036.306.02.472-.18 1.898-.962 6.502-1.36 8.627-.168.9-.499 1.201-.82 1.23-.696.065-1.225-.46-1.9-.902-1.056-.693-1.653-1.124-2.678-1.8-1.185-.78-.417-1.21.258-1.91.177-.184 3.247-2.977 3.307-3.23.007-.032.014-.15-.056-.212s-.174-.041-.249-.024c-.106.024-1.793 1.14-5.061 3.345-.48.33-.913.49-1.302.48-.428-.008-1.252-.241-1.865-.44-.752-.245-1.349-.374-1.297-.789.027-.216.325-.437.893-.663 3.498-1.524 5.83-2.529 6.998-3.014 3.332-1.386 4.025-1.627 4.476-1.635z" />
                                        </svg>
                                        <div className='font-durik text-2xl'>Заказать сертификат</div>
                                    </button>

                                </div>

                            </a>
                        </div>

                    </div>
                </div>
            </div>
        </div>
    )
}