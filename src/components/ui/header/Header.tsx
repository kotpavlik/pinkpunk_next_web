'use client'

import { useState, useEffect, useRef } from 'react'
import { ShoppingBagIcon, UserIcon } from '@heroicons/react/24/outline'
import Link from 'next/link'
import Image from 'next/image'
import { useRouter } from 'next/navigation'
import AnimatedBurger from './AnimatedBurger'
import TelegramLoginModal from '../shared/TelegramLoginModal'
import CartModal from '../shared/CartModal'
import { useUserStore } from '@/zustand/user_store/UserStore'
import { useCartStore } from '@/zustand/cart_store/CartStore'
import AvatarLoader from '@/components/ui/shared/AvatarLoader'


export default function Header() {
    const [isMenuOpen, setIsMenuOpen] = useState(false)
    const [isLoginModalOpen, setIsLoginModalOpen] = useState(false)
    const [isCartModalOpen, setIsCartModalOpen] = useState(false)
    const [logoWidth, setLogoWidth] = useState(0)
    const [isHeaderVisible, setIsHeaderVisible] = useState(true)
    const [lastScrollY, setLastScrollY] = useState(0)
    const [imageError, setImageError] = useState(false)
    const [isMounted, setIsMounted] = useState(false)
    const logoRef = useRef<HTMLDivElement>(null)
    const { user } = useUserStore()
    const { items, stats } = useCartStore()
    const router = useRouter()

    // Вычисляем общее количество товаров в корзине
    const totalItems = stats?.totalItems || items.reduce((sum, item) => sum + item.quantity, 0)

    // Отслеживаем монтирование компонента для предотвращения hydration mismatch
    useEffect(() => {
        setIsMounted(true)
    }, [])

    // Загружаем корзину при авторизации пользователя
    const { getCart } = useCartStore()
    useEffect(() => {
        if (user._id && isMounted) {
            getCart(user._id)
        }
    }, [user._id, isMounted, getCart])

    // Сбрасываем ошибку изображения при изменении photoUrl или photo_url
    useEffect(() => {
        setImageError(false)
    }, [user.photoUrl, user.photo_url])

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
            if (!isMenuOpen) return

            const target = event.target as Element

            // Пропускаем клики по ссылкам - они сами управляют закрытием меню
            if (target.closest('a[href]')) {
                return
            }

            // Если клик вне header, закрываем меню
            if (!target.closest('header')) {
                setIsMenuOpen(false)
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

                        {/* Иконки пользователя и корзины справа */}
                        <div className="flex items-center justify-center md:gap-2">
                            <button
                                onClick={() => {
                                    if (user.userId) {
                                        router.push('/user_profile')
                                    } else {
                                        setIsLoginModalOpen(true)
                                    }
                                }}
                                className="inline-flex items-center justify-center p-2 rounded-full text-white/50 hover:text-white hover:bg-white/10 backdrop-blur-sm transition-all duration-200 transform hover:scale-105"
                                aria-label={isMounted && user.userId ? 'Профиль пользователя' : 'Войти через Telegram'}
                            >
                                {isMounted && user.userId ? (
                                    (user.photoUrl || user.photo_url) && !imageError ? (
                                        <div className="relative h-6 w-6 rounded-full overflow-hidden">
                                            <Image
                                                src={user.photoUrl || user.photo_url || ''}
                                                alt={user.firstName || user.username || 'User avatar'}
                                                fill
                                                className="object-cover"
                                                unoptimized
                                                onError={() => {
                                                    setImageError(true)
                                                }}
                                            />
                                        </div>
                                    ) : (
                                        <div className="h-6 w-6 rounded-full overflow-hidden">
                                            <AvatarLoader className="w-full h-full" />
                                        </div>
                                    )
                                ) : (
                                    <UserIcon className="h-6 w-6" aria-hidden="true" />
                                )}
                            </button>
                            <button
                                onClick={() => setIsCartModalOpen(true)}
                                className="relative inline-flex items-center justify-center p-2 rounded-full text-white/50 hover:text-white hover:bg-white/10 backdrop-blur-sm transition-all duration-200 transform hover:scale-105"
                                aria-label="Открыть корзину"
                            >
                                <ShoppingBagIcon className="h-6 w-6" aria-hidden="true" />
                                {totalItems > 0 && (
                                    <span className="absolute -top-1 -right-1 flex items-center justify-center min-w-[20px] h-5 md:px-1.5 px-1 text-xs font-bold text-white bg-[var(--pink-punk)] rounded-full ">
                                        {totalItems > 99 ? '99+' : totalItems}
                                    </span>
                                )}
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
                                href="/catalog"
                                className="text-white/50 hover:text-white hover:bg-white/10 block px-3 py-2 text-base font-medium transition-all duration-200 rounded-lg"
                                onClick={(e) => {
                                    e.stopPropagation()
                                    setIsMenuOpen(false)
                                }}
                            >
                                Каталог
                            </Link>
                            <Link
                                href="/gift_certificate"
                                className="text-white/50 hover:text-white hover:bg-white/10 block px-3 py-2 text-base  font-medium transition-all duration-200 rounded-lg"
                                onClick={(e) => {
                                    e.stopPropagation()
                                    setIsMenuOpen(false)
                                }}
                            >
                                Подарочные сертификаты
                            </Link>
                            <Link
                                href="/pinkpunkabout"
                                className="text-white/50 hover:text-white hover:bg-white/10 block px-3 py-2 text-base  font-medium transition-all duration-200 rounded-lg"
                                onClick={(e) => {
                                    e.stopPropagation()
                                    setIsMenuOpen(false)
                                }}
                            >
                                Что такое Пинк Панк?
                            </Link>


                            <div className="w-full flex justify-center gap-4 px-3 pt-4">
                                <a href="https://www.instagram.com/pinkpunk_brand" target="_blank" rel="noopener noreferrer" className="text-white/60 hover:text-white transition-colors">
                                    <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 24 24" aria-hidden="true">
                                        <path d="M12 2.163c3.204 0 3.584.012 4.85.07 3.252.148 4.771 1.691 4.919 4.919.058 1.265.069 1.645.069 4.849 0 3.205-.012 3.584-.069 4.849-.149 3.225-1.664 4.771-4.919 4.919-1.266.058-1.644.07-4.85.07-3.204 0-3.584-.012-4.849-.07-3.26-.149-4.771-1.699-4.919-4.92-.058-1.265-.07-1.644-.07-4.849 0-3.204.013-3.583.07-4.849.149-3.227 1.664-4.771 4.919-4.919 1.266-.057 1.645-.069 4.849-.069zm0-2.163c-3.259 0-3.667.014-4.947.072-4.358.2-6.78 2.618-6.98 6.98-.059 1.281-.073 1.689-.073 4.948 0 3.259.014 3.668.072 4.948.2 4.358 2.618 6.78 6.98 6.98 1.281.058 1.689.072 4.948.072 3.259 0 3.668-.014 4.948-.072 4.354-.2 6.782-2.618 6.979-6.98.059-1.28.073-1.689.073-4.948 0-3.259-.014-3.667-.072-4.947-.196-4.354-2.617-6.78-6.979-6.98-1.281-.059-1.69-.073-4.949-.073zm0 5.838c-3.403 0-6.162 2.759-6.162 6.162s2.759 6.163 6.162 6.163 6.162-2.759 6.162-6.163c0-3.403-2.759-6.162-6.162-6.162zm0 10.162c-2.209 0-4-1.79-4-4 0-2.209 1.791-4 4-4s4 1.791 4 4c0 2.21-1.791 4-4 4zm6.406-11.845c-.796 0-1.441.645-1.441 1.44s.645 1.44 1.441 1.44c.795 0 1.439-.645 1.439-1.44s-.644-1.44-1.439-1.44z" />
                                    </svg>
                                </a>
                                <a href="https://t.me/pinkpunk_brand" target="_blank" rel="noopener noreferrer" className="text-white/60 hover:text-white transition-colors">
                                    <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 24 24" aria-hidden="true">
                                        <path d="M11.944 0A12 12 0 0 0 0 12a12 12 0 0 0 12 12 12 12 0 0 0 12-12A12 12 0 0 0 12 0a12 12 0 0 0-.056 0zm4.962 7.224c.1-.002.321.023.465.14a.506.506 0 0 1 .171.325c.016.093.036.306.02.472-.18 1.898-.962 6.502-1.36 8.627-.168.9-.499 1.201-.82 1.23-.696.065-1.225-.46-1.9-.902-1.056-.693-1.653-1.124-2.678-1.8-1.185-.78-.417-1.21.258-1.91.177-.184 3.247-2.977 3.307-3.23.007-.032.014-.15-.056-.212s-.174-.041-.249-.024c-.106.024-1.793 1.14-5.061 3.345-.48.33-.913.49-1.302.48-.428-.008-1.252-.241-1.865-.44-.752-.245-1.349-.374-1.297-.789.027-.216.325-.437.893-.663 3.498-1.524 5.83-2.529 6.998-3.014 3.332-1.386 4.025-1.627 4.476-1.635z" />
                                    </svg>
                                </a>
                                <a href="https://vk.com/pinkpunk_official_blr_brand" target="_blank" rel="noopener noreferrer" className="text-white/60 hover:text-white transition-colors">
                                    <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 24 24" aria-hidden="true">
                                        <path d="M15.684 0H8.316C1.592 0 0 1.592 0 8.316v7.368C0 22.408 1.592 24 8.316 24h7.368C22.408 24 24 22.408 24 15.684V8.316C24 1.592 22.408 0 15.684 0zm3.692 17.123h-1.744c-.66 0-.864-.525-2.05-1.727-1.033-1.01-1.49-.864-1.744-.864-.356 0-.458.102-.458.593v1.575c0 .424-.135.678-1.253.678-1.846 0-3.896-1.118-5.335-3.202C4.624 10.857 4.03 8.57 4.03 8.096c0-.254.102-.491.593-.491h1.744c.44 0 .61.203.78.677.863 2.49 2.303 4.675 3.285 4.675.22 0 .322-.102.322-.66V9.721c-.068-1.186-.695-1.287-.695-1.71 0-.203.17-.407.44-.407h2.744c.373 0 .508.203.508.643v3.473c0 .372.17.508.271.508.22 0 .407-.136.813-.542 1.254-1.406 2.151-3.574 2.151-3.574.119-.254.322-.491.763-.491h1.744c.525 0 .644.271.525.643-.22 1.017-2.354 4.031-2.354 4.031-.186.305-.254.44 0 .78.186.254.795.780 1.203 1.253.745.847 1.32 1.558 1.473 2.05.17.49-.085.744-.576.744z" />
                                    </svg>
                                </a>
                                <a href="https://youtube.com/@pinkpunktalk" target="_blank" rel="noopener noreferrer" className="text-white/60 hover:text-white transition-colors">
                                    <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 24 24" aria-hidden="true">
                                        <path d="M23.498 6.186a3.016 3.016 0 0 0-2.122-2.136C19.505 3.545 12 3.545 12 3.545s-7.505 0-9.377.505A3.017 3.017 0 0 0 .502 6.186C0 8.07 0 12 0 12s0 3.93.502 5.814a3.016 3.016 0 0 0 2.122 2.136c1.871.505 9.376.505 9.376.505s7.505 0 9.377-.505a3.015 3.015 0 0 0 2.122-2.136C24 15.93 24 12 24 12s0-3.93-.502-5.814zM9.545 15.568V8.432L15.818 12l-6.273 3.568z" />
                                    </svg>
                                </a>
                                <a href="tel:+375333572566" className="text-white/60 hover:text-white transition-colors" aria-label="Позвонить +375(33)357-25-66">
                                    <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 24 24" aria-hidden="true">
                                        <path d="M6.62 10.79c1.44 2.83 3.76 5.14 6.59 6.59l2.2-2.2c.27-.27.67-.36 1.02-.24 1.12.37 2.33.57 3.57.57.55 0 1 .45 1 1V20c0 .55-.45 1-1 1-9.39 0-17-7.61-17-17 0-.55.45-1 1-1h3.5c.55 0 1 .45 1 1 0 1.25.2 2.45.57 3.57.11.35.03.74-.25 1.02l-2.2 2.2z" />
                                    </svg>
                                </a>
                            </div>
                        </div>
                    </div>
                </div>
            </div>

            {/* Telegram Login Modal */}
            <TelegramLoginModal
                isOpen={isLoginModalOpen}
                onClose={() => setIsLoginModalOpen(false)}
            />

            {/* Cart Modal */}
            <CartModal
                isOpen={isCartModalOpen}
                onClose={() => setIsCartModalOpen(false)}
            />

        </header>
    )
}
