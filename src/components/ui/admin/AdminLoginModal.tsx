'use client'

import { useEffect, useState } from 'react'
import { createPortal } from 'react-dom'
import { DotLottieReact } from '@lottiefiles/dotlottie-react'
import TelegramAnimation from '@/../public/animations/telegram.json'
import LoginForm from '@/components/ui/admin/LoginForm'
import TelegramLoginModal from '@/components/ui/shared/TelegramLoginModal'
import { useUserStore } from '@/zustand/user_store/UserStore'
import { useAdminLoginStore } from '@/zustand/admin_login_store/AdminLoginStore'
import { useRouter } from 'next/navigation'

interface AdminLoginModalProps {
    isOpen: boolean
    onClose: () => void
}

export default function AdminLoginModal({
    isOpen,
    onClose,
}: AdminLoginModalProps) {
    const [mounted, setMounted] = useState(false)
    const [isLoggingOut, setIsLoggingOut] = useState(false)
    const [isTelegramLoginOpen, setIsTelegramLoginOpen] = useState(false)
    const userData = useUserStore((state) => state.user)
    const isAuthenticated = useUserStore((state) => state.isAuthenticated)
    const { validateToken, isCheckingToken, logoutAdmin } = useAdminLoginStore()
    const isAdmin = useUserStore((state) => state.isAdmin())
    const router = useRouter()

    const isUserLoggedIn = isAuthenticated() && (userData._id || userData.userId)

    useEffect(() => {
        setMounted(true)
    }, [])

    useEffect(() => {
        // Блокируем скролл body когда модальное окно открыто
        if (isOpen) {
            document.body.style.overflow = 'hidden'
        } else {
            document.body.style.overflow = ''
        }

        return () => {
            document.body.style.overflow = ''
        }
    }, [isOpen])

    // Закрытие по Escape
    useEffect(() => {
        const handleEscape = (e: KeyboardEvent) => {
            if (e.key === 'Escape' && isOpen) {
                onClose()
            }
        }

        if (isOpen) {
            document.addEventListener('keydown', handleEscape)
        }

        return () => {
            document.removeEventListener('keydown', handleEscape)
        }
    }, [isOpen, onClose])

    useEffect(() => {
        const checkToken = async () => {
            if (userData.token) {
                const isValid = await validateToken()
                if (isValid && isAdmin) {
                    // Если админ авторизован, перенаправляем на страницу админки
                    onClose()
                    router.push('/admin')
                }
            }
        }
        checkToken()
    }, [userData.token, validateToken, isAdmin, onClose, router])

    // Закрываем TelegramLoginModal после успешного входа
    useEffect(() => {
        if (isUserLoggedIn && isTelegramLoginOpen) {
            setIsTelegramLoginOpen(false)
        }
    }, [isUserLoggedIn, isTelegramLoginOpen])

    if (!isOpen) return null

    // Ждем монтирования только для портала
    if (!mounted) {
        return null
    }

    const modalContent = (
        <div
            className="fixed inset-0 flex items-center justify-center bg-black/60 backdrop-blur-md transition-opacity duration-300"
            style={{
                zIndex: 99999,
                position: 'fixed',
                top: 0,
                left: 0,
                right: 0,
                bottom: 0,
                width: '100vw',
                height: '100vh',
            }}
            onClick={(e) => {
                if (e.target === e.currentTarget) {
                    onClose()
                }
            }}
        >
            <div
                className="relative bg-gradient-to-br from-white/10 via-white/5 to-white/10 backdrop-blur-2xl rounded-3xl p-8 md:p-10 border border-white/20 shadow-2xl max-w-md w-full mx-4 transform transition-all duration-300 scale-100"
                style={{
                    background: 'linear-gradient(135deg, rgba(255, 255, 255, 0.1) 0%, rgba(255, 255, 255, 0.05) 50%, rgba(255, 255, 255, 0.1) 100%)',
                    backdropFilter: 'blur(30px) saturate(180%)',
                    WebkitBackdropFilter: 'blur(30px) saturate(180%)',
                    boxShadow: '0 20px 60px rgba(0, 0, 0, 0.5), 0 0 0 1px rgba(255, 255, 255, 0.1)',
                }}
                onClick={(e) => e.stopPropagation()}
            >
                {/* Кнопка закрытия */}
                <button
                    onClick={onClose}
                    className="absolute top-5 right-5 w-8 h-8 flex items-center justify-center rounded-full bg-white/10 hover:bg-white/20 text-white/70 hover:text-white transition-all duration-200 z-10 group"
                    aria-label="Закрыть"
                >
                    <svg className="w-5 h-5 transform group-hover:rotate-90 transition-transform duration-200" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M6 18L18 6M6 6l12 12" />
                    </svg>
                </button>

                {/* Заголовок */}
                <div className="text-center mb-8">
                    <h2 className="text-3xl md:text-4xl font-blauer-nue font-bold mb-3 bg-gradient-to-r from-white to-white/80 bg-clip-text text-transparent">
                        Админ-панель
                    </h2>
                    <p className="text-white/70 text-base leading-relaxed max-w-sm mx-auto">
                        {!isUserLoggedIn
                            ? 'Сначала войдите как пользователь'
                            : isAdmin
                                ? 'Вы авторизованы как администратор'
                                : 'Введите пароль для доступа к админ-панели'}
                    </p>
                </div>

                {/* Индикатор загрузки */}
                {(isCheckingToken || isLoggingOut) && (
                    <div className="mb-4 flex justify-center">
                        <div className="text-white/70 text-sm">
                            {isCheckingToken ? 'Проверка авторизации...' : 'Выход из системы...'}
                        </div>
                    </div>
                )}

                {/* Сообщение о необходимости войти как пользователь */}
                {!isCheckingToken && !isLoggingOut && !isUserLoggedIn && (
                    <div className="space-y-4">
                        <div className="p-4 bg-yellow-500/20 border border-yellow-500/50 rounded-lg mb-4">
                            <p className="text-yellow-200 text-sm text-center">
                                Для доступа к админ-панели необходимо сначала войти как пользователь через Telegram
                            </p>
                        </div>
                        <button
                            onClick={() => setIsTelegramLoginOpen(true)}
                            className="w-full flex items-center justify-center "
                        >

                            <div className="w-40 h-40 flex items-center justify-center">
                                <DotLottieReact
                                    data={TelegramAnimation}
                                    loop={true}
                                    autoplay={true}
                                    style={{
                                        width: '100%',
                                        height: '100%',
                                    }}
                                />
                            </div>

                        </button>
                    </div>
                )}

                {/* Кнопка выхода для админа */}
                {!isCheckingToken && !isLoggingOut && isAdmin && isUserLoggedIn && (
                    <div className="space-y-4">
                        <button
                            onClick={async () => {
                                setIsLoggingOut(true)
                                try {
                                    await logoutAdmin()
                                    onClose()
                                } catch {
                                    // Silent error handling
                                } finally {
                                    setIsLoggingOut(false)
                                }
                            }}
                            disabled={isLoggingOut}
                            className="w-full px-6 py-3 bg-[var(--pink-punk)] text-white font-bold rounded-lg hover:bg-[var(--pink-dark)] transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed"
                        >
                            {isLoggingOut ? 'Выход...' : 'Выйти'}
                        </button>
                    </div>
                )}

                {/* Форма авторизации */}
                {!isCheckingToken && !isLoggingOut && !isAdmin && isUserLoggedIn && (
                    <LoginForm
                        _id={userData._id || ''}
                        userId={userData.userId !== null ? String(userData.userId) : null}
                        username={userData.username || ''}
                        onSuccess={() => {
                            onClose()
                            router.push('/admin')
                        }}
                    />
                )}
            </div>
        </div>
    )

    // Проверяем, что document.body существует перед созданием портала
    if (typeof document === 'undefined' || !document.body) {
        return null
    }

    return (
        <>
            {createPortal(modalContent, document.body)}
            <TelegramLoginModal
                isOpen={isTelegramLoginOpen}
                onClose={() => setIsTelegramLoginOpen(false)}
            />
        </>
    )
}

