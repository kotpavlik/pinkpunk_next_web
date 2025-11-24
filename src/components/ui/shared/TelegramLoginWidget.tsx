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
        onTelegramAuth?: (user: TelegramUser) => void
        Telegram?: {
            Login?: {
                auth: (options: Record<string, unknown>, callback: (user: TelegramUser) => void) => void
            }
        }
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
    const widgetId = useRef(`telegram-login-${Math.random().toString(36).substr(2, 9)}`)

    // Создаем виджет согласно официальной документации Telegram
    useEffect(() => {
        if (!containerRef.current) return

        const container = containerRef.current

        // Если нет callback, не создаем виджет
        if (!onAuth) {
            return
        }

        // Устанавливаем глобальный обработчик для callback
        // Важно: устанавливаем ДО создания виджета
        window.onTelegramAuth = (user: TelegramUser) => {
            onAuth(user)
        }

        // Очищаем контейнер перед созданием нового виджета
        container.innerHTML = ''

        // Создаем script тег точно как в официальной документации
        // Скрипт виджета сам загрузит библиотеку telegram-widget.js
        const widgetScript = document.createElement('script')
        widgetScript.async = true
        widgetScript.src = 'https://telegram.org/js/telegram-widget.js?22'
        widgetScript.setAttribute('data-telegram-login', botName)
        widgetScript.setAttribute('data-size', size)
        if (requestAccess) {
            widgetScript.setAttribute('data-request-access', 'write')
        }
        widgetScript.setAttribute('data-userpic', usePic ? '1' : '0')
        widgetScript.setAttribute('data-radius', cornerRadius.toString())
        widgetScript.setAttribute('data-lang', lang)
        widgetScript.setAttribute('data-onauth', 'onTelegramAuth(user)')

        // Добавляем script тег в контейнер
        container.appendChild(widgetScript)

        return () => {
            // Очистка при размонтировании
            if (container) {
                container.innerHTML = ''
            }
        }
    }, [botName, size, requestAccess, usePic, cornerRadius, lang, onAuth])

    return (
        <div
            ref={containerRef}
            className={`telegram-login-widget ${className}`}
            id={widgetId.current}
            style={{ minHeight: '60px', minWidth: '280px' }}
        />
    )
}

