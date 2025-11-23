'use client'

import { useEffect, useRef, useState } from 'react'

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
    const [scriptLoaded, setScriptLoaded] = useState(false)
    const widgetId = useRef(`telegram-login-${Math.random().toString(36).substr(2, 9)}`)
    const callbackCalledRef = useRef(false)
    const fallbackTimeoutRef = useRef<NodeJS.Timeout | null>(null)
    const fetchInterceptorRef = useRef<((...args: Parameters<typeof fetch>) => Promise<Response>) | null>(null)
    const originalFetchRef = useRef<typeof fetch | null>(null)

    // Загружаем скрипт Telegram Widget
    useEffect(() => {
        // Проверяем, загружен ли скрипт
        if (document.querySelector('script[src*="telegram-widget.js"]')) {
            setScriptLoaded(true)
            return
        }

        // Загружаем скрипт
        const script = document.createElement('script')
        script.src = 'https://telegram.org/js/telegram-widget.js?22'
        script.async = true
        script.onload = () => {
            setScriptLoaded(true)
        }
        script.onerror = () => {
            // Silent error handling
        }
        document.body.appendChild(script)

        return () => {
            // Не удаляем скрипт при размонтировании, так как он может использоваться другими компонентами
        }
    }, [])

    // Создаем виджет после загрузки скрипта
    useEffect(() => {
        if (!containerRef.current) return

        const container = containerRef.current

        // Если скрипт еще не загружен, создаем виджет с задержкой
        if (!scriptLoaded) {
            // Очищаем контейнер
            container.innerHTML = '<div className="text-white text-sm">Загрузка...</div>'
            return
        }

        // Если нет callback, не создаем виджет
        if (!onAuth) {
            return
        }

        // Флаг для отслеживания вызова callback
        callbackCalledRef.current = false

        // Устанавливаем глобальный обработчик для callback
        window.onTelegramAuth = (user: TelegramUser) => {
            callbackCalledRef.current = true
            if (fallbackTimeoutRef.current) {
                clearTimeout(fallbackTimeoutRef.current)
                fallbackTimeoutRef.current = null
            }
            onAuth(user)
        }

        // Fallback механизм: перехватываем ответы от Telegram OAuth
        originalFetchRef.current = window.fetch

        const fetchInterceptor = async (...args: Parameters<typeof fetch>) => {
            const originalFetch = originalFetchRef.current || window.fetch
            const response = await originalFetch(...(args as Parameters<typeof fetch>))
            const url = args[0]?.toString() || ''

            // Перехватываем ответ от oauth.telegram.org
            if (url.includes('oauth.telegram.org/auth/get')) {
                // Клонируем response для чтения без нарушения оригинального потока
                const clonedResponse = response.clone()

                try {
                    const text = await clonedResponse.text()
                    // Пытаемся найти JSON в ответе
                    const jsonMatch = text.match(/\{[\s\S]*"user"[\s\S]*\}/)

                    if (jsonMatch && !callbackCalledRef.current) {
                        try {
                            const data = JSON.parse(jsonMatch[0])

                            if (data.user && data.user.id && data.user.hash) {
                                // Если callback не был вызван автоматически, вызываем его вручную
                                setTimeout(() => {
                                    if (!callbackCalledRef.current && window.onTelegramAuth) {
                                        callbackCalledRef.current = true
                                        if (fallbackTimeoutRef.current) {
                                            clearTimeout(fallbackTimeoutRef.current)
                                            fallbackTimeoutRef.current = null
                                        }
                                        window.onTelegramAuth(data.user as TelegramUser)
                                    }
                                }, 500) // Небольшая задержка на случай, если виджет еще обрабатывает
                            }
                        } catch (parseError) {
                            // Игнорируем ошибки парсинга
                            console.log('Could not parse Telegram OAuth response:', parseError)
                        }
                    }
                } catch (readError) {
                    // Игнорируем ошибки чтения
                }
            }

            return response
        }

        // Сохраняем ссылку на перехватчик
        fetchInterceptorRef.current = fetchInterceptor

        // Перехватываем fetch
        window.fetch = fetchInterceptor

        // Дополнительный fallback: таймаут на случай, если ничего не сработало
        fallbackTimeoutRef.current = setTimeout(() => {
            if (!callbackCalledRef.current) {
                // Пытаемся найти данные в DOM виджета
                const widgetContainer = containerRef.current
                if (widgetContainer) {
                    // Ищем скрытые данные или пытаемся извлечь из iframe
                    const scripts = widgetContainer.querySelectorAll('script')
                    scripts.forEach(script => {
                        const scriptContent = script.textContent || script.innerHTML
                        const jsonMatch = scriptContent.match(/\{[\s\S]*"user"[\s\S]*\}/)
                        if (jsonMatch) {
                            try {
                                const data = JSON.parse(jsonMatch[0])
                                if (data.user && data.user.id && data.user.hash && window.onTelegramAuth) {
                                    callbackCalledRef.current = true
                                    window.onTelegramAuth(data.user as TelegramUser)
                                }
                            } catch (e) {
                                // Игнорируем ошибки
                            }
                        }
                    })
                }
            }
        }, 3000) // 3 секунды таймаут

        // Очищаем контейнер перед созданием нового виджета
        container.innerHTML = ''

        // Создаем виджет согласно официальной документации Telegram
        // Используем script тег с data-атрибутами (официальный способ)
        const origin = typeof window !== 'undefined' ? window.location.origin : ''

        // Создаем script тег точно как в официальной документации
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
        widgetScript.setAttribute('data-auth-url', origin)

        // Добавляем script тег в контейнер
        container.appendChild(widgetScript)

        return () => {
            // Очистка при размонтировании
            if (container) {
                container.innerHTML = ''
            }
            // Восстанавливаем оригинальный fetch
            if (fetchInterceptorRef.current && originalFetchRef.current && window.fetch === fetchInterceptorRef.current) {
                // Восстанавливаем только если это наш перехватчик
                try {
                    window.fetch = originalFetchRef.current
                } catch (e) {
                    // Игнорируем ошибки
                }
            }
            fetchInterceptorRef.current = null
            originalFetchRef.current = null
            // Очищаем таймаут
            if (fallbackTimeoutRef.current) {
                clearTimeout(fallbackTimeoutRef.current)
                fallbackTimeoutRef.current = null
            }
            callbackCalledRef.current = false
        }
    }, [scriptLoaded, botName, size, requestAccess, usePic, cornerRadius, lang, onAuth])

    return (
        <div
            ref={containerRef}
            className={`telegram-login-widget ${className}`}
            id={widgetId.current}
            style={{ minHeight: '60px', minWidth: '280px' }}
        />
    )
}

