'use client'

import { useEffect, useState } from 'react'
import { createPortal } from 'react-dom'
import { DotLottieReact } from '@lottiefiles/dotlottie-react'
import TelegramAnimation from '@/../public/animations/telegram.json'
import TelegramLoginWidget, { TelegramUser } from './TelegramLoginWidget'
import { useUserStore } from '@/zustand/user_store/UserStore'
import { useAppStore } from '@/zustand/app_store/AppStore'

interface TelegramLoginModalProps {
    isOpen: boolean
    onClose: () => void
    botName?: string
}

export default function TelegramLoginModal({
    isOpen,
    onClose,
    botName = process.env.NEXT_PUBLIC_TELEGRAM_BOT_NAME || 'pinkpunk_brand',
}: TelegramLoginModalProps) {
    const [mounted, setMounted] = useState(false)
    const [loading, setLoading] = useState(false)
    const [error, setError] = useState<string | null>(null)
    const { authenticateTelegramLoginWidget } = useUserStore()
    const { status } = useAppStore()

    // Убираем @ из начала botName, если он есть (Telegram Widget требует bot name без @)
    const cleanBotName = botName.startsWith('@') ? botName.slice(1) : botName

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


    if (!isOpen) return null

    // Ждем монтирования только для портала
    if (!mounted) {
        return null
    }

    const modalContent = (
        <div
            className="fixed inset-0 flex items-center justify-center bg-black/60 px-4 py-4 backdrop-blur-md transition-opacity duration-300 sm:py-8"
            style={{
                zIndex: 99999,
                position: 'fixed',
                top: 0,
                left: 0,
                right: 0,
                bottom: 0,
                width: '100vw',
                height: '100dvh',
                paddingBottom: 'calc(1rem + env(safe-area-inset-bottom))',
                paddingTop: 'calc(1rem + env(safe-area-inset-top))',
            }}
            onClick={(e) => {
                if (e.target === e.currentTarget) {
                    onClose()
                }
            }}
        >
            <div
                className="relative w-full max-w-md overflow-y-auto rounded-3xl border border-white/20 bg-gradient-to-br from-white/10 via-white/5 to-white/10 p-5 shadow-2xl backdrop-blur-2xl transform transition-all duration-300 scale-100 sm:p-7 md:p-10"
                style={{
                    background: 'linear-gradient(135deg, rgba(255, 255, 255, 0.1) 0%, rgba(255, 255, 255, 0.05) 50%, rgba(255, 255, 255, 0.1) 100%)',
                    backdropFilter: 'blur(30px) saturate(180%)',
                    WebkitBackdropFilter: 'blur(30px) saturate(180%)',
                    boxShadow: '0 20px 60px rgba(0, 0, 0, 0.5), 0 0 0 1px rgba(255, 255, 255, 0.1)',
                    maxHeight: 'calc(100dvh - 2rem - env(safe-area-inset-top) - env(safe-area-inset-bottom))',
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

                {/* Иконка Telegram - Lottie анимация */}
                <div className="flex justify-center ">
                    <div className="h-24 w-24 sm:h-32 sm:w-32 md:h-40 md:w-40">
                        <div className="w-full h-full">
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
                    </div>
                </div>

                {/* Заголовок */}
                <div className="mb-5 text-center sm:mb-7 md:mb-8">
                    <h2 className="mb-2 bg-gradient-to-r from-white to-white/80 bg-clip-text font-blauer-nue text-2xl font-bold text-transparent sm:text-3xl md:mb-3 md:text-4xl">
                        Вход через Telegram
                    </h2>
                    <p className="mx-auto max-w-sm text-sm leading-relaxed text-white/70 sm:text-base">
                        Авторизуйтесь через Telegram для доступа к личному кабинету и персональным предложениям!
                    </p>
                </div>

                {/* Сообщение об ошибке */}
                {error && (
                    <div className="mb-4 p-4 bg-red-500/20 border border-red-500/50 rounded-lg">
                        <p className="text-red-200 text-sm text-center">{error}</p>
                    </div>
                )}

                {/* Индикатор загрузки */}
                {(loading || status === 'loading') && (
                    <div className="mb-4 flex justify-center">
                        <div className="text-white/70 text-sm">Проверка данных...</div>
                    </div>
                )}

                {/* Виджет */}
                <div className="mb-3 flex min-h-[64px] justify-center sm:mb-4 sm:min-h-[70px]">
                    <TelegramLoginWidget
                        botName={cleanBotName}
                        size="large"
                        requestAccess={true}
                        usePic={true}
                        cornerRadius={20}
                        lang="ru"
                        className="flex justify-center"
                        onAuth={async (telegramUser: TelegramUser) => {
                            setLoading(true)
                            setError(null)

                            const result = await authenticateTelegramLoginWidget(telegramUser)

                            if (result.success) {
                                onClose()
                            } else {
                                setError(result.error || 'Ошибка авторизации')
                            }

                            setLoading(false)
                        }}
                    />
                </div>

                {/* Дополнительная информация */}
                <div className="mt-4 border-t border-white/10 pt-4 sm:mt-6 sm:pt-6">
                    <p className="text-white/50 text-xs text-center">
                        Нажимая кнопку, вы соглашаетесь с тем, что вы булочка 🥐
                    </p>
                </div>
            </div>
        </div>
    )

    // Проверяем, что document.body существует перед созданием портала
    if (typeof document === 'undefined' || !document.body) {
        return null
    }

    return createPortal(modalContent, document.body)
}

