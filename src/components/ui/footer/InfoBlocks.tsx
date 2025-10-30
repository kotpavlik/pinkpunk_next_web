'use client'

import React, { memo, useState, useEffect } from 'react'
import Modal from '@/features/modal/Modal'
import Link from 'next/link'
import { useRouter } from 'next/navigation'

const InfoBlocks = memo(function InfoBlocks() {

    const router = useRouter()
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
                <div className='relative w-full'>
                    <div
                        className="text-sm text-gray-500 border-b-1 border-gray-500  p-2 w-full cursor-pointer transition-colors md:cursor-default md:hover:bg-transparent"
                        onClick={() => {
                            // Только на маленьких мобильных устройствах
                            if (isMobile) {
                                openModal('магазин')
                            }
                        }}
                    >
                        магазин

                    </div>
                    {!isModalOpen && !isMobile && <div>
                        <p className='text-sm font-cabinet-grotesk lowercase text-gray-500 mt-4'>
                            <a href="#catalog">
                                каталог
                            </a>
                        </p>
                        <p className='text-sm font-cabinet-grotesk lowercase text-gray-500 mt-4'>
                            <Link href="/pinkpunkabout">
                                о пинк панк
                            </Link>
                        </p>
                        <p className='text-sm font-cabinet-grotesk lowercase text-gray-500 mt-4'>
                            <Link href="/company_registration_details">
                                реквизиты
                            </Link>
                        </p>
                    </div>}
                </div>


                {/* Покупателям - информативная модалка */}
                <div className='relative w-full'>
                    <div
                        className="text-sm text-gray-500 border-b-1 border-gray-500  p-2 w-full cursor-pointer  transition-colors md:cursor-default md:hover:bg-transparent"
                        onClick={() => {
                            // Только на маленьких мобильных устройствах
                            if (isMobile) {
                                openModal('Покупателям')
                            }
                        }}
                    >
                        покупателям
                    </div>
                    {!isModalOpen && !isMobile && <div>
                        <p className='text-sm font-cabinet-grotesk lowercase text-gray-500 mt-4'>
                            <Link href="/delivery">
                                доставка
                            </Link>
                        </p>
                        <div className='text-sm font-cabinet-grotesk lowercase text-gray-500 mt-4'>
                            <Link href="/exchange_and_return">
                                обмен и возврат
                            </Link>
                        </div>
                        <p className='text-sm font-cabinet-grotesk lowercase text-gray-500 mt-4'>
                            <Link href="/composition_and_care">
                                состав и уход
                            </Link>
                        </p>
                        <p className='text-sm font-cabinet-grotesk lowercase text-gray-500 mt-4'>
                            <Link href="/gift_certificate">
                                подарочные сертификаты
                            </Link>
                        </p>
                    </div>}
                </div>

                {/* Контакты - информативная модалка */}
                <div className='relative w-full'>
                    <div
                        className="text-sm text-gray-500 border-b-1 border-gray-500  p-2 w-full cursor-pointer transition-colors md:cursor-default md:hover:bg-transparent"
                        onClick={() => {
                            // Только на маленьких мобильных устройствах
                            if (isMobile) {
                                openModal('Контакты')
                            }
                        }}
                    >
                        контакты
                    </div>
                    {!isModalOpen && !isMobile && <div>
                        <p className='text-sm font-cabinet-grotesk lowercase text-gray-500 mt-4'>
                            <a href="https://t.me/pozdnee_utro" target="_blank" rel="noopener noreferrer" className="flex items-center gap-2 ">
                                <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 24 24">
                                    <path d="M11.944 0A12 12 0 0 0 0 12a12 12 0 0 0 12 12 12 12 0 0 0 12-12A12 12 0 0 0 12 0a12 12 0 0 0-.056 0zm4.962 7.224c.1-.002.321.023.465.14a.506.506 0 0 1 .171.325c.016.093.036.306.02.472-.18 1.898-.962 6.502-1.36 8.627-.168.9-.499 1.201-.82 1.23-.696.065-1.225-.46-1.9-.902-1.056-.693-1.653-1.124-2.678-1.8-1.185-.78-.417-1.21.258-1.91.177-.184 3.247-2.977 3.307-3.23.007-.032.014-.15-.056-.212s-.174-.041-.249-.024c-.106.024-1.793 1.14-5.061 3.345-.48.33-.913.49-1.302.48-.428-.008-1.252-.241-1.865-.44-.752-.245-1.349-.374-1.297-.789.027-.216.325-.437.893-.663 3.498-1.524 5.83-2.529 6.998-3.014 3.332-1.386 4.025-1.627 4.476-1.635z" />
                                </svg> Telegram
                            </a>
                        </p>
                        <p className='text-sm font-cabinet-grotesk lowercase text-gray-500 mt-4'>
                            <a href="mailto:pinkpunk.company@gmail.com" className="flex items-center gap-2 ">
                                <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 24 24">
                                    <path d="M20 4H4c-1.1 0-1.99.9-1.99 2L2 18c0 1.1.9 2 2 2h16c1.1 0 2-.9 2-2V6c0-1.1-.9-2-2-2zm0 4l-8 5-8-5V6l8 5 8-5v2z" />
                                </svg> Email
                            </a>
                        </p>
                        <p className='text-sm font-cabinet-grotesk lowercase text-gray-500 mt-4'>
                            <a href="https://wa.me/375333572566" target="_blank" rel="noopener noreferrer" className="flex items-center gap-2 md:">
                                <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 24 24">
                                    <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893A11.821 11.821 0 0020.885 3.488" />
                                </svg> WhatsApp
                            </a>
                        </p>
                        <p className='text-sm font-cabinet-grotesk lowercase text-gray-500 mt-4'>
                            <a href="tel:+375333572566" className="flex items-center gap-2 ">
                                <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 24 24">
                                    <path d="M6.62 10.79c1.44 2.83 3.76 5.14 6.59 6.59l2.2-2.2c.27-.27.67-.36 1.02-.24 1.12.37 2.33.57 3.57.57.55 0 1 .45 1 1V20c0 .55-.45 1-1 1-9.39 0-17-7.61-17-17 0-.55.45-1 1-1h3.5c.55 0 1 .45 1 1 0 1.25.2 2.45.57 3.57.11.35.03.74-.25 1.02l-2.2 2.2z" />
                                </svg> +375(33)357-25-66
                            </a>
                        </p>
                    </div>}
                </div>

                {/* Соц.сети - информативная модалка */}
                <div className='relative w-full'>
                    <div
                        className="text-sm text-gray-500 border-b-1 border-gray-500  p-2 w-full cursor-pointer transition-colors md:cursor-default md:hover:bg-transparent"
                        onClick={() => {
                            // Только на маленьких мобильных устройствах
                            if (isMobile) {
                                openModal('Мы в соц.сетях')
                            }
                        }}
                    >
                        соц.сети
                    </div>
                    {!isModalOpen && !isMobile && <div>
                        <p className='text-sm font-cabinet-grotesk lowercase text-gray-500 mt-4'>
                            <a href="https://www.instagram.com/pinkpunk_brand" target="_blank" rel="noopener noreferrer" className="flex items-center gap-2">
                                <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 24 24">
                                    <path d="M12 2.163c3.204 0 3.584.012 4.85.07 3.252.148 4.771 1.691 4.919 4.919.058 1.265.069 1.645.069 4.849 0 3.205-.012 3.584-.069 4.849-.149 3.225-1.664 4.771-4.919 4.919-1.266.058-1.644.07-4.85.07-3.204 0-3.584-.012-4.849-.07-3.26-.149-4.771-1.699-4.919-4.92-.058-1.265-.07-1.644-.07-4.849 0-3.204.013-3.583.07-4.849.149-3.227 1.664-4.771 4.919-4.919 1.266-.057 1.645-.069 4.849-.069zm0-2.163c-3.259 0-3.667.014-4.947.072-4.358.2-6.78 2.618-6.98 6.98-.059 1.281-.073 1.689-.073 4.948 0 3.259.014 3.668.072 4.948.2 4.358 2.618 6.78 6.98 6.98 1.281.058 1.689.072 4.948.072 3.259 0 3.668-.014 4.948-.072 4.354-.2 6.782-2.618 6.979-6.98.059-1.28.073-1.689.073-4.948 0-3.259-.014-3.667-.072-4.947-.196-4.354-2.617-6.78-6.979-6.98-1.281-.059-1.69-.073-4.949-.073zm0 5.838c-3.403 0-6.162 2.759-6.162 6.162s2.759 6.163 6.162 6.163 6.162-2.759 6.162-6.163c0-3.403-2.759-6.162-6.162-6.162zm0 10.162c-2.209 0-4-1.79-4-4 0-2.209 1.791-4 4-4s4 1.791 4 4c0 2.21-1.791 4-4 4zm6.406-11.845c-.796 0-1.441.645-1.441 1.44s.645 1.44 1.441 1.44c.795 0 1.439-.645 1.439-1.44s-.644-1.44-1.439-1.44z" />
                                </svg> Instagram
                            </a>
                        </p>
                        <p className='text-sm font-cabinet-grotesk lowercase text-gray-500 mt-4'>
                            <a href="https://t.me/pinkpunk_brand" target="_blank" rel="noopener noreferrer" className="flex items-center gap-2">
                                <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 24 24">
                                    <path d="M11.944 0A12 12 0 0 0 0 12a12 12 0 0 0 12 12 12 12 0 0 0 12-12A12 12 0 0 0 12 0a12 12 0 0 0-.056 0zm4.962 7.224c.1-.002.321.023.465.14a.506.506 0 0 1 .171.325c.016.093.036.306.02.472-.18 1.898-.962 6.502-1.36 8.627-.168.9-.499 1.201-.82 1.23-.696.065-1.225-.46-1.9-.902-1.056-.693-1.653-1.124-2.678-1.8-1.185-.78-.417-1.21.258-1.91.177-.184 3.247-2.977 3.307-3.23.007-.032.014-.15-.056-.212s-.174-.041-.249-.024c-.106.024-1.793 1.14-5.061 3.345-.48.33-.913.49-1.302.48-.428-.008-1.252-.241-1.865-.44-.752-.245-1.349-.374-1.297-.789.027-.216.325-.437.893-.663 3.498-1.524 5.83-2.529 6.998-3.014 3.332-1.386 4.025-1.627 4.476-1.635z" />
                                </svg> Telegram
                            </a>
                        </p>
                        <p className='text-sm font-cabinet-grotesk lowercase text-gray-500 mt-4'>
                            <a href="https://vk.com/pinkpunk_official_blr_brand" target="_blank" rel="noopener noreferrer" className="flex items-center gap-2">
                                <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 24 24">
                                    <path d="M15.684 0H8.316C1.592 0 0 1.592 0 8.316v7.368C0 22.408 1.592 24 8.316 24h7.368C22.408 24 24 22.408 24 15.684V8.316C24 1.592 22.408 0 15.684 0zm3.692 17.123h-1.744c-.66 0-.864-.525-2.05-1.727-1.033-1.01-1.49-.864-1.744-.864-.356 0-.458.102-.458.593v1.575c0 .424-.135.678-1.253.678-1.846 0-3.896-1.118-5.335-3.202C4.624 10.857 4.03 8.57 4.03 8.096c0-.254.102-.491.593-.491h1.744c.44 0 .61.203.78.677.863 2.49 2.303 4.675 3.285 4.675.22 0 .322-.102.322-.66V9.721c-.068-1.186-.695-1.287-.695-1.71 0-.203.17-.407.44-.407h2.744c.373 0 .508.203.508.643v3.473c0 .372.17.508.271.508.22 0 .407-.136.813-.542 1.254-1.406 2.151-3.574 2.151-3.574.119-.254.322-.491.763-.491h1.744c.525 0 .644.271.525.643-.22 1.017-2.354 4.031-2.354 4.031-.186.305-.254.44 0 .78.186.254.795.780 1.203 1.253.745.847 1.32 1.558 1.473 2.05.17.49-.085.744-.576.744z" />
                                </svg> VK
                            </a>
                        </p>
                        <p className='text-sm font-cabinet-grotesk lowercase text-gray-500 mt-4'>
                            <a href="https://youtube.com/@pinkpunktalk" target="_blank" rel="noopener noreferrer" className="flex items-center gap-2">
                                <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 24 24">
                                    <path d="M23.498 6.186a3.016 3.016 0 0 0-2.122-2.136C19.505 3.545 12 3.545 12 3.545s-7.505 0-9.377.505A3.017 3.017 0 0 0 .502 6.186C0 8.07 0 12 0 12s0 3.93.502 5.814a3.016 3.016 0 0 0 2.122 2.136c1.871.505 9.376.505 9.376.505s7.505 0 9.377-.505a3.015 3.015 0 0 0 2.122-2.136C24 15.93 24 12 24 12s0-3.93-.502-5.814zM9.545 15.568V8.432L15.818 12l-6.273 3.568z" />
                                </svg> YouTube
                            </a>
                        </p>
                    </div>}
                </div>

            </div>

            {/* Модалка только для маленьких мобильных */}
            <Modal
                isOpen={isModalOpen && isMobile}
                onClose={closeModal}
                title={modalContent?.title || ''}
            >
                {modalContent?.title === 'магазин' &&
                    <div>
                        <p className=' text-gray-500 mt-4'>
                            <a href="#catalog">
                                каталог
                            </a>
                        </p>
                        <div className=' text-gray-500 mt-4'>
                            <div onClick={() => {
                                router.push('/pinkpunkabout')
                                setIsModalOpen(false)
                            }}>
                                о пинк панк
                            </div>
                        </div>
                        <div className=' text-gray-500 mt-4'>
                            <div className=' text-gray-500 mt-4'>
                                <div onClick={() => {
                                    router.push('/company_registration_details')
                                    setIsModalOpen(false)
                                }}>
                                    реквизиты
                                </div>
                            </div>
                        </div>
                    </div>
                }
                {modalContent?.title === 'Покупателям' && <div>
                    <div className=' text-gray-500 mt-4'>
                        <div onClick={() => {
                            router.push('/delivery')
                            setIsModalOpen(false)
                        }}>
                            доставка
                        </div>

                    </div>
                    <div className=' text-gray-500 mt-4'>
                        <div onClick={() => {
                            router.push('/exchange_and_return')
                            setIsModalOpen(false)
                        }}>
                            обмен и возврат
                        </div>
                    </div>
                    <div className=' text-gray-500 mt-4'>
                        <div onClick={() => {
                            router.push('/composition_and_care')
                            setIsModalOpen(false)
                        }}>
                            состав и уход
                        </div>
                    </div>
                    <div className=' text-gray-500 mt-4'>

                        <div onClick={() => {
                            router.push('/gift_certificate')
                            setIsModalOpen(false)
                        }}>
                            подарочные сертификаты
                        </div>
                    </div>
                </div>}
                {modalContent?.title === 'Контакты' && <div>
                    <p className=' text-gray-500 mt-4'>
                        <a href="https://t.me/pozdnee_utro" target="_blank" rel="noopener noreferrer" className="flex items-center gap-2 ">
                            <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 24 24">
                                <path d="M11.944 0A12 12 0 0 0 0 12a12 12 0 0 0 12 12 12 12 0 0 0 12-12A12 12 0 0 0 12 0a12 12 0 0 0-.056 0zm4.962 7.224c.1-.002.321.023.465.14a.506.506 0 0 1 .171.325c.016.093.036.306.02.472-.18 1.898-.962 6.502-1.36 8.627-.168.9-.499 1.201-.82 1.23-.696.065-1.225-.46-1.9-.902-1.056-.693-1.653-1.124-2.678-1.8-1.185-.78-.417-1.21.258-1.91.177-.184 3.247-2.977 3.307-3.23.007-.032.014-.15-.056-.212s-.174-.041-.249-.024c-.106.024-1.793 1.14-5.061 3.345-.48.33-.913.49-1.302.48-.428-.008-1.252-.241-1.865-.44-.752-.245-1.349-.374-1.297-.789.027-.216.325-.437.893-.663 3.498-1.524 5.83-2.529 6.998-3.014 3.332-1.386 4.025-1.627 4.476-1.635z" />
                            </svg> Telegram
                        </a>
                    </p>
                    <p className=' text-gray-500 mt-4'>
                        <a href="mailto:pinkpunk.company@gmail.com" className="flex items-center gap-2 ">
                            <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 24 24">
                                <path d="M20 4H4c-1.1 0-1.99.9-1.99 2L2 18c0 1.1.9 2 2 2h16c1.1 0 2-.9 2-2V6c0-1.1-.9-2-2-2zm0 4l-8 5-8-5V6l8 5 8-5v2z" />
                            </svg> Email
                        </a>
                    </p>
                    <p className=' text-gray-500 mt-4'>
                        <a href="https://wa.me/375333572566" target="_blank" rel="noopener noreferrer" className="flex items-center gap-2 ">
                            <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 24 24">
                                <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893A11.821 11.821 0 0020.885 3.488" />
                            </svg> WhatsApp
                        </a>
                    </p>
                    <p className=' text-gray-500 mt-4'>
                        <a href="tel:+375333572566" className="flex items-center gap-2 ">
                            <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 24 24">
                                <path d="M6.62 10.79c1.44 2.83 3.76 5.14 6.59 6.59l2.2-2.2c.27-.27.67-.36 1.02-.24 1.12.37 2.33.57 3.57.57.55 0 1 .45 1 1V20c0 .55-.45 1-1 1-9.39 0-17-7.61-17-17 0-.55.45-1 1-1h3.5c.55 0 1 .45 1 1 0 1.25.2 2.45.57 3.57.11.35.03.74-.25 1.02l-2.2 2.2z" />
                            </svg> +375(33)357-25-66
                        </a>
                    </p>
                </div>}
                {modalContent?.title === 'Мы в соц.сетях' && <div>
                    <p className='text-gray-500 mt-4'>
                        <a href="https://www.instagram.com/pinkpunk_brand" target="_blank" rel="noopener noreferrer" className="flex items-center gap-2">
                            <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 24 24">
                                <path d="M12 2.163c3.204 0 3.584.012 4.85.07 3.252.148 4.771 1.691 4.919 4.919.058 1.265.069 1.645.069 4.849 0 3.205-.012 3.584-.069 4.849-.149 3.225-1.664 4.771-4.919 4.919-1.266.058-1.644.07-4.85.07-3.204 0-3.584-.012-4.849-.07-3.26-.149-4.771-1.699-4.919-4.92-.058-1.265-.07-1.644-.07-4.849 0-3.204.013-3.583.07-4.849.149-3.227 1.664-4.771 4.919-4.919 1.266-.057 1.645-.069 4.849-.069zm0-2.163c-3.259 0-3.667.014-4.947.072-4.358.2-6.78 2.618-6.98 6.98-.059 1.281-.073 1.689-.073 4.948 0 3.259.014 3.668.072 4.948.2 4.358 2.618 6.78 6.98 6.98 1.281.058 1.689.072 4.948.072 3.259 0 3.668-.014 4.948-.072 4.354-.2 6.782-2.618 6.979-6.98.059-1.28.073-1.689.073-4.948 0-3.259-.014-3.667-.072-4.947-.196-4.354-2.617-6.78-6.979-6.98-1.281-.059-1.69-.073-4.949-.073zm0 5.838c-3.403 0-6.162 2.759-6.162 6.162s2.759 6.163 6.162 6.163 6.162-2.759 6.162-6.163c0-3.403-2.759-6.162-6.162-6.162zm0 10.162c-2.209 0-4-1.79-4-4 0-2.209 1.791-4 4-4s4 1.791 4 4c0 2.21-1.791 4-4 4zm6.406-11.845c-.796 0-1.441.645-1.441 1.44s.645 1.44 1.441 1.44c.795 0 1.439-.645 1.439-1.44s-.644-1.44-1.439-1.44z" />
                            </svg> Instagram
                        </a>
                    </p>
                    <p className='text-gray-500 mt-4'>
                        <a href="https://t.me/pinkpunk_brand" target="_blank" rel="noopener noreferrer" className="flex items-center gap-2">
                            <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 24 24">
                                <path d="M11.944 0A12 12 0 0 0 0 12a12 12 0 0 0 12 12 12 12 0 0 0 12-12A12 12 0 0 0 12 0a12 12 0 0 0-.056 0zm4.962 7.224c.1-.002.321.023.465.14a.506.506 0 0 1 .171.325c.016.093.036.306.02.472-.18 1.898-.962 6.502-1.36 8.627-.168.9-.499 1.201-.82 1.23-.696.065-1.225-.46-1.9-.902-1.056-.693-1.653-1.124-2.678-1.8-1.185-.78-.417-1.21.258-1.91.177-.184 3.247-2.977 3.307-3.23.007-.032.014-.15-.056-.212s-.174-.041-.249-.024c-.106.024-1.793 1.14-5.061 3.345-.48.33-.913.49-1.302.48-.428-.008-1.252-.241-1.865-.44-.752-.245-1.349-.374-1.297-.789.027-.216.325-.437.893-.663 3.498-1.524 5.83-2.529 6.998-3.014 3.332-1.386 4.025-1.627 4.476-1.635z" />
                            </svg> Telegram
                        </a>
                    </p>
                    <p className='text-gray-500 mt-4'>
                        <a href="https://vk.com/pinkpunk_official_blr_brand" target="_blank" rel="noopener noreferrer" className="flex items-center gap-2">
                            <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 24 24">
                                <path d="M15.684 0H8.316C1.592 0 0 1.592 0 8.316v7.368C0 22.408 1.592 24 8.316 24h7.368C22.408 24 24 22.408 24 15.684V8.316C24 1.592 22.408 0 15.684 0zm3.692 17.123h-1.744c-.66 0-.864-.525-2.05-1.727-1.033-1.01-1.49-.864-1.744-.864-.356 0-.458.102-.458.593v1.575c0 .424-.135.678-1.253.678-1.846 0-3.896-1.118-5.335-3.202C4.624 10.857 4.03 8.57 4.03 8.096c0-.254.102-.491.593-.491h1.744c.44 0 .61.203.78.677.863 2.49 2.303 4.675 3.285 4.675.22 0 .322-.102.322-.66V9.721c-.068-1.186-.695-1.287-.695-1.71 0-.203.17-.407.44-.407h2.744c.373 0 .508.203.508.643v3.473c0 .372.17.508.271.508.22 0 .407-.136.813-.542 1.254-1.406 2.151-3.574 2.151-3.574.119-.254.322-.491.763-.491h1.744c.525 0 .644.271.525.643-.22 1.017-2.354 4.031-2.354 4.031-.186.305-.254.44 0 .78.186.254.795.780 1.203 1.253.745.847 1.32 1.558 1.473 2.05.17.49-.085.744-.576.744z" />
                            </svg> VK
                        </a>
                    </p>
                    <p className='text-gray-500 mt-4'>
                        <a href="https://youtube.com/@pinkpunktalk" target="_blank" rel="noopener noreferrer" className="flex items-center gap-2">
                            <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 24 24">
                                <path d="M23.498 6.186a3.016 3.016 0 0 0-2.122-2.136C19.505 3.545 12 3.545 12 3.545s-7.505 0-9.377.505A3.017 3.017 0 0 0 .502 6.186C0 8.07 0 12 0 12s0 3.93.502 5.814a3.016 3.016 0 0 0 2.122 2.136c1.871.505 9.376.505 9.376.505s7.505 0 9.377-.505a3.015 3.015 0 0 0 2.122-2.136C24 15.93 24 12 24 12s0-3.93-.502-5.814zM9.545 15.568V8.432L15.818 12l-6.273 3.568z" />
                            </svg> YouTube
                        </a>
                    </p>
                </div>}
                {modalContent?.title === '' && <p> Упс, что-то пошло не так</p>}


            </Modal>
        </>
    )
})

export default InfoBlocks
