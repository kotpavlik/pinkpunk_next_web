'use client'

import { useState, useEffect, useRef } from 'react'
import { ShoppingBagIcon } from '@heroicons/react/24/outline'
import Link from 'next/link'
import AnimatedBurger from './AnimatedBurger'


export default function Header() {
    const [isMenuOpen, setIsMenuOpen] = useState(false)
    const [logoWidth, setLogoWidth] = useState(0)
    const [isHeaderVisible, setIsHeaderVisible] = useState(true)
    const [lastScrollY, setLastScrollY] = useState(0)
    const logoRef = useRef<HTMLDivElement>(null)

    const toggleMenu = () => {
        setIsMenuOpen(!isMenuOpen)
    }

    // Измерение ширины логотипа
    useEffect(() => {
        const updateLogoWidth = () => {
            if (logoRef.current) {
                const width = logoRef.current.offsetWidth
                setLogoWidth(width)
            }
        }

        updateLogoWidth()
        window.addEventListener('resize', updateLogoWidth)

        return () => {
            window.removeEventListener('resize', updateLogoWidth)
        }
    }, [])

    // Закрытие меню при клике вне его области
    useEffect(() => {
        const handleClickOutside = (event: MouseEvent) => {
            if (isMenuOpen) {
                const target = event.target as Element
                if (!target.closest('header')) {
                    setIsMenuOpen(false)
                }
            }
        }

        if (isMenuOpen) {
            document.addEventListener('click', handleClickOutside)
        }

        return () => {
            document.removeEventListener('click', handleClickOutside)
        }
    }, [isMenuOpen])

    // Закрытие меню при изменении размера экрана на desktop
    useEffect(() => {
        const handleResize = () => {
            if (window.innerWidth >= 768) {
                setIsMenuOpen(false)
            }
        }

        window.addEventListener('resize', handleResize)
        return () => window.removeEventListener('resize', handleResize)
    }, [])

    // Закрытие меню при нажатии Escape
    useEffect(() => {
        const handleEscape = (event: KeyboardEvent) => {
            if (event.key === 'Escape' && isMenuOpen) {
                setIsMenuOpen(false)
            }
        }

        if (isMenuOpen) {
            document.addEventListener('keydown', handleEscape)
        }

        return () => {
            document.removeEventListener('keydown', handleEscape)
        }
    }, [isMenuOpen])

    // Обработка скролла для скрытия/показа хедера
    useEffect(() => {
        const handleScroll = () => {
            const currentScrollY = window.scrollY

            if (currentScrollY > lastScrollY && currentScrollY > 100) {
                // Скролл вниз - скрываем хедер
                setIsHeaderVisible(false)
            } else {
                // Скролл вверх - показываем хедер
                setIsHeaderVisible(true)
            }

            setLastScrollY(currentScrollY)
        }

        window.addEventListener('scroll', handleScroll, { passive: true })

        return () => {
            window.removeEventListener('scroll', handleScroll)
        }
    }, [lastScrollY])


    return (
        <header
            className={`fixed left-0 right-0 z-50 w-full flex justify-center px-4 transition-transform duration-1000 ease-in-out ${isHeaderVisible ? 'translate-y-0' : 'translate-y-[calc(-100%+64px)]'
                }`}
            style={{
                // iOS Safari fixes for smooth animations
                transform: isHeaderVisible ? 'translate3d(0, 0, 0)' : 'translate3d(0, calc(-100% + 64px), 0)', // Оставляем 64px видимой части
                WebkitTransform: isHeaderVisible ? 'translate3d(0, 0, 0)' : 'translate3d(0, calc(-100% + 64px), 0)',
                backfaceVisibility: 'hidden',
                WebkitBackfaceVisibility: 'hidden',
                willChange: 'transform',
                // Prevent layout shift
                contain: 'layout style paint',
                // Safe area inset for iOS PWA (notch area) - увеличиваем чтобы полностью перекрыть челку
                paddingTop: 'calc(80px + env(safe-area-inset-top) + 60px)', // Добавляем еще 60px для полного перекрытия челки
                top: `calc(-104px - env(safe-area-inset-top) - 60px)`, // Сдвигаем header еще выше
            }}
        >
            <div className="w-full max-w-4xl relative pt-5">
                {/* Glass Background */}
                <div
                    className="absolute rounded-b-4xl overflow-hidden"
                    style={{
                        background: 'rgba(255, 255, 255, 0.1)',
                        backdropFilter: 'blur(20px) saturate(180%)',
                        WebkitBackdropFilter: 'blur(20px) saturate(180%)',
                        borderBottom: '1px solid var(--mint-dark)',
                        // Extend background to fully cover safe area and notch
                        top: `calc(-1 * env(safe-area-inset-top) - 60px)`,
                        left: 0,
                        right: 0,
                        bottom: 0,
                        paddingTop: 'calc(env(safe-area-inset-top) + 60px)', // Расширяем еще выше
                    }}
                />

                {/* Content */}
                <div className="relative z-10 px-6 sm:px-8">
                    <div className="flex justify-between items-center h-16">
                        {/* Анимированный бургер слева */}
                        <div className="inline-flex items-center justify-center rounded-full text-white/50 hover:text-white hover:bg-white/10 backdrop-blur-sm transition-all duration-200 transform hover:scale-105">
                            <AnimatedBurger isOpen={isMenuOpen} onClick={toggleMenu} />
                        </div>

                        {/* Logo - Centered */}
                        <div ref={logoRef} className="absolute left-1/2 transform -translate-x-1/2">
                            <h1 className="md:text-4xl text-2xl cursor-default uppercase font-extrabold font-durik text-[#ff2b9c] drop-shadow-lg relative">
                                <Link href="/">Пинк Панк</Link>

                                {/* Анимированное подчеркивание при рендере */}
                                <div className="absolute bottom-0 left-0 w-full h-1 bg-[#ff2b9c] animate-[slideIn_1s_ease-out] origin-left" style={{ animation: 'slideIn 1s ease-out forwards' }}></div>
                            </h1>
                        </div>

                        {/* Корзина справа */}
                        <div>
                            <button className="inline-flex items-center justify-center p-2 rounded-full text-white/50 hover:text-white hover:bg-white/10 backdrop-blur-sm transition-all duration-200 transform hover:scale-105">
                                <ShoppingBagIcon className="h-6 w-6" aria-hidden="true" />
                            </button>
                        </div>
                    </div>

                    {/* Navigation Menu */}
                    <div
                        className="overflow-hidden transition-all flex flex-col items-center justify-center duration-500 ease-in-out "
                        style={{
                            maxHeight: isMenuOpen ? '500px' : '0',
                            opacity: isMenuOpen ? 1 : 0,
                        }}
                    >
                        <div
                            className=" pt-2 pb-3 space-y-1"
                            style={{ width: logoWidth > 0 ? `${logoWidth}px` : 'auto' }}
                        >

                            <Link
                                href="#catalog"
                                className="text-white/50 hover:text-white hover:bg-white/10 block px-3 py-2 text-base font-medium transition-all duration-200 rounded-lg"
                                onClick={() => setIsMenuOpen(false)}
                            >
                                Каталог
                            </Link>
                            <Link
                                href="/pinkpunkabout"
                                className="text-white/50 hover:text-white hover:bg-white/10 block px-3 py-2 text-base  font-medium transition-all duration-200 rounded-lg"
                                onClick={() => setIsMenuOpen(false)}
                            >
                                О нас
                            </Link>

                            <a
                                href="#contact"
                                className="text-white/50 hover:text-white hover:bg-white/10 block px-3 py-2 text-base font-medium transition-all duration-200 rounded-lg"
                                onClick={() => setIsMenuOpen(false)}
                            >
                                Контакты
                            </a>

                        </div>
                    </div>
                </div>
            </div>

        </header>
    )
}
