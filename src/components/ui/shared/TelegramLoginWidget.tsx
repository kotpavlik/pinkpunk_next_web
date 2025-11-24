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
        TelegramLoginWidget?: {
            dataOnauth: (user: TelegramUser) => void
        }
    }
}

/**
 * Проверяет, является ли photo_url зашифрованной ссылкой от Telegram
 * Зашифрованные ссылки имеют паттерн: t.me/i/userpic/... или https://t.me/i/userpic/...
 * @param photoUrl - URL фото для проверки
 * @returns true если ссылка зашифрована, false если это прямая ссылка или undefined
 */
export const isEncryptedTelegramPhotoUrl = (photoUrl?: string): boolean => {
    if (!photoUrl) return false
    return photoUrl.includes('t.me/i/userpic') || photoUrl.includes('/i/userpic/')
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
        if (!containerRef.current) return

        const container = containerRef.current

        // Если нет callback, не создаем виджет
        if (!onAuth) return

        // Устанавливаем глобальный объект для callback (как в рабочем примере)
        window.TelegramLoginWidget = {
            dataOnauth: (user: TelegramUser) => {
                try {
                    onAuth(user)
                } catch (error) {
                    console.error('[TelegramWidget] Ошибка в onAuth:', error)
                }
            }
        }

        // Очищаем контейнер перед созданием нового виджета
        container.innerHTML = ''

        // Создаем script тег точно как в рабочем примере
        const widgetScript = document.createElement('script')
        widgetScript.async = true
        widgetScript.src = 'https://telegram.org/js/telegram-widget.js?22'
        widgetScript.setAttribute('data-telegram-login', botName)
        widgetScript.setAttribute('data-size', size)

        if (cornerRadius !== undefined) {
            widgetScript.setAttribute('data-radius', cornerRadius.toString())
        }

        if (requestAccess) {
            widgetScript.setAttribute('data-request-access', 'write')
        }

        widgetScript.setAttribute('data-userpic', usePic.toString())

        if (lang) {
            widgetScript.setAttribute('data-lang', lang)
        }

        // Используем TelegramLoginWidget.dataOnauth вместо onTelegramAuth
        widgetScript.setAttribute('data-onauth', 'TelegramLoginWidget.dataOnauth(user)')

        // Добавляем script тег в контейнер
        container.appendChild(widgetScript)

        return () => {
            if (container) {
                container.innerHTML = ''
            }
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

