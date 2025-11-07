'use client'

import { useEffect, useRef } from 'react'

// Типы данных, которые приходят от Telegram Login Widget
export interface TelegramUser {
    id: number
    first_name: string
    last_name?: string
    username?: string
    photo_url?: string
    auth_date: number
    hash: string
}

interface TelegramLoginWidgetProps {
    botName: string
    size?: 'large' | 'medium' | 'small'
    requestAccess?: boolean
    usePic?: boolean
    cornerRadius?: number
    lang?: string
    onAuth?: (user: TelegramUser) => void
    className?: string
}

declare global {
    interface Window {
        TelegramOnAuthCb?: (user: TelegramUser) => void
    }
}

export default function TelegramLoginWidget({
    botName,
    size = 'large',
    requestAccess = true,
    usePic = true,
    cornerRadius = 20,
    lang = 'ru',
    onAuth,
    className = '',
}: TelegramLoginWidgetProps) {
    const containerRef = useRef<HTMLDivElement>(null)

    useEffect(() => {
        if (!containerRef.current || !onAuth) return

        const container = containerRef.current

        // Устанавливаем глобальный обработчик для callback
        window.TelegramOnAuthCb = (user: TelegramUser) => {
            onAuth(user)
        }

        // Создаем script тег с data-атрибутами (как в рабочем примере)
        const script = document.createElement('script')
        script.src = 'https://telegram.org/js/telegram-widget.js?21'
        script.async = true

        script.setAttribute('data-telegram-login', botName)
        script.setAttribute('data-size', size)
        if (requestAccess) {
            script.setAttribute('data-request-access', 'write')
        }
        script.setAttribute('data-userpic', usePic ? '1' : '0')
        script.setAttribute('data-radius', cornerRadius.toString())
        script.setAttribute('data-lang', lang)
        script.setAttribute('data-onauth', 'TelegramOnAuthCb(user)')

        // Устанавливаем origin для проверки подлинности
        const origin = typeof window !== 'undefined' ? window.location.origin : ''
        script.setAttribute('data-auth-url', origin)

        // Добавляем script в контейнер
        container.appendChild(script)

        return () => {
            // Очистка при размонтировании
            if (container && script.parentNode) {
                container.removeChild(script)
            }
            window.TelegramOnAuthCb = undefined
        }
    }, [botName, size, requestAccess, usePic, cornerRadius, lang, onAuth])

    return (
        <div
            ref={containerRef}
            className={`telegram-login-widget ${className}`}
            style={{ minHeight: '60px', minWidth: '280px' }}
        />
    )
}

