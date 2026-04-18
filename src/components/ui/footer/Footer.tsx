'use client'

import BlurredText from './BlurredText'
import MapSection from './MapSection'
import { useScrollBlur } from '@/hooks/useScrollBlur'
import React, { useState, useRef } from 'react'
import AdminLoginModal from '@/components/ui/admin/AdminLoginModal'
import Link from 'next/link'

const Footer = React.memo(function Footer() {
    const { blurStyles } = useScrollBlur()
    const [isAdminModalOpen, setIsAdminModalOpen] = useState(false)
    const clickCountRef = useRef(0)
    const clickTimeoutRef = useRef<NodeJS.Timeout | null>(null)

    const handleSpanClick = () => {
        // Сбрасываем предыдущий таймаут
        if (clickTimeoutRef.current) {
            clearTimeout(clickTimeoutRef.current)
        }

        // Увеличиваем счетчик
        clickCountRef.current += 1

        // Если достигли 5 кликов, открываем модалку
        if (clickCountRef.current >= 5) {
            setIsAdminModalOpen(true)
            clickCountRef.current = 0
        } else {
            // Сбрасываем счетчик через 2 секунды
            clickTimeoutRef.current = setTimeout(() => {
                clickCountRef.current = 0
            }, 2000)
        }
    }

    return (
        <footer className="relative w-full overflow-x-hidden">
            <div className="flex w-full min-h-0 flex-col">

                <section className="flex w-full min-h-[28vh] items-center justify-center py-6 md:min-h-[30vh] md:py-8">
                    <BlurredText blurStyles={blurStyles} />
                </section>


                <MapSection />

                <div
                    className="mx-4 my-6 shrink-0 border-t border-gray-500/35 md:mx-8 md:my-8"
                    aria-hidden
                />

                <div className="mx-4 mb-6 flex flex-col justify-center text-start text-sm text-gray-500 md:mx-8 md:mb-8 md:flex-row md:items-center md:justify-around">
                    <Link
                        href="/privacy-policy"
                        className="hover:text-[var(--mint-bright)] transition-colors cursor-pointer"
                    >
                        политика конфиденциальности
                    </Link>
                    <div className=" ">
                        разработка и дизайн: <span
                            className='cursor-default select-none'
                            onClick={handleSpanClick}
                        >
                            pink punk dev
                        </span>
                    </div>
                    <div> © 2025 ПинкПунк. Все права защищены.</div>
                </div>
            </div>

            {/* Модалка админской авторизации */}
            {isAdminModalOpen && (
                <AdminLoginModal
                    isOpen={isAdminModalOpen}
                    onClose={() => {
                        setIsAdminModalOpen(false)
                        clickCountRef.current = 0
                    }}
                />
            )}
        </footer>
    )
})

export default Footer