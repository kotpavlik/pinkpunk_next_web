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

type WidgetStatus = 'loading' | 'ready' | 'error'

const TELEGRAM_WIDGET_SRC = 'https://telegram.org/js/telegram-widget.js?22'
const MAX_RENDER_ATTEMPTS = 3

declare global {
    interface Window {
        TelegramLoginWidget?: {
            dataOnauth: (user: TelegramUser) => void
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
    const onAuthRef = useRef<typeof onAuth>(onAuth)
    const [status, setStatus] = useState<WidgetStatus>('loading')
    const [attempt, setAttempt] = useState(0)

    useEffect(() => {
        onAuthRef.current = onAuth
    }, [onAuth])

    useEffect(() => {
        if (!containerRef.current) return

        const container = containerRef.current

        // Если нет callback, не создаем виджет
        if (!onAuthRef.current) return

        let isCancelled = false
        let renderTimeoutId: number | undefined
        let retryTimeoutId: number | undefined

        const hasTelegramWidgetFrame = () => Boolean(
            container.querySelector('iframe') || container.querySelector('button')
        )

        const scheduleRenderCheck = () => {
            renderTimeoutId = window.setTimeout(() => {
                if (isCancelled) return

                if (hasTelegramWidgetFrame()) {
                    setStatus('ready')
                    return
                }

                if (attempt < MAX_RENDER_ATTEMPTS - 1) {
                    setStatus('loading')
                    retryTimeoutId = window.setTimeout(() => {
                        setAttempt(prev => prev + 1)
                    }, 500)
                    return
                }

                setStatus('error')
            }, 5000)
        }

        // Устанавливаем глобальный объект для callback (как в рабочем примере)
        window.TelegramLoginWidget = {
            dataOnauth: (user: TelegramUser) => {
                try {
                    onAuthRef.current?.(user)
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
        widgetScript.src = TELEGRAM_WIDGET_SRC
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

        widgetScript.onload = () => {
            if (isCancelled) return
            scheduleRenderCheck()
        }

        widgetScript.onerror = () => {
            if (isCancelled) return

            if (attempt < MAX_RENDER_ATTEMPTS - 1) {
                retryTimeoutId = window.setTimeout(() => {
                    setAttempt(prev => prev + 1)
                }, 500)
                return
            }

            setStatus('error')
        }

        setStatus('loading')

        // Добавляем script тег в контейнер
        container.appendChild(widgetScript)

        return () => {
            isCancelled = true
            if (renderTimeoutId) {
                window.clearTimeout(renderTimeoutId)
            }
            if (retryTimeoutId) {
                window.clearTimeout(retryTimeoutId)
            }
            if (container) {
                container.innerHTML = ''
            }
        }
    }, [botName, size, requestAccess, usePic, cornerRadius, lang, attempt])

    const handleRetry = () => {
        setStatus('loading')
        setAttempt(prev => prev + 1)
    }

    return (
        <div className={className}>
            <div
                ref={containerRef}
                className="telegram-login-widget flex justify-center"
                style={{ minHeight: '60px', minWidth: '280px' }}
            />
            {status === 'loading' && (
                <p className="mt-2 text-center text-xs text-white/50">
                    Загружаем кнопку Telegram...
                </p>
            )}
            {status === 'error' && (
                <div className="mt-3 rounded-lg border border-[var(--pink-punk)]/50 bg-[var(--pink-punk)]/10 p-3 text-center">
                    <p className="text-xs text-white/70">
                        Кнопка Telegram не загрузилась. Проверьте блокировщик рекламы, VPN или настройки приватности браузера.
                    </p>
                    <button
                        type="button"
                        onClick={handleRetry}
                        className="mt-2 text-xs font-semibold text-[var(--mint-bright)] transition-colors hover:text-white"
                    >
                        Попробовать ещё раз
                    </button>
                </div>
            )}
        </div>
    )
}

