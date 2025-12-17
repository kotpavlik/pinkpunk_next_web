'use client'

import BlurredText from './BlurredText'
import MapSection from './MapSection'
import MarqueeText from './MarqueeText'
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
        <footer className="w-full h-screen relative overflow-hidden">
            <div className="w-full h-full flex flex-col">

                <section className="w-full h-1/3 flex items-center justify-center">
                    <BlurredText blurStyles={blurStyles} />
                </section>

                <MarqueeText />

                <MapSection />
                <div className="flex md:flex-row flex-col md:items-center mx-4 my-2 mb-4 md:justify-around justify-center text-start text-sm text-gray-500 ">
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
                    <div> © 2025 All rights reserved.</div>
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