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
    const widgetId = useRef(`telegram-login-${Math.random().toString(36).substr(2, 9)}`)
    const callbackCalledRef = useRef(false)
    const checkCallbackIntervalRef = useRef<NodeJS.Timeout | null>(null)

    // Создаем виджет согласно официальной документации Telegram
    useEffect(() => {
        if (!containerRef.current) return

        const container = containerRef.current

        // Если нет callback, не создаем виджет
        if (!onAuth) return

        // Сбрасываем флаг вызова callback
        callbackCalledRef.current = false

        // Устанавливаем глобальный обработчик для callback
        // Важно: устанавливаем ДО создания виджета
        // НЕ блокируем перезапись - виджет Telegram может устанавливать свою функцию
        const authCallback = (user: TelegramUser) => {
            if (callbackCalledRef.current) return
            callbackCalledRef.current = true

            try {
                onAuth(user)
            } catch (error) {
                console.error('[TelegramWidget] Ошибка в onAuth:', error)
            }
        }

        // Устанавливаем callback напрямую - позволяем виджету перезаписать при необходимости
        const ourCallbackWrapper = (user: TelegramUser) => {
            authCallback(user)
        }
        window.onTelegramAuth = ourCallbackWrapper

        // Проверяем доступность функции каждые 5 секунд и восстанавливаем если удалена
        // Но НЕ блокируем перезапись - виджет может установить свою функцию
        const checkCallbackInterval = setInterval(() => {
            if (typeof window.onTelegramAuth !== 'function') {
                // Если функция была удалена, восстанавливаем нашу
                window.onTelegramAuth = (user: TelegramUser) => {
                    authCallback(user)
                }
            } else {
                // Если функция существует, проверяем, не является ли она уже нашей оберткой
                const currentCallback = window.onTelegramAuth
                try {
                    const callbackString = String(currentCallback)
                    // Если это уже наша функция (содержит authCallback), ничего не делаем
                    if (callbackString.includes('authCallback')) {
                        return
                    }
                    // Если виджет установил свою функцию, оборачиваем её
                    const wrappedCallback = (user: TelegramUser) => {
                        try {
                            // Вызываем оригинальную функцию виджета
                            currentCallback(user)
                        } catch {
                            // Игнорируем ошибки
                        }
                        // Всегда вызываем наш callback
                        authCallback(user)
                    }
                    window.onTelegramAuth = wrappedCallback
                } catch {
                    // Игнорируем ошибки проверки
                }
            }
        }, 5000)

        checkCallbackIntervalRef.current = checkCallbackInterval

        // Очищаем контейнер перед созданием нового виджета
        container.innerHTML = ''

        // Получаем текущий origin для проверки безопасности
        const origin = typeof window !== 'undefined' ? window.location.origin : ''

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

        // Устанавливаем data-auth-url для проверки origin (важно для безопасности)
        if (origin) {
            widgetScript.setAttribute('data-auth-url', origin)
        }

        // Добавляем script тег в контейнер
        container.appendChild(widgetScript)

        return () => {
            if (container) {
                container.innerHTML = ''
            }

            if (checkCallbackIntervalRef.current) {
                clearInterval(checkCallbackIntervalRef.current)
                checkCallbackIntervalRef.current = null
            }

            callbackCalledRef.current = false
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

