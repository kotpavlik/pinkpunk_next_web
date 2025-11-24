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
    const callbackCalledRef = useRef(false)
    const fetchInterceptorRef = useRef<typeof fetch | null>(null)
    const originalFetchRef = useRef<typeof fetch | null>(null)
    const xhrInterceptorRef = useRef<{ open: typeof XMLHttpRequest.prototype.open; send: typeof XMLHttpRequest.prototype.send } | null>(null)
    const timeoutRef = useRef<NodeJS.Timeout | null>(null)
    const messageHandlerRef = useRef<((event: MessageEvent) => void) | null>(null)
    const checkIntervalRef = useRef<NodeJS.Timeout | null>(null)

    // Создаем виджет согласно официальной документации Telegram
    useEffect(() => {
        console.log('[TelegramWidget] 🔵 Инициализация виджета', { botName, widgetId: widgetId.current })

        if (!containerRef.current) {
            console.log('[TelegramWidget] ⚠️ Контейнер не найден')
            return
        }

        const container = containerRef.current

        // Если нет callback, не создаем виджет
        if (!onAuth) {
            console.log('[TelegramWidget] ⚠️ Callback onAuth не передан')
            return
        }

        // Сбрасываем флаг вызова callback
        callbackCalledRef.current = false
        console.log('[TelegramWidget] 🔄 Сброшен флаг callbackCalledRef')

        // Устанавливаем глобальный обработчик для callback
        // Важно: устанавливаем ДО создания виджета
        const authCallback = (user: TelegramUser) => {
            console.log('[TelegramWidget] ✅ window.onTelegramAuth вызван виджетом', { userId: user.id, username: user.username })
            if (callbackCalledRef.current) {
                console.log('[TelegramWidget] ⚠️ Callback уже был вызван, игнорируем повторный вызов')
                return // Предотвращаем двойной вызов
            }
            callbackCalledRef.current = true
            console.log('[TelegramWidget] 📞 Вызываем onAuth callback', { userId: user.id })
            onAuth(user)
        }

        window.onTelegramAuth = authCallback
        console.log('[TelegramWidget] 🔧 Установлен window.onTelegramAuth')

        // Функция для парсинга данных из ответа Telegram
        const parseUserData = (text: string): TelegramUser | null => {
            console.log('[TelegramWidget] 📝 Парсинг данных из ответа Telegram', { textLength: text.length })
            try {
                // Пытаемся найти JSON в ответе
                const jsonMatch = text.match(/\{[\s\S]*"user"[\s\S]*\}/)
                if (jsonMatch) {
                    console.log('[TelegramWidget] ✅ Найден JSON в ответе (regex match)')
                    const data = JSON.parse(jsonMatch[0])
                    if (data.user && data.user.id && data.user.hash) {
                        console.log('[TelegramWidget] ✅ Данные пользователя успешно извлечены', { userId: data.user.id })
                        return data.user as TelegramUser
                    }
                }
                // Если не нашли, пытаемся парсить весь текст как JSON
                try {
                    console.log('[TelegramWidget] 🔄 Пытаемся парсить весь текст как JSON')
                    const data = JSON.parse(text)
                    if (data.user && data.user.id && data.user.hash) {
                        console.log('[TelegramWidget] ✅ Данные пользователя успешно извлечены (полный парсинг)', { userId: data.user.id })
                        return data.user as TelegramUser
                    }
                } catch (parseError) {
                    console.log('[TelegramWidget] ⚠️ Ошибка парсинга полного текста:', parseError)
                }
            } catch (error) {
                console.log('[TelegramWidget] ❌ Ошибка парсинга данных:', error)
            }
            console.log('[TelegramWidget] ⚠️ Не удалось извлечь данные пользователя')
            return null
        }

        // Функция для вызова callback с данными пользователя
        const triggerCallback = (userData: TelegramUser, source: string) => {
            console.log(`[TelegramWidget] 🎯 triggerCallback вызван из ${source}`, { userId: userData.id, username: userData.username })

            if (callbackCalledRef.current) {
                console.log('[TelegramWidget] ⚠️ Callback уже был вызван, игнорируем повторный вызов')
                return // Предотвращаем двойной вызов
            }

            // Очищаем таймаут, если он был установлен
            if (timeoutRef.current) {
                console.log('[TelegramWidget] 🧹 Очищаем таймаут')
                clearTimeout(timeoutRef.current)
                timeoutRef.current = null
            }

            callbackCalledRef.current = true
            console.log('[TelegramWidget] ✅ Установлен флаг callbackCalledRef = true')

            // Вызываем callback напрямую
            if (window.onTelegramAuth) {
                try {
                    console.log('[TelegramWidget] 📞 Вызываем window.onTelegramAuth')
                    window.onTelegramAuth(userData)
                    console.log('[TelegramWidget] ✅ window.onTelegramAuth успешно вызван')
                } catch (error) {
                    console.log('[TelegramWidget] ❌ Ошибка при вызове window.onTelegramAuth:', error)
                    // Если прямой вызов не сработал, пробуем через onAuth
                    if (onAuth) {
                        console.log('[TelegramWidget] 🔄 Fallback: вызываем onAuth напрямую')
                        onAuth(userData)
                    }
                }
            } else if (onAuth) {
                console.log('[TelegramWidget] 📞 window.onTelegramAuth не установлен, вызываем onAuth напрямую')
                // Если window.onTelegramAuth не установлен, вызываем напрямую
                onAuth(userData)
            } else {
                console.log('[TelegramWidget] ❌ Нет доступного callback для вызова')
            }
        }

        // Перехватываем fetch запросы для гарантированного вызова callback
        originalFetchRef.current = window.fetch
        console.log('[TelegramWidget] 🔧 Сохранен оригинальный fetch')

        const fetchInterceptor = async (...args: Parameters<typeof fetch>) => {
            const originalFetch = originalFetchRef.current || window.fetch
            const url = args[0]?.toString() || ''

            // Логируем все запросы к telegram.org для отладки
            if (url.includes('telegram.org') || url.includes('oauth.telegram.org')) {
                console.log('[TelegramWidget] 🌐 Fetch запрос к Telegram:', url)
            }

            const response = await originalFetch(...args)

            // Перехватываем ответ от oauth.telegram.org
            if (url.includes('oauth.telegram.org/auth/get')) {
                console.log('[TelegramWidget] ✅ Перехвачен ответ от oauth.telegram.org/auth/get', { status: response.status, ok: response.ok })

                // Проверяем успешность ответа
                if (response.ok) {
                    console.log('[TelegramWidget] ✅ Ответ успешный, начинаем чтение данных')
                    // Клонируем response для чтения без нарушения оригинального потока
                    const clonedResponse = response.clone()

                    // Читаем данные асинхронно
                    clonedResponse.text().then(text => {
                        console.log('[TelegramWidget] 📥 Данные получены, длина:', text.length)
                        console.log('[TelegramWidget] 📥 Первые 500 символов ответа:', text.substring(0, 500))
                        const userData = parseUserData(text)
                        if (userData && !callbackCalledRef.current) {
                            console.log('[TelegramWidget] ⏱️ Устанавливаем таймаут 500ms для вызова callback (fallback)')
                            // Устанавливаем таймаут для вызова callback, если виджет не вызвал
                            timeoutRef.current = setTimeout(() => {
                                if (!callbackCalledRef.current) {
                                    console.log('[TelegramWidget] ⏰ Таймаут истек, виджет не вызвал callback, вызываем вручную')
                                    triggerCallback(userData, 'fetch interceptor timeout')
                                } else {
                                    console.log('[TelegramWidget] ✅ Callback уже был вызван виджетом, таймаут отменен')
                                }
                            }, 500) // Увеличили задержку до 500ms для надежности
                        } else if (callbackCalledRef.current) {
                            console.log('[TelegramWidget] ℹ️ Callback уже был вызван, пропускаем')
                        } else {
                            console.log('[TelegramWidget] ⚠️ Не удалось извлечь данные пользователя')
                        }
                    }).catch((error) => {
                        console.log('[TelegramWidget] ❌ Ошибка чтения response:', error)
                    })
                } else {
                    console.log('[TelegramWidget] ❌ Ответ не успешный:', response.status)
                }
            }

            return response
        }

        // Сохраняем ссылку на перехватчик
        fetchInterceptorRef.current = fetchInterceptor

        // Перехватываем fetch
        window.fetch = fetchInterceptor
        console.log('[TelegramWidget] 🔧 Fetch перехвачен')

        // Перехватываем XMLHttpRequest (виджет может использовать и его)
        const OriginalXHR = window.XMLHttpRequest
        const originalXHROpen = OriginalXHR.prototype.open
        const originalXHRSend = OriginalXHR.prototype.send
        console.log('[TelegramWidget] 🔧 Сохранены оригинальные методы XMLHttpRequest')

        OriginalXHR.prototype.open = function (method: string, url: string | URL, async: boolean = true, username?: string | null, password?: string | null) {
            const urlString = typeof url === 'string' ? url : url.toString()

            // Логируем все запросы к telegram.org для отладки
            if (urlString.includes('telegram.org') || urlString.includes('oauth.telegram.org')) {
                console.log('[TelegramWidget] 🌐 XMLHttpRequest.open:', method, urlString)
            }

            if (typeof url === 'string' && url.includes('oauth.telegram.org/auth/get')) {
                console.log('[TelegramWidget] ✅ Перехвачен XMLHttpRequest к oauth.telegram.org/auth/get')
                this.addEventListener('load', function () {
                    console.log('[TelegramWidget] 📥 XMLHttpRequest load event', { readyState: this.readyState, status: this.status })
                    if (this.readyState === 4 && this.status === 200) {
                        console.log('[TelegramWidget] ✅ XMLHttpRequest успешно завершен')
                        try {
                            const text = this.responseText
                            console.log('[TelegramWidget] 📥 Данные получены через XHR, длина:', text.length)
                            console.log('[TelegramWidget] 📥 Первые 500 символов ответа (XHR):', text.substring(0, 500))
                            const userData = parseUserData(text)
                            if (userData && !callbackCalledRef.current) {
                                console.log('[TelegramWidget] ⏱️ Устанавливаем таймаут 500ms для вызова callback (XHR fallback)')
                                // Устанавливаем таймаут для вызова callback
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
                                console.log('[TelegramWidget] ⚠️ Не удалось извлечь данные пользователя (XHR)')
                            }
                        } catch (error) {
                            console.log('[TelegramWidget] ❌ Ошибка парсинга данных (XHR):', error)
                        }
                    } else {
                        console.log('[TelegramWidget] ⚠️ XMLHttpRequest не успешен:', { readyState: this.readyState, status: this.status })
                    }
                })
            }
            return originalXHROpen.call(this, method, url, async, username, password)
        }

        // Сохраняем ссылки на перехватчики XHR
        xhrInterceptorRef.current = {
            open: originalXHROpen,
            send: originalXHRSend
        }
        console.log('[TelegramWidget] 🔧 XMLHttpRequest перехвачен')

        // Перехватываем postMessage события (виджет может использовать iframe)
        const messageHandler = (event: MessageEvent) => {
            // Проверяем, что сообщение от Telegram
            if (event.origin === 'https://oauth.telegram.org' ||
                event.origin === 'https://telegram.org' ||
                event.origin.includes('telegram.org')) {
                console.log('[TelegramWidget] 📨 Получен postMessage от Telegram', {
                    origin: event.origin,
                    data: event.data,
                    dataType: typeof event.data
                })

                try {
                    let userData: TelegramUser | null = null

                    // Если данные приходят напрямую
                    if (event.data && typeof event.data === 'object' && event.data.user && event.data.user.id && event.data.user.hash) {
                        console.log('[TelegramWidget] ✅ Данные пользователя найдены в postMessage (прямой объект)')
                        userData = event.data.user as TelegramUser
                    }
                    // Если данные в строке
                    else if (typeof event.data === 'string') {
                        console.log('[TelegramWidget] 🔄 Парсим postMessage как строку')
                        userData = parseUserData(event.data)
                    }
                    // Если данные в объекте (проверяем вложенные структуры)
                    else if (typeof event.data === 'object' && event.data !== null) {
                        // Проверяем, есть ли user в корне
                        if ('user' in event.data && event.data.user) {
                            const user = (event.data as { user?: TelegramUser }).user
                            if (user && user.id && user.hash) {
                                console.log('[TelegramWidget] ✅ Данные пользователя найдены в postMessage (вложенный объект)')
                                userData = user
                            }
                        }
                    }

                    if (userData && !callbackCalledRef.current) {
                        console.log('[TelegramWidget] ⏱️ Устанавливаем таймаут 500ms для вызова callback (postMessage fallback)')
                        timeoutRef.current = setTimeout(() => {
                            if (!callbackCalledRef.current) {
                                console.log('[TelegramWidget] ⏰ Таймаут истек (postMessage), виджет не вызвал callback, вызываем вручную')
                                triggerCallback(userData, 'postMessage interceptor timeout')
                            } else {
                                console.log('[TelegramWidget] ✅ Callback уже был вызван виджетом (postMessage), таймаут отменен')
                            }
                        }, 500)
                    } else if (callbackCalledRef.current) {
                        console.log('[TelegramWidget] ℹ️ Callback уже был вызван (postMessage), пропускаем')
                    } else {
                        console.log('[TelegramWidget] ⚠️ Не удалось извлечь данные пользователя из postMessage')
                    }
                } catch (error) {
                    console.log('[TelegramWidget] ❌ Ошибка обработки postMessage:', error)
                }
            }
        }

        messageHandlerRef.current = messageHandler
        window.addEventListener('message', messageHandler)
        console.log('[TelegramWidget] 🔧 Добавлен обработчик postMessage')

        // Периодическая проверка наличия данных в DOM (fallback)
        checkIntervalRef.current = setInterval(() => {
            if (!callbackCalledRef.current && container) {
                // Проверяем, есть ли изменения в виджете (например, текст "проверка данных")
                const widgetText = container.textContent || ''
                if (widgetText.includes('проверка') || widgetText.includes('проверка данных')) {
                    console.log('[TelegramWidget] 🔍 Обнаружен текст "проверка данных" в виджете, возможно авторизация в процессе')
                }

                // Проверяем наличие iframe от Telegram
                const iframes = container.querySelectorAll('iframe')
                iframes.forEach((iframe, index) => {
                    if (iframe.src.includes('telegram.org') || iframe.src.includes('oauth.telegram.org')) {
                        console.log(`[TelegramWidget] 🔍 Найден iframe от Telegram #${index}:`, iframe.src)
                    }
                })
            } else if (callbackCalledRef.current) {
                // Если callback уже вызван, останавливаем проверку
                if (checkIntervalRef.current) {
                    clearInterval(checkIntervalRef.current)
                    checkIntervalRef.current = null
                    console.log('[TelegramWidget] 🧹 Остановлена периодическая проверка (callback вызван)')
                }
            }
        }, 1000) // Проверяем каждую секунду
        console.log('[TelegramWidget] 🔧 Запущена периодическая проверка DOM')

        // Очищаем контейнер перед созданием нового виджета
        container.innerHTML = ''
        console.log('[TelegramWidget] 🧹 Контейнер очищен')

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

        console.log('[TelegramWidget] 📝 Создан script тег виджета', {
            botName,
            size,
            requestAccess,
            usePic,
            cornerRadius,
            lang
        })

        // Добавляем script тег в контейнер
        container.appendChild(widgetScript)
        console.log('[TelegramWidget] ✅ Виджет добавлен в DOM')

        return () => {
            console.log('[TelegramWidget] 🧹 Cleanup: размонтирование компонента')

            // Очистка при размонтировании
            if (container) {
                container.innerHTML = ''
                console.log('[TelegramWidget] 🧹 Контейнер очищен')
            }

            // Очищаем таймаут
            if (timeoutRef.current) {
                clearTimeout(timeoutRef.current)
                timeoutRef.current = null
                console.log('[TelegramWidget] 🧹 Таймаут очищен')
            }

            // Восстанавливаем оригинальный fetch
            if (fetchInterceptorRef.current && window.fetch === fetchInterceptorRef.current && originalFetchRef.current) {
                window.fetch = originalFetchRef.current
                console.log('[TelegramWidget] 🔧 Оригинальный fetch восстановлен')
            }
            fetchInterceptorRef.current = null
            originalFetchRef.current = null

            // Восстанавливаем оригинальный XMLHttpRequest
            if (xhrInterceptorRef.current) {
                try {
                    window.XMLHttpRequest.prototype.open = xhrInterceptorRef.current.open
                    console.log('[TelegramWidget] 🔧 Оригинальный XMLHttpRequest восстановлен')
                } catch (error) {
                    console.log('[TelegramWidget] ⚠️ Ошибка восстановления XMLHttpRequest:', error)
                }
                xhrInterceptorRef.current = null
            }

            // Удаляем обработчик postMessage
            if (messageHandlerRef.current) {
                window.removeEventListener('message', messageHandlerRef.current)
                console.log('[TelegramWidget] 🔧 Обработчик postMessage удален')
                messageHandlerRef.current = null
            }

            // Останавливаем периодическую проверку
            if (checkIntervalRef.current) {
                clearInterval(checkIntervalRef.current)
                checkIntervalRef.current = null
                console.log('[TelegramWidget] 🔧 Периодическая проверка остановлена')
            }

            callbackCalledRef.current = false
            console.log('[TelegramWidget] ✅ Cleanup завершен')
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

