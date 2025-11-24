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
    const fetchInterceptorRef = useRef<typeof fetch | null>(null)
    const originalFetchRef = useRef<typeof fetch | null>(null)
    const xhrInterceptorRef = useRef<{ open: typeof XMLHttpRequest.prototype.open; send: typeof XMLHttpRequest.prototype.send } | null>(null)
    const timeoutRef = useRef<NodeJS.Timeout | null>(null)
    const messageHandlerRef = useRef<((event: MessageEvent) => void) | null>(null)
    const checkIntervalRef = useRef<NodeJS.Timeout | null>(null)
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
            } catch {
                // Игнорируем ошибки
            }
        }

        // Устанавливаем callback напрямую - позволяем виджету перезаписать при необходимости
        const ourCallbackWrapper = (user: TelegramUser) => {
            authCallback(user)
        }
        window.onTelegramAuth = ourCallbackWrapper

        // Сохраняем ссылку на нашу функцию для сравнения
        const ourCallbackRef = { current: ourCallbackWrapper }

        // Проверяем доступность функции каждую секунду и восстанавливаем если удалена
        // Но НЕ блокируем перезапись - виджет может установить свою функцию
        const checkCallbackInterval = setInterval(() => {
            if (typeof window.onTelegramAuth !== 'function') {
                const restoredWrapper = (user: TelegramUser) => {
                    authCallback(user)
                }
                window.onTelegramAuth = restoredWrapper
                ourCallbackRef.current = restoredWrapper
            } else {
                const currentCallback = window.onTelegramAuth
                if (currentCallback === ourCallbackRef.current) {
                    return
                }
                try {
                    const callbackString = String(currentCallback)
                    if (callbackString.includes('authCallback') || callbackString.includes('ourCallbackWrapper')) {
                        ourCallbackRef.current = currentCallback
                        return
                    }
                } catch {
                    // Игнорируем ошибки проверки
                }
                const wrappedWrapper = (user: TelegramUser) => {
                    try {
                        currentCallback(user)
                    } catch {
                        // Игнорируем ошибки
                    }
                    authCallback(user)
                }
                window.onTelegramAuth = wrappedWrapper
                ourCallbackRef.current = wrappedWrapper
            }
        }, 1000)

        checkCallbackIntervalRef.current = checkCallbackInterval

        // Функция для парсинга данных из ответа Telegram
        const parseUserData = (text: string): TelegramUser | null => {
            try {
                const jsonMatch = text.match(/\{[\s\S]*"user"[\s\S]*\}/)
                if (jsonMatch) {
                    const data = JSON.parse(jsonMatch[0])
                    if (data.user && data.user.id && data.user.hash) {
                        return data.user as TelegramUser
                    }
                }
                try {
                    const data = JSON.parse(text)
                    if (data.user && data.user.id && data.user.hash) {
                        return data.user as TelegramUser
                    }
                } catch {
                    // Игнорируем
                }
            } catch {
                // Игнорируем ошибки парсинга
            }
            return null
        }

        // Функция для вызова callback с данными пользователя
        const triggerCallback = (userData: TelegramUser) => {
            if (callbackCalledRef.current) return

            if (timeoutRef.current) {
                clearTimeout(timeoutRef.current)
                timeoutRef.current = null
            }

            callbackCalledRef.current = true

            if (window.onTelegramAuth) {
                try {
                    window.onTelegramAuth(userData)
                } catch {
                    authCallback(userData)
                }
            } else {
                authCallback(userData)
            }
        }

        // Перехватываем fetch запросы для гарантированного вызова callback
        originalFetchRef.current = window.fetch

        const fetchInterceptor = async (...args: Parameters<typeof fetch>) => {
            const originalFetch = originalFetchRef.current || window.fetch
            const url = args[0]?.toString() || ''
            const response = await originalFetch(...args)

            if (url.includes('oauth.telegram.org/auth/get') && response.ok) {
                const clonedResponse = response.clone()
                clonedResponse.text().then(text => {
                    const userData = parseUserData(text)
                    if (userData && !callbackCalledRef.current) {
                        timeoutRef.current = setTimeout(() => {
                            if (!callbackCalledRef.current) {
                                triggerCallback(userData)
                            }
                        }, 500)
                    }
                }).catch(() => {
                    // Игнорируем ошибки
                })
            }

            return response
        }

        fetchInterceptorRef.current = fetchInterceptor
        window.fetch = fetchInterceptor

        // Перехватываем XMLHttpRequest (виджет может использовать и его)
        const OriginalXHR = window.XMLHttpRequest
        const originalXHROpen = OriginalXHR.prototype.open
        const originalXHRSend = OriginalXHR.prototype.send

        OriginalXHR.prototype.open = function (method: string, url: string | URL, async: boolean = true, username?: string | null, password?: string | null) {
            if (typeof url === 'string' && url.includes('oauth.telegram.org/auth/get')) {
                this.addEventListener('load', function () {
                    if (this.readyState === 4 && this.status === 200) {
                        try {
                            const text = this.responseText
                            const userData = parseUserData(text)
                            if (userData && !callbackCalledRef.current) {
                                timeoutRef.current = setTimeout(() => {
                                    if (!callbackCalledRef.current) {
                                        triggerCallback(userData)
                                    }
                                }, 500)
                            }
                        } catch {
                            // Игнорируем ошибки
                        }
                    }
                })
            }
            return originalXHROpen.call(this, method, url, async, username, password)
        }

        xhrInterceptorRef.current = {
            open: originalXHROpen,
            send: originalXHRSend
        }

        // Перехватываем postMessage события (виджет может использовать iframe)
        const messageHandler = (event: MessageEvent) => {
            if (event.origin === 'https://oauth.telegram.org' ||
                event.origin === 'https://telegram.org' ||
                event.origin.includes('telegram.org')) {
                try {
                    let userData: TelegramUser | null = null
                    let parsedData: Record<string, unknown> | null = null

                    if (typeof event.data === 'string') {
                        try {
                            const parsed = JSON.parse(event.data)
                            parsedData = parsed && typeof parsed === 'object' ? parsed as Record<string, unknown> : null
                        } catch {
                            parsedData = null
                        }
                    } else if (typeof event.data === 'object' && event.data !== null) {
                        parsedData = event.data as Record<string, unknown>
                    }

                    // Обрабатываем событие auth_user - содержит данные пользователя
                    if (parsedData && parsedData.event === 'auth_user') {
                        const authData = parsedData.auth_data as Record<string, unknown> | undefined
                        if (authData && authData.id && authData.hash) {
                            userData = authData as unknown as TelegramUser
                            if (!callbackCalledRef.current) {
                                triggerCallback(userData)
                            }
                        }
                        return
                    }

                    // Игнорируем другие служебные события
                    if (parsedData && parsedData.event) {
                        return
                    }

                    // Проверяем различные форматы данных
                    if (parsedData) {
                        const userObj = parsedData.user
                        if (userObj && typeof userObj === 'object') {
                            const user = userObj as Record<string, unknown>
                            if (user.id && user.hash) {
                                userData = user as unknown as TelegramUser
                            }
                        } else if (parsedData.id && parsedData.hash) {
                            userData = parsedData as unknown as TelegramUser
                        } else if (typeof parsedData === 'object') {
                            const findUserInObject = (obj: unknown): TelegramUser | null => {
                                if (!obj || typeof obj !== 'object') return null
                                const objRecord = obj as Record<string, unknown>
                                if (objRecord.id && objRecord.hash && objRecord.first_name) {
                                    return obj as TelegramUser
                                }
                                for (const key in objRecord) {
                                    if (objRecord[key] && typeof objRecord[key] === 'object') {
                                        const found = findUserInObject(objRecord[key])
                                        if (found) return found
                                    }
                                }
                                return null
                            }
                            const found = findUserInObject(parsedData)
                            if (found) {
                                userData = found
                            }
                        }
                    }

                    if (userData && !callbackCalledRef.current) {
                        triggerCallback(userData)
                    }
                } catch {
                    // Игнорируем ошибки
                }
            }
        }

        messageHandlerRef.current = messageHandler
        window.addEventListener('message', messageHandler)

        // Периодическая проверка наличия данных в DOM (fallback)
        checkIntervalRef.current = setInterval(() => {
            if (callbackCalledRef.current && checkIntervalRef.current) {
                clearInterval(checkIntervalRef.current)
                checkIntervalRef.current = null
            }
        }, 1000)

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

            if (timeoutRef.current) {
                clearTimeout(timeoutRef.current)
                timeoutRef.current = null
            }

            if (fetchInterceptorRef.current && window.fetch === fetchInterceptorRef.current && originalFetchRef.current) {
                window.fetch = originalFetchRef.current
            }
            fetchInterceptorRef.current = null
            originalFetchRef.current = null

            if (xhrInterceptorRef.current) {
                try {
                    window.XMLHttpRequest.prototype.open = xhrInterceptorRef.current.open
                } catch {
                    // Игнорируем ошибки
                }
                xhrInterceptorRef.current = null
            }

            if (messageHandlerRef.current) {
                window.removeEventListener('message', messageHandlerRef.current)
                messageHandlerRef.current = null
            }

            if (checkIntervalRef.current) {
                clearInterval(checkIntervalRef.current)
                checkIntervalRef.current = null
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

