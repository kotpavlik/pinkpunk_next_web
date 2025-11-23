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
    const originalXHROpenRef = useRef<typeof XMLHttpRequest.prototype.open | null>(null)
    const originalXHRSendRef = useRef<typeof XMLHttpRequest.prototype.send | null>(null)
    const messageHandlerRef = useRef<((event: MessageEvent) => void) | null>(null)

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

        // Функция для вызова callback с данными пользователя
        const triggerCallback = (userData: TelegramUser) => {
            if (!callbackCalledRef.current && window.onTelegramAuth) {
                console.log('Triggering callback manually with user data:', userData)
                callbackCalledRef.current = true
                if (fallbackTimeoutRef.current) {
                    clearTimeout(fallbackTimeoutRef.current)
                    fallbackTimeoutRef.current = null
                }
                window.onTelegramAuth(userData)
            }
        }

        // Функция для парсинга данных из ответа
        const parseUserData = (text: string): TelegramUser | null => {
            try {
                // Пытаемся найти JSON в ответе
                const jsonMatch = text.match(/\{[\s\S]*"user"[\s\S]*\}/)
                if (jsonMatch) {
                    const data = JSON.parse(jsonMatch[0])
                    if (data.user && data.user.id && data.user.hash) {
                        return data.user as TelegramUser
                    }
                }
            } catch (e) {
                console.log('Could not parse user data:', e)
            }
            return null
        }

        // Fallback механизм 1: перехватываем fetch запросы
        originalFetchRef.current = window.fetch

        const fetchInterceptor = async (...args: Parameters<typeof fetch>) => {
            const originalFetch = originalFetchRef.current || window.fetch
            const response = await originalFetch(...(args as Parameters<typeof fetch>))
            const url = args[0]?.toString() || ''

            // Перехватываем ответ от oauth.telegram.org
            if (url.includes('oauth.telegram.org/auth/get')) {
                console.log('Intercepted fetch request to oauth.telegram.org')
                // Клонируем response для чтения без нарушения оригинального потока
                const clonedResponse = response.clone()

                try {
                    const text = await clonedResponse.text()
                    console.log('Received response from oauth.telegram.org:', text.substring(0, 200))
                    const userData = parseUserData(text)

                    if (userData && !callbackCalledRef.current) {
                        // Если callback не был вызван автоматически, вызываем его вручную
                        setTimeout(() => {
                            if (!callbackCalledRef.current) {
                                triggerCallback(userData)
                            }
                        }, 500) // Небольшая задержка на случай, если виджет еще обрабатывает
                    }
                } catch (readError) {
                    console.log('Error reading response:', readError)
                }
            }

            return response
        }

        // Сохраняем ссылку на перехватчик
        fetchInterceptorRef.current = fetchInterceptor

        // Перехватываем fetch
        window.fetch = fetchInterceptor

        // Fallback механизм 2: перехватываем XMLHttpRequest через прототип
        const OriginalXHR = window.XMLHttpRequest
        originalXHROpenRef.current = OriginalXHR.prototype.open
        originalXHRSendRef.current = OriginalXHR.prototype.send

        OriginalXHR.prototype.open = function (method: string, url: string | URL, async: boolean = true, username?: string | null, password?: string | null) {
            if (typeof url === 'string' && url.includes('oauth.telegram.org/auth/get')) {
                console.log('Intercepted XHR request to oauth.telegram.org')
                this.addEventListener('load', function () {
                    if (this.readyState === 4 && this.status === 200) {
                        try {
                            const text = this.responseText
                            console.log('Received XHR response from oauth.telegram.org:', text.substring(0, 200))
                            const userData = parseUserData(text)
                            if (userData && !callbackCalledRef.current) {
                                setTimeout(() => {
                                    if (!callbackCalledRef.current) {
                                        triggerCallback(userData)
                                    }
                                }, 500)
                            }
                        } catch (e) {
                            console.log('Error parsing XHR response:', e)
                        }
                    }
                })
            }
            return originalXHROpenRef.current!.call(this, method, url, async, username, password)
        }

        // Fallback механизм 3: слушаем postMessage от iframe
        const messageHandler = (event: MessageEvent) => {
            // Проверяем, что сообщение от Telegram
            if (event.origin === 'https://oauth.telegram.org' || event.origin === 'https://telegram.org' || event.origin.includes('telegram.org')) {
                console.log('Received postMessage from Telegram:', event.data, 'Origin:', event.origin)

                // Обрабатываем событие unauthorized
                if (event.data && typeof event.data === 'object' && event.data.event === 'unauthorized') {
                    console.error('Telegram widget unauthorized - check domain settings in BotFather')
                    console.log('Current origin:', window.location.origin)
                    console.log('Bot name:', botName)
                }

                try {
                    let userData: TelegramUser | null = null

                    // Если данные приходят напрямую
                    if (event.data && event.data.user && event.data.user.id && event.data.user.hash) {
                        console.log('Found user data in postMessage:', event.data.user)
                        userData = event.data.user as TelegramUser
                    }
                    // Если данные в строке
                    else if (typeof event.data === 'string') {
                        userData = parseUserData(event.data)
                        if (userData) {
                            console.log('Parsed user data from string:', userData)
                        }
                    }
                    // Если данные в объекте (проверяем вложенные структуры)
                    else if (typeof event.data === 'object' && event.data !== null) {
                        // Проверяем, есть ли user в корне
                        if ('user' in event.data && event.data.user) {
                            const user = (event.data as { user?: TelegramUser }).user
                            if (user && user.id && user.hash) {
                                console.log('Found user data in object.user:', user)
                                userData = user
                            }
                        }
                        // Пытаемся парсить как JSON строку
                        else {
                            const text = JSON.stringify(event.data)
                            userData = parseUserData(text)
                            if (userData) {
                                console.log('Parsed user data from object JSON:', userData)
                            }
                        }
                    }

                    if (userData && !callbackCalledRef.current) {
                        console.log('Triggering callback from postMessage')
                        triggerCallback(userData)
                    }
                } catch (e) {
                    console.log('Error handling postMessage:', e)
                }
            }
        }

        messageHandlerRef.current = messageHandler
        window.addEventListener('message', messageHandler)

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

        console.log('Creating Telegram widget with:', {
            botName,
            origin,
            usePic,
            callbackSet: !!window.onTelegramAuth
        })

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
        // data-auth-url должен быть установлен для проверки origin
        // Если не установлен, Telegram будет использовать текущий origin
        if (origin) {
            widgetScript.setAttribute('data-auth-url', origin)
        }

        // Добавляем обработчик загрузки скрипта для отладки
        widgetScript.onload = () => {
            console.log('Telegram widget script loaded')
        }
        widgetScript.onerror = () => {
            console.error('Failed to load Telegram widget script')
        }

        // Добавляем script тег в контейнер
        container.appendChild(widgetScript)

        return () => {
            // Очистка при размонтировании
            if (container) {
                container.innerHTML = ''
            }
            // Восстанавливаем оригинальный fetch
            if (fetchInterceptorRef.current && originalFetchRef.current && window.fetch === fetchInterceptorRef.current) {
                try {
                    window.fetch = originalFetchRef.current
                } catch (e) {
                    // Игнорируем ошибки
                }
            }
            fetchInterceptorRef.current = null
            originalFetchRef.current = null

            // Восстанавливаем оригинальный XMLHttpRequest
            if (originalXHROpenRef.current && originalXHRSendRef.current) {
                try {
                    window.XMLHttpRequest.prototype.open = originalXHROpenRef.current
                    window.XMLHttpRequest.prototype.send = originalXHRSendRef.current
                } catch (e) {
                    // Игнорируем ошибки
                }
            }
            originalXHROpenRef.current = null
            originalXHRSendRef.current = null

            // Удаляем обработчик postMessage
            if (messageHandlerRef.current) {
                window.removeEventListener('message', messageHandlerRef.current)
            }
            messageHandlerRef.current = null

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

