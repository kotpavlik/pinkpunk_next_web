'use client'

import { useEffect, useState } from 'react'
import { tokenManager, TokenEventType } from '@/utils/TokenManager'
import { useRouter } from 'next/navigation'

type NotificationSeverity = 'info' | 'warning' | 'error'

interface Notification {
    id: string
    type: TokenEventType
    severity: NotificationSeverity
    title: string
    message: string
    showRelogin?: boolean
}

/**
 * Компонент для обработки событий токенов
 * Показывает красивые уведомления вместо агрессивных alert()
 * и предлагает повторную авторизацию вместо принудительного reload
 */
export default function TokenEventHandler() {
    const router = useRouter()
    const [notifications, setNotifications] = useState<Notification[]>([])

    useEffect(() => {
        const unsubscribe = tokenManager.addEventListener((event: TokenEventType) => {
            console.log('📬 Token event received:', event)

            const notification = createNotification(event)
            if (notification) {
                setNotifications(prev => [...prev, notification])

                // Автоматически убираем уведомление через 10 секунд (кроме критических)
                if (notification.severity !== 'error') {
                    setTimeout(() => {
                        removeNotification(notification.id)
                    }, 10000)
                }
            }
        })

        return () => unsubscribe()
    }, [])

    const createNotification = (event: TokenEventType): Notification | null => {
        const id = `${event}-${Date.now()}`

        switch (event) {
            case 'TOKEN_REFRESHED':
                // Не показываем уведомление - это должно происходить незаметно для пользователя
                console.log('✅ Token refreshed silently');
                return null;

            case 'TOKEN_REFRESH_FAILED':
                // Тоже не показываем - система сама retry сделает
                console.log('⚠️ Token refresh failed, retrying...');
                return null;

            case 'NETWORK_ERROR':
                // Показываем только при длительных проблемах
                return {
                    id,
                    type: event,
                    severity: 'warning',
                    title: 'Нет подключения',
                    message: 'Проверьте интернет-соединение',
                    showRelogin: false
                }

            case 'SESSION_EXPIRED':
                return {
                    id,
                    type: event,
                    severity: 'error',
                    title: 'Сессия истекла',
                    message: 'Ваша сессия истекла. Пожалуйста, авторизуйтесь заново для продолжения работы.',
                    showRelogin: true
                }

            case 'TELEGRAM_AUTH_EXPIRED':
                return {
                    id,
                    type: event,
                    severity: 'error',
                    title: 'Требуется повторная авторизация',
                    message: 'Авторизация Telegram истекла (15 дней). Пожалуйста, войдите заново через Telegram.',
                    showRelogin: true
                }

            case 'TOKEN_EXPIRED':
                return {
                    id,
                    type: event,
                    severity: 'error',
                    title: 'Сессия завершена',
                    message: 'Пожалуйста, авторизуйтесь заново',
                    showRelogin: true
                }

            default:
                return null
        }
    }

    const removeNotification = (id: string) => {
        setNotifications(prev => prev.filter(n => n.id !== id))
    }

    const handleRelogin = () => {
        // Очищаем токены
        tokenManager.clearTokens()
        
        // Перенаправляем на главную страницу
        router.push('/')
        
        // Обновляем страницу для сброса состояния
        setTimeout(() => {
            window.location.reload()
        }, 100)
    }

    const getSeverityStyles = (severity: NotificationSeverity): string => {
        switch (severity) {
            case 'info':
                return 'bg-blue-500/90 border-blue-400'
            case 'warning':
                return 'bg-yellow-500/90 border-yellow-400'
            case 'error':
                return 'bg-red-500/90 border-red-400'
            default:
                return 'bg-gray-500/90 border-gray-400'
        }
    }

    const getSeverityIcon = (severity: NotificationSeverity): string => {
        switch (severity) {
            case 'info':
                return 'ℹ️'
            case 'warning':
                return '⚠️'
            case 'error':
                return '🚨'
            default:
                return '📢'
        }
    }

    if (notifications.length === 0) return null

    return (
        <div className="fixed top-4 right-4 z-[9999] flex flex-col gap-3 max-w-md">
            {notifications.map(notification => (
                <div
                    key={notification.id}
                    className={`${getSeverityStyles(notification.severity)} border-2 rounded-lg shadow-lg backdrop-blur-md p-4 animate-slideDown`}
                >
                    <div className="flex items-start gap-3">
                        <span className="text-2xl flex-shrink-0">
                            {getSeverityIcon(notification.severity)}
                        </span>
                        <div className="flex-1 min-w-0">
                            <h3 className="font-semibold text-white mb-1">
                                {notification.title}
                            </h3>
                            <p className="text-white/90 text-sm leading-relaxed">
                                {notification.message}
                            </p>
                            <div className="flex gap-2 mt-3">
                                {notification.showRelogin && (
                                    <button
                                        onClick={handleRelogin}
                                        className="px-4 py-2 bg-white text-gray-900 rounded-md font-medium hover:bg-white/90 transition-colors text-sm"
                                    >
                                        Войти заново
                                    </button>
                                )}
                                <button
                                    onClick={() => removeNotification(notification.id)}
                                    className="px-4 py-2 bg-white/20 text-white rounded-md hover:bg-white/30 transition-colors text-sm"
                                >
                                    Закрыть
                                </button>
                            </div>
                        </div>
                    </div>
                </div>
            ))}
        </div>
    )
}

