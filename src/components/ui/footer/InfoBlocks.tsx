'use client'

import React, { memo, useState, useEffect } from 'react'
import Modal from '@/features/modal/Modal'

const InfoBlocks = memo(function InfoBlocks() {
    const [modalContent, setModalContent] = useState<{ title: string } | null>(null)
    const [isModalOpen, setIsModalOpen] = useState(false)
    const [isMobile, setIsMobile] = useState(false)

    useEffect(() => {
        // Проверяем размер экрана только один раз при монтировании
        setIsMobile(window.innerWidth < 640)
    }, [])

    const openModal = (title: string) => {
        setModalContent({ title })
        setIsModalOpen(true)
    }

    const closeModal = () => {
        setIsModalOpen(false)
    }

    return (
        <>
            <div className="flex-1 font-durik h-[50%] w-full flex flex-col md:flex-row items-start text-lg justify-between gap-2">
                {/* Магазин - редирект в каталог */}
                <a
                    href="#catalog"
                    className="text-sm text-gray-500 border-b-1 border-gray-500  p-2 w-full cursor-pointer hover:bg-gray-50 transition-colors md:cursor-pointer md:hover:bg-gray-50"
                >
                    магазин
                </a>

                {/* Покупателям - информативная модалка */}
                <div
                    className="text-sm text-gray-500 border-b-1 border-gray-500  p-2 w-full cursor-pointer hover:bg-gray-50 transition-colors md:cursor-default md:hover:bg-transparent"
                    onClick={() => {
                        // Только на маленьких мобильных устройствах
                        if (isMobile) {
                            openModal('Покупателям')
                        }
                    }}
                >
                    покупателям
                </div>

                {/* Контакты - информативная модалка */}
                <div
                    className="text-sm text-gray-500 border-b-1 border-gray-500  p-2 w-full cursor-pointer hover:bg-gray-50 transition-colors md:cursor-default md:hover:bg-transparent"
                    onClick={() => {
                        // Только на маленьких мобильных устройствах
                        if (isMobile) {
                            openModal('Контакты')
                        }
                    }}
                >
                    контакты
                </div>

                {/* Соц.сети - информативная модалка */}
                <div
                    className="text-sm text-gray-500 border-b-1 border-gray-500  p-2 w-full cursor-pointer hover:bg-gray-50 transition-colors md:cursor-default md:hover:bg-transparent"
                    onClick={() => {
                        // Только на маленьких мобильных устройствах
                        if (isMobile) {
                            openModal('Мы в соц. сетях')
                        }
                    }}
                >
                    мы в соц. сетях
                </div>
            </div>

            {/* Модалка только для маленьких мобильных */}
            <Modal
                isOpen={isModalOpen && isMobile}
                onClose={closeModal}
                title={modalContent?.title || ''}
            >
                {modalContent?.title === 'Покупателям' && <p>Доставка по Минску и Беларуси, оплата картой или наличными, возврат в течение 14 дней, размерная сетка для каждого товара.</p>}
                {modalContent?.title === 'Контакты' && <p>г.Минск ул.Мясникова 76, 1 подъезд, помещение 14, последний этаж. Работаем каждый день с 12:00 до 20:00.</p>}
                {modalContent?.title === 'Мы в соц. сетях' && <p>Instagram: @pinkpunk_official, Telegram: @pinkpunk_channel, VK: vk.com/pinkpunk</p>}
                {modalContent?.title === '' && <p> Упс, что-то пошло не так</p>}


            </Modal>
        </>
    )
})

export default InfoBlocks
