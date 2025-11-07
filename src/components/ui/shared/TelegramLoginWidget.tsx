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
            console.error('Failed to load Telegram Widget script')
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
            console.warn('TelegramLoginWidget: onAuth callback is required')
            return
        }

        // Устанавливаем глобальный обработчик для callback
        window.onTelegramAuth = (user: TelegramUser) => {
            onAuth(user)
        }

        // Очищаем контейнер перед созданием нового виджета
        container.innerHTML = ''

        // Создаем виджет через data-атрибуты (официальный способ Telegram)
        const widget = document.createElement('div')
        widget.setAttribute('data-telegram-login', botName)
        widget.setAttribute('data-size', size)

        if (requestAccess) {
            widget.setAttribute('data-request-access', 'write')
        }

        widget.setAttribute('data-userpic', usePic ? '1' : '0')
        widget.setAttribute('data-radius', cornerRadius.toString())
        widget.setAttribute('data-lang', lang)
        widget.setAttribute('data-onauth', 'onTelegramAuth(user)')

        // Устанавливаем origin для проверки подлинности
        const origin = typeof window !== 'undefined' ? window.location.origin : ''
        widget.setAttribute('data-auth-url', origin)

        container.appendChild(widget)
        console.log('Widget div appended to container:', botName)

        // Telegram скрипт автоматически инициализирует виджеты при загрузке страницы
        // Для динамически созданных элементов скрипт может не найти их автоматически
        // Проверяем через таймаут и если виджет не инициализирован, создаем iframe вручную

        const initTimeout = setTimeout(() => {
            const widgetElement = container.querySelector('[data-telegram-login]')
            if (widgetElement) {
                console.log('Checking widget initialization for:', botName)

                // Проверяем, создал ли скрипт iframe внутри виджета
                const iframe = widgetElement.querySelector('iframe')
                const allIframes = container.querySelectorAll('iframe')

                console.log('Found iframes in container:', allIframes.length)

                if (!iframe && allIframes.length === 0) {
                    console.log('Widget not initialized by script, creating iframe manually')

                    // Создаем iframe напрямую используя официальный URL Telegram OAuth
                    // Формат: https://oauth.telegram.org/auth?bot_id=BOT_USERNAME&...
                    const params = new URLSearchParams()
                    params.append('origin', origin)
                    params.append('size', size)
                    if (requestAccess) {
                        params.append('request_access', 'write')
                    }
                    params.append('userpic', usePic ? '1' : '0')
                    params.append('radius', cornerRadius.toString())
                    params.append('lang', lang)

                    const manualIframe = document.createElement('iframe')
                    // Используем bot username напрямую в URL
                    manualIframe.src = `https://oauth.telegram.org/auth?bot_id=${encodeURIComponent(botName)}&${params.toString()}`
                    manualIframe.frameBorder = '0'
                    manualIframe.scrolling = 'no'
                    manualIframe.width = size === 'large' ? '280' : size === 'medium' ? '240' : '200'
                    manualIframe.height = size === 'large' ? '60' : size === 'medium' ? '50' : '40'
                    manualIframe.style.border = 'none'
                    manualIframe.style.overflow = 'hidden'
                    manualIframe.style.display = 'block'

                    // Очищаем контейнер и добавляем iframe
                    container.innerHTML = ''
                    container.appendChild(manualIframe)

                    console.log('Created iframe manually with src:', manualIframe.src)
                } else {
                    console.log('Widget iframe found, widget is initialized')
                }
            }
        }, 1000)

        return () => {
            clearTimeout(initTimeout)
            // Очистка при размонтировании
            if (container) {
                container.innerHTML = ''
            }
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

