'use client'

import SectionText from "@/components/ui/shared/SectionText"

export default function ExchangeAndReturn() {
    return (
        <div className="relative md:max-w-[80vw] px-4 md:px-0 m-auto">
            {/* Content Overlay */}
            <div className="relative z-10  flex flex-col pt-20 mb-20">

                <div className="flex-[0_0_10%] flex">
                    <SectionText title="Обмен и возврат">
                        <p className="text-sm leading-relaxed">
                            Вы можете вернуть покупки из PINK PUNK в любой наш магазин — неважно, где вы их приобрели: онлайн или оффлайн. Главное чтобы вы приобрели товар в нашем магазине. <br /><br />
                            Мы, конечно, мечтаем, чтобы каждая вещь оставалась с вами навсегда, но понимаем, что возвраты — это часть шопинга. Поэтому мы сделали этот процесс максимально простым и комфортным для всех.
                        </p>
                    </SectionText>
                </div>

                <div className="flex-1 flex flex-col justify-center">
                    <div className="space-y-6 md:space-y-8">
                        <div className="bg-white/5 backdrop-blur-sm rounded-lg p-6 border border-white/10">
                            <h3 className="text-lg font-semibold text-white mb-4">Возврат</h3>
                            <div className="text-gray-300 space-y-2">
                                <p>• Возврат возможен в течение 14 дней с момента покупки! Согласно статье 28 Закона о защите прав потребителей Республики Беларусь.</p>
                            </div>
                        </div>
                        <div className="bg-white/5 backdrop-blur-sm rounded-lg p-6 border border-white/10">
                            <h3 className="text-lg font-semibold text-white mb-4">Обмен</h3>
                            <ul className="text-gray-300 space-y-2">
                                <li>• Товар должен быть в оригинальном состоянии</li>
                                <li>• Сохранена оригинальная упаковка</li>
                                <li>• Обмен возможен в течение 14 дней с момента покупки</li>
                                <li>• Причина обмена должна быть обоснованной <br />
                                    (очень захотел другй цвет - такое подходит)</li>
                            </ul>
                        </div>



                        <div className="bg-white/5 backdrop-blur-sm rounded-lg p-6 border border-white/10">
                            <h3 className="text-lg font-semibold text-white mb-4">Как оформить возврат</h3>
                            <ol className="text-gray-300 space-y-2">
                                <li>• Свяжитесь с нами по телефону или через соц.сети</li>
                                <li>• Опишите причину возврата</li>
                                <li>• Принесите товар в наш магазин</li>
                                <li>• Получите возврат денежных средств</li>
                            </ol>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    )
}
