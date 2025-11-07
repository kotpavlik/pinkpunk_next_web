'use client'

import { useEffect, useState } from 'react'
import { createPortal } from 'react-dom'
import TelegramLoginWidget, { TelegramUser } from './TelegramLoginWidget'
import { useUserStore } from '@/zustand/user_store/UserStore'

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
    const { initialUser } = useUserStore()
    
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

    // Отладочная информация
    useEffect(() => {
        if (isOpen) {
            console.log('TelegramLoginModal: Modal is opening', { isOpen, mounted, botName, cleanBotName })
        }
    }, [isOpen, mounted, botName, cleanBotName])

    if (!isOpen) return null

    // Ждем монтирования только для портала
    if (!mounted) {
        return null
    }

    const modalContent = (
        <div
            className="fixed inset-0 flex items-center justify-center bg-black/50 backdrop-blur-sm"
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
                console.log('Modal backdrop clicked', e.target === e.currentTarget)
                if (e.target === e.currentTarget) {
                    onClose()
                }
            }}
        >
            <div
                className="relative bg-white/10 backdrop-blur-xl rounded-2xl p-8 border border-white/20 shadow-2xl max-w-md w-full mx-4"
                style={{
                    background: 'rgba(255, 255, 255, 0.1)',
                    backdropFilter: 'blur(20px) saturate(180%)',
                    WebkitBackdropFilter: 'blur(20px) saturate(180%)',
                    zIndex: 100000,
                    position: 'relative',
                }}
                onClick={(e) => {
                    console.log('Modal content clicked')
                    e.stopPropagation()
                }}
            >
                <button
                    onClick={onClose}
                    className="absolute top-4 right-4 text-white/60 hover:text-white transition-colors z-10"
                    aria-label="Закрыть"
                >
                    <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                    </svg>
                </button>
                <div className="text-center mb-6">
                    <h2 className="text-2xl font-blauer-nue font-bold text-white mb-2">
                        Вход через Telegram
                    </h2>
                    <p className="text-white/60 text-sm">
                        Авторизуйтесь через Telegram для доступа к личному кабинету
                    </p>
                </div>
                <div className="flex justify-center min-h-[60px]">
                    <TelegramLoginWidget
                        botName={cleanBotName}
                        size="large"
                        requestAccess={true}
                        usePic={true}
                        cornerRadius={20}
                        lang="ru"
                        onAuth={(telegramUser: TelegramUser) => {
                            // Обрабатываем данные пользователя из Telegram
                            // Данные, которые приходят: id, first_name, last_name, username, photo_url, auth_date, hash
                            console.log('Telegram auth success:', telegramUser)
                            const userData = {
                                userId: telegramUser.id,
                                firstName: telegramUser.first_name,
                                lastName: telegramUser.last_name,
                                username: telegramUser.username,
                            }
                            initialUser(userData)
                            onClose()
                        }}
                    />
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

