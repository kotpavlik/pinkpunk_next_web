'use client'

import React, { memo, useState, useEffect } from 'react'
import Modal from '@/features/modal/Modal'

const InfoBlocks = memo(function InfoBlocks() {
    const [modalContent, setModalContent] = useState<{ title: string; content: string } | null>(null)
    const [isModalOpen, setIsModalOpen] = useState(false)
    const [isMobile, setIsMobile] = useState(false)

    useEffect(() => {
        // Проверяем размер экрана только один раз при монтировании
        setIsMobile(window.innerWidth < 640)
    }, [])

    const openModal = (title: string, content: string) => {
        setModalContent({ title, content })
        setIsModalOpen(true)
    }

    const closeModal = () => {
        setIsModalOpen(false)
    }

    return (
        <>
            <div className="flex-1 h-[50%] w-full flex flex-col md:flex-row items-start font-bold text-lg justify-between gap-2">
                {/* Магазин - редирект в каталог */}
                <a
                    href="#catalog"
                    className="text-sm text-gray-500 border border-gray-500 rounded-md p-2 w-full cursor-pointer hover:bg-gray-50 transition-colors md:cursor-pointer md:hover:bg-gray-50"
                >
                    магазин
                </a>

                {/* Покупателям - информативная модалка */}
                <div
                    className="text-sm text-gray-500 border border-gray-500 rounded-md p-2 w-full cursor-pointer hover:bg-gray-50 transition-colors md:cursor-default md:hover:bg-transparent"
                    onClick={() => {
                        // Только на маленьких мобильных устройствах
                        if (isMobile) {
                            openModal('Покупателям', 'Доставка по Минску и Беларуси, оплата картой или наличными, возврат в течение 14 дней, размерная сетка для каждого товара.')
                        }
                    }}
                >
                    покупателям
                </div>

                {/* Контакты - информативная модалка */}
                <div
                    className="text-sm text-gray-500 border border-gray-500 rounded-md p-2 w-full cursor-pointer hover:bg-gray-50 transition-colors md:cursor-default md:hover:bg-transparent"
                    onClick={() => {
                        // Только на маленьких мобильных устройствах
                        if (isMobile) {
                            openModal('Контакты', 'г.Минск ул.Мясникова 76, 1 подъезд, помещение 14, последний этаж. Работаем каждый день с 12:00 до 20:00.')
                        }
                    }}
                >
                    контакты
                </div>

                {/* Соц.сети - информативная модалка */}
                <div
                    className="text-sm text-gray-500 border border-gray-500 rounded-md p-2 w-full cursor-pointer hover:bg-gray-50 transition-colors md:cursor-default md:hover:bg-transparent"
                    onClick={() => {
                        // Только на маленьких мобильных устройствах
                        if (isMobile) {
                            openModal('Мы в соц. сетях', 'Instagram: @pinkpunk_official, Telegram: @pinkpunk_channel, VK: vk.com/pinkpunk')
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
                <p>{modalContent?.content}</p>
            </Modal>
        </>
    )
})

export default InfoBlocks
