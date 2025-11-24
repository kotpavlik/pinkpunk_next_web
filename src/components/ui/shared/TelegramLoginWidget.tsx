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
    console.log('[TelegramWidget] 🎨 Компонент TelegramLoginWidget рендерится', {
        botName,
        hasOnAuth: !!onAuth
    })

    const containerRef = useRef<HTMLDivElement>(null)
    const widgetId = useRef(`telegram-login-${Math.random().toString(36).substr(2, 9)}`)

    console.log('[TelegramWidget] 📝 Widget ID создан:', widgetId.current)
    const callbackCalledRef = useRef(false)
    const fetchInterceptorRef = useRef<typeof fetch | null>(null)
    const originalFetchRef = useRef<typeof fetch | null>(null)
    const xhrInterceptorRef = useRef<{ open: typeof XMLHttpRequest.prototype.open; send: typeof XMLHttpRequest.prototype.send } | null>(null)
    const timeoutRef = useRef<NodeJS.Timeout | null>(null)
    const messageHandlerRef = useRef<((event: MessageEvent) => void) | null>(null)
    const checkIntervalRef = useRef<NodeJS.Timeout | null>(null)
    const checkCallbackIntervalRef = useRef<NodeJS.Timeout | null>(null)
    const onAuthCallCountRef = useRef(0)
    const onAuthCallSourcesRef = useRef<Array<{ source: string; timestamp: number; userId?: number }>>([])

    // Создаем виджет согласно официальной документации Telegram
    useEffect(() => {
        console.log('[TelegramWidget] 🔵 useEffect запущен')

        if (!containerRef.current) {
            console.log('[TelegramWidget] ⚠️ containerRef.current не найден')
            return
        }

        const container = containerRef.current
        console.log('[TelegramWidget] ✅ Контейнер найден')

        // Если нет callback, не создаем виджет
        if (!onAuth) {
            console.log('[TelegramWidget] ⚠️ onAuth не передан')
            return
        }

        console.log('[TelegramWidget] ✅ onAuth передан')

        // Сбрасываем флаг вызова callback
        callbackCalledRef.current = false
        console.log('[TelegramWidget] 🔄 Флаг callbackCalledRef сброшен')

        // Устанавливаем глобальный обработчик для callback
        // Важно: устанавливаем ДО создания виджета
        // НЕ блокируем перезапись - виджет Telegram может устанавливать свою функцию
        const authCallback = (user: TelegramUser, source: string = 'window.onTelegramAuth') => {
            onAuthCallCountRef.current += 1
            onAuthCallSourcesRef.current.push({
                source,
                timestamp: Date.now(),
                userId: user.id
            })

            console.log(`[TelegramWidget] ✅ onAuth вызван #${onAuthCallCountRef.current}`, {
                source,
                userId: user.id,
                username: user.username,
                timestamp: new Date().toISOString(),
                totalCalls: onAuthCallCountRef.current,
                allSources: onAuthCallSourcesRef.current.map(s => s.source)
            })

            // Логируем данные пользователя
            console.log('[TelegramWidget] Данные пользователя:', user)

            if (callbackCalledRef.current) {
                console.log('[TelegramWidget] ⚠️ onAuth уже был вызван ранее, игнорируем повторный вызов')
                return
            }
            callbackCalledRef.current = true

            try {
                onAuth(user)
                console.log('[TelegramWidget] ✅ onAuth успешно выполнен')
            } catch (error) {
                console.log('[TelegramWidget] ❌ Ошибка при выполнении onAuth:', error)
            }
        }

        // Устанавливаем callback напрямую - позволяем виджету перезаписать при необходимости
        const ourCallbackWrapper = (user: TelegramUser) => {
            authCallback(user, 'window.onTelegramAuth (direct)')
        }
        window.onTelegramAuth = ourCallbackWrapper

        // Сохраняем ссылку на нашу функцию для сравнения
        const ourCallbackRef = { current: ourCallbackWrapper }

        // Проверяем доступность функции каждую секунду и восстанавливаем если удалена
        // Но НЕ блокируем перезапись - виджет может установить свою функцию
        const checkCallbackInterval = setInterval(() => {
            if (typeof window.onTelegramAuth !== 'function') {
                const restoredWrapper = (user: TelegramUser) => {
                    authCallback(user, 'window.onTelegramAuth (restored)')
                }
                window.onTelegramAuth = restoredWrapper
                ourCallbackRef.current = restoredWrapper
            } else {
                const currentCallback = window.onTelegramAuth
                // Проверяем, не является ли это уже наша функция (сравниваем по ссылке)
                if (currentCallback === ourCallbackRef.current) {
                    // Уже наша функция, ничего не делаем
                    return
                }
                // Проверяем по строковому представлению (fallback для случаев, когда ссылки разные)
                try {
                    const callbackString = String(currentCallback)
                    if (callbackString.includes('authCallback') || callbackString.includes('window.onTelegramAuth (direct)') || callbackString.includes('window.onTelegramAuth (restored)') || callbackString.includes('window.onTelegramAuth (wrapped')) {
                        // Уже наша функция, обновляем ссылку
                        ourCallbackRef.current = currentCallback
                        return
                    }
                } catch {
                    // Игнорируем ошибки проверки
                }
                // Обертываем функцию виджета, чтобы она вызывала наш callback
                const wrappedWrapper = (user: TelegramUser) => {
                    try {
                        currentCallback(user)
                    } catch {
                        // Игнорируем ошибки
                    }
                    authCallback(user, 'window.onTelegramAuth (wrapped widget function)')
                }
                window.onTelegramAuth = wrappedWrapper
                ourCallbackRef.current = wrappedWrapper
            }
        }, 1000)

        // Сохраняем ссылку на интервал для cleanup
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
        const triggerCallback = (userData: TelegramUser, source: string) => {
            console.log(`[TelegramWidget] 🎯 triggerCallback вызван из ${source}`, {
                userId: userData.id,
                callbackAlreadyCalled: callbackCalledRef.current
            })

            if (callbackCalledRef.current) {
                console.log(`[TelegramWidget] ⚠️ triggerCallback из ${source} - callback уже был вызван, пропускаем`)
                return
            }

            if (timeoutRef.current) {
                clearTimeout(timeoutRef.current)
                timeoutRef.current = null
            }

            callbackCalledRef.current = true

            if (window.onTelegramAuth) {
                try {
                    console.log(`[TelegramWidget] 📞 Вызываем window.onTelegramAuth из ${source}`)
                    window.onTelegramAuth(userData)
                } catch (error) {
                    console.log(`[TelegramWidget] ❌ Ошибка при вызове window.onTelegramAuth из ${source}:`, error)
                    console.log(`[TelegramWidget] 🔄 Fallback: вызываем onAuth напрямую из ${source}`)
                    authCallback(userData, `${source} -> onAuth fallback`)
                }
            } else {
                console.log(`[TelegramWidget] 📞 window.onTelegramAuth не установлен, вызываем onAuth напрямую из ${source}`)
                authCallback(userData, `${source} -> onAuth direct`)
            }
        }

        // Перехватываем fetch запросы для гарантированного вызова callback
        originalFetchRef.current = window.fetch

        const fetchInterceptor = async (...args: Parameters<typeof fetch>) => {
            const originalFetch = originalFetchRef.current || window.fetch
            const url = args[0]?.toString() || ''
            const response = await originalFetch(...args)

            if (url.includes('oauth.telegram.org/auth/get') && response.ok) {
                console.log('[TelegramWidget] 🌐 Перехвачен fetch ответ от oauth.telegram.org/auth/get')
                const clonedResponse = response.clone()
                clonedResponse.text().then(text => {
                    console.log('[TelegramWidget] 📥 Данные получены через fetch, длина:', text.length)
                    const userData = parseUserData(text)
                    if (userData && !callbackCalledRef.current) {
                        console.log('[TelegramWidget] ⏱️ Устанавливаем таймаут 500ms для вызова callback (fetch fallback)')
                        timeoutRef.current = setTimeout(() => {
                            if (!callbackCalledRef.current) {
                                console.log('[TelegramWidget] ⏰ Таймаут истек (fetch), виджет не вызвал callback, вызываем вручную')
                                triggerCallback(userData, 'fetch interceptor timeout')
                            } else {
                                console.log('[TelegramWidget] ✅ Callback уже был вызван виджетом (fetch), таймаут отменен')
                            }
                        }, 500)
                    } else if (callbackCalledRef.current) {
                        console.log('[TelegramWidget] ℹ️ Callback уже был вызван (fetch), пропускаем')
                    } else {
                        console.log('[TelegramWidget] ⚠️ Не удалось извлечь данные пользователя из fetch ответа')
                    }
                }).catch((error) => {
                    console.log('[TelegramWidget] ❌ Ошибка чтения fetch response:', error)
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
                console.log('[TelegramWidget] 🌐 Перехвачен XMLHttpRequest к oauth.telegram.org/auth/get')
                this.addEventListener('load', function () {
                    if (this.readyState === 4 && this.status === 200) {
                        console.log('[TelegramWidget] 📥 XMLHttpRequest успешно завершен')
                        try {
                            const text = this.responseText
                            console.log('[TelegramWidget] 📥 Данные получены через XHR, длина:', text.length)
                            const userData = parseUserData(text)
                            if (userData && !callbackCalledRef.current) {
                                console.log('[TelegramWidget] ⏱️ Устанавливаем таймаут 500ms для вызова callback (XHR fallback)')
                                timeoutRef.current = setTimeout(() => {
                                    if (!callbackCalledRef.current) {
                                        console.log('[TelegramWidget] ⏰ Таймаут истек (XHR), виджет не вызвал callback, вызываем вручную')
                                        triggerCallback(userData, 'XHR interceptor timeout')
                                    } else {
                                        console.log('[TelegramWidget] ✅ Callback уже был вызван виджетом (XHR), таймаут отменен')
                                    }
                                }, 500)
                            } else if (callbackCalledRef.current) {
                                console.log('[TelegramWidget] ℹ️ Callback уже был вызван (XHR), пропускаем')
                            } else {
                                console.log('[TelegramWidget] ⚠️ Не удалось извлечь данные пользователя из XHR ответа')
                            }
                        } catch (error) {
                            console.log('[TelegramWidget] ❌ Ошибка парсинга XHR данных:', error)
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

                    // Игнорируем служебные события
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
                        console.log('[TelegramWidget] ✅ Найдены данные пользователя в postMessage, вызываем callback немедленно')
                        triggerCallback(userData, 'postMessage direct')
                    } else if (callbackCalledRef.current) {
                        console.log('[TelegramWidget] ℹ️ Callback уже был вызван (postMessage), пропускаем')
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
        console.log('[TelegramWidget] ✅ Виджет добавлен в DOM, ожидаем вызова onAuth...')

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

