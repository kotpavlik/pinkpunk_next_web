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

        // Telegram скрипт автоматически инициализирует виджеты при загрузке страницы
        // Для динамически созданных элементов нужно либо перезагрузить скрипт,
        // либо вызвать событие, которое заставит скрипт пересканировать DOM
        // Или использовать более простой подход - создать script тег с виджетом
        
        // Пробуем вызвать инициализацию через небольшой таймаут
        const initTimeout = setTimeout(() => {
            const widgetElement = container.querySelector('[data-telegram-login]')
            if (widgetElement) {
                console.log('Telegram Login Widget element created:', botName)
                
                // Проверяем, что скрипт загружен
                if (window.Telegram?.Login) {
                    console.log('Telegram Login Widget script is loaded')
                    
                    // Проверяем, создал ли скрипт iframe
                    const iframe = widgetElement.querySelector('iframe')
                    if (!iframe) {
                        console.log('Widget not initialized by script, trying to trigger re-initialization')
                        
                        // Пытаемся вызвать событие, которое заставит скрипт пересканировать
                        // Или создаем новый script тег, который инициализирует виджет
                        const script = document.createElement('script')
                        script.async = true
                        script.src = 'https://telegram.org/js/telegram-widget.js?22'
                        script.setAttribute('data-telegram-login', botName)
                        script.setAttribute('data-size', size)
                        if (requestAccess) {
                            script.setAttribute('data-request-access', 'write')
                        }
                        script.setAttribute('data-userpic', usePic ? '1' : '0')
                        script.setAttribute('data-radius', cornerRadius.toString())
                        script.setAttribute('data-lang', lang)
                        script.setAttribute('data-onauth', 'onTelegramAuth(user)')
                        script.setAttribute('data-auth-url', origin)
                        
                        // Очищаем контейнер и добавляем script
                        container.innerHTML = ''
                        container.appendChild(script)
                        
                        console.log('Created script tag for widget initialization')
                    } else {
                        console.log('Widget iframe found, widget is initialized')
                    }
                } else {
                    console.warn('Telegram Login Widget script not found')
                }
            }
        }, 500)

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

