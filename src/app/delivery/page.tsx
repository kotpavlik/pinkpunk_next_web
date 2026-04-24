'use client'

import SectionText from "@/components/ui/shared/SectionText"






export default function Delivery() {
    return (
        <div className="relative md:max-w-[80vw] min-h-screen m-auto">

            {/* Content Overlay */}
            <div className="relative z-10  min-h-screen flex flex-col pt-20 mb-20">

                <div className="flex-[0_0_10%] flex ">
                    <SectionText title="Доставка">
                        <p className="text-sm leading-relaxed">
                            У нас одна из лучших доставок в Беларуси. Мы всегда заботимся о вашем времени и вашем комфорте.
                        </p>
                    </SectionText>
                </div>

                <div className=" flex md:flex-row flex-col">
                    <div className="space-y-6 md:space-y-8 mx-4 md:mx-0">
                        <div className="bg-white/5 backdrop-blur-sm rounded-lg p-6 border border-white/10">
                            <h3 className="text-lg font-semibold text-white mb-4">Доставка по Беларуси</h3>
                            <div className="text-gray-300 space-y-2">
                                <p>• Белпочта | Европочта | СДЭК — доставка бесплатная! Примерное время доставки — в течение 2–5 рабочих дней.</p>
                                <p>• (EMS) курьером до двери — стоимость 15 BYN. Примерное время доставки — от 1 до 3 рабочих дней.</p>
                                <p>• Отправляем все заказы после 100% оплаты. Оплатить товары можно картой онлайн или связавшись с менеджером в Instagram, Telegram или по номеру телефона +375(33)357-25-66.</p>
                            </div>
                        </div>
                        <div className="bg-white/5 backdrop-blur-sm rounded-lg p-6 border border-white/10">
                            <h3 className="text-lg font-semibold text-white mb-4">Доставка по Минску</h3>
                            <div className="text-gray-300 space-y-2">
                                <p>• Осуществляется нашим курьером до двери — доставка бесплатная, если сумма заказа равна или больше 200 BYN; в остальных случаях стоимость доставки — 10 BYN.</p>
                                <p>• Доставка осуществляется в день оплаты в любую точку Минска.</p>
                                <p>• Оплатить товары можно картой онлайн или связавшись с менеджером в Instagram, Telegram или по номеру телефона +375(33)357-25-66, а также наличными или картой при получении заказа.</p>
                            </div>
                        </div>
                        <div className="bg-white/5 backdrop-blur-sm rounded-lg p-6 border border-white/10">
                            <h3 className="text-lg font-semibold text-white mb-4">Доставка по России</h3>
                            <div className="text-gray-300 space-y-2">
                                <p>• Доставку по России производим компанией СДЭК.</p>
                                <p>• Стоимость доставки оплачивается при получении заказа.</p>
                                <p>• Среднее время доставки — 5–7 рабочих дней.</p>
                                <p>• Оплатить товары можно картой онлайн или связавшись с менеджером в Instagram, Telegram или по номеру телефона +375(33)357-25-66.</p>
                            </div>
                        </div>
                        <div className="bg-white/5 backdrop-blur-sm rounded-lg p-6 border border-white/10">
                            <h3 className="text-lg font-semibold text-white mb-4">Доставка по миру</h3>
                            <div className="text-gray-300 space-y-2">
                                <p>• Стоимость доставки рассчитывается индивидуально в зависимости от страны и веса заказа.</p>
                                <p>• Среднее время доставки — 14–38 рабочих дней.</p>
                                <p>• Оплатить товары можно картой онлайн или связавшись с менеджером в Instagram, Telegram или по номеру телефона +375(33)357-25-66.</p>
                            </div>
                        </div>
                        <div className="bg-white/5 backdrop-blur-sm rounded-lg p-6 border border-white/10">
                            <h3 className="text-lg font-semibold text-white mb-4">Оплата онлайн</h3>
                            <div className="text-gray-300 space-y-2">
                                <p>{'• Выберите понравившийся товар и нажмите на кнопку «В корзину».'}</p>
                                <p>{'• Перейдите в корзину и нажмите на кнопку «Оформить заказ».'}</p>
                                <p>{'• Заполните все необходимые поля, выберите способ оплаты «Картой онлайн» и нажмите на кнопку «Оформить заказ».'}</p>
                                <p>{'• Введите данные вашей карты и нажмите на кнопку «Оплатить».'}</p>
                                <p>{'• После успешной оплаты вы получите письмо на электронную почту с информацией о заказе, а также сможете отслеживать статус заказа в личном кабинете.'}</p>
                                <p>{'• После этого с вами свяжется менеджер для уточнения деталей заказа и доставки.'}</p>
                                <p>{'• Если у вас возникли вопросы, вы можете связаться с нами в Instagram, Telegram или по номеру телефона +375(33)357-25-66.'}</p>
                                <p>{'• Так же вы можете связаться с менеджером и он предоставит вам ссылку на оплату по средствам ЕРИП». (только для держателей банковских карт в Беларуси)'}</p>
                            </div>
                        </div>
                    </div>
                    <div></div>
                    <div></div>
                    <div></div>
                </div>
            </div>
        </div>
    )
}