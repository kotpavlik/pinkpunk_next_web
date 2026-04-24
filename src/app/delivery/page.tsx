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
                            У нас одна из лучших доставок в Беларуси. Мы всегда забодимся о вашем времени и вашем комфорте.
                        </p>
                    </SectionText>
                </div>

                <div className=" flex md:flex-row flex-col">
                    <div className="space-y-6 md:space-y-8 mx-4 md:mx-0">
                        <div className="bg-white/5 backdrop-blur-sm rounded-lg p-6 border border-white/10">
                            <h3 className="text-lg font-semibold text-white mb-4">Доствка по Беларуси </h3>
                            <div className="text-gray-300 space-y-2">
                                <p>• Белпочта | Европочта | СДЕК - доставка бесплатная! Примерное время доставки в течении 2-5 рабочих дней</p>
                                <p>• (EMS) курьером до двери - стоимость 15 byn. Примерное время доставки в течении 1-3 дней</p>
                                <p>• Отправляем все заказы после 100% оплаты. Оплатить товары можно картой онлайн или связавшись с менеджером в instagram | telegram | или по номеру телефона +375(33)357-25-66 </p>
                            </div>
                        </div>
                        <div className="bg-white/5 backdrop-blur-sm rounded-lg p-6 border border-white/10">
                            <h3 className="text-lg font-semibold text-white mb-4">Доставка по Минску </h3>
                            <div className="text-gray-300 space-y-2">
                                <p>• Осуществляется нашим курьером до двери - доставка бесплатная, если сумма заказа ровна или больше 200 byn, в остальных случаях стоимость доставки 10 byn</p>
                                <p>• Доставка осуществляется в день оплаты влюбую точку Минска</p>
                                <p>• Оплатить товары можно картой онлайн или связавшись с менеджером в instagram | telegram | или по номеру телефона +375(33)357-25-66, а так же наличными или картой при получении заказа </p>
                            </div>
                        </div>
                        <div className="bg-white/5 backdrop-blur-sm rounded-lg p-6 border border-white/10">
                            <h3 className="text-lg font-semibold text-white mb-4">Доставка по России </h3>
                            <div className="text-gray-300 space-y-2">
                                <p>• Доставку ппо России производим компанией СДЕК </p>
                                <p>• Стоимость доставки оплачиваете при получении заказа</p>
                                <p>• Среднее время доставки 5-7 рабочих дней</p>
                                <p>• Оплатить товары можно картой онлайн или связавшись с менеджером в instagram | telegram | или по номеру телефона +375(33)357-25-66</p>
                            </div>
                        </div>
                        <div className="bg-white/5 backdrop-blur-sm rounded-lg p-6 border border-white/10">
                            <h3 className="text-lg font-semibold text-white mb-4">Доставка по Миру </h3>
                            <div className="text-gray-300 space-y-2">
                                <p>• Стоимость доставки расчитывается индивидуально в зависимости от страны и веса заказа</p>
                                <p>• Среднее время доставки  14-38 рабочих дней</p>
                                <p>• Оплатить товары можно картой онлайн или связавшись с менеджером в instagram | telegram | или по номеру телефона +375(33)357-25-66</p>
                            </div>
                        </div>
                        <div className="bg-white/5 backdrop-blur-sm rounded-lg p-6 border border-white/10">
                            <h3 className="text-lg font-semibold text-white mb-4">Оплата онлайн</h3>
                            <div className="text-gray-300 space-y-2">
                                <p>{'• Выберете понравившийся товар и нажмите на кнопку "в корзину"'}</p>
                                <p>{'• Перейдите в корзину и нажмите на кнопку "оформить заказ"'}</p>
                                <p>{'• Заполните все необходимые поля, выберите способ оплаты "картой онлайн" и нажмите на кнопку "оформить заказ"'}</p>
                                <p>{'• Введите данные вашей карты и нажмите на кнопку "оплатить"'}</p>
                                <p>{'• После успешной оплаты вы получите письмо на вашу электронную почту с информацией о заказе, а так же можете отслеживать статус заказа в вашем профиле'}</p>
                                <p>{'• После с вами свяжется менеджер для уточнения деталей заказа и доставки'}</p>
                                <p>{'• Если у вас возникли вопросы, вы можете связаться с нами в instagram | telegram | или по номеру телефона +375(33)357-25-66'}</p>
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