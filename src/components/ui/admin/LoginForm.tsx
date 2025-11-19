'use client'

import { useState } from 'react'
import { useAdminLoginStore } from '@/zustand/admin_login_store/AdminLoginStore'
import { useAppStore } from '@/zustand/app_store/AppStore'

interface LoginFormProps {
    _id: string
    userId: string | null
    username: string
    onSuccess?: () => void
}

export default function LoginForm({ _id, userId, username, onSuccess }: LoginFormProps) {
    const [password, setPassword] = useState('')
    const [error, setError] = useState<string | null>(null)
    const { loginAdmin } = useAdminLoginStore()
    const { status } = useAppStore()

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault()
        setError(null)

        if (!password.trim()) {
            setError('Введите пароль')
            return
        }

        if (!_id || !userId) {
            setError('Данные пользователя не найдены')
            return
        }

        try {
            await loginAdmin({
                password: password.trim(),
                userData: {
                    userId: String(userId),
                    username: username || '',
                    _id: _id
                }
            })

            // Если успешно, вызываем onSuccess
            if (onSuccess) {
                onSuccess()
            }
        } catch (error) {
            const errorMessage = error instanceof Error ? error.message : 'Ошибка авторизации'
            setError(errorMessage)
        }
    }

    return (
        <form onSubmit={handleSubmit} className="space-y-4">
            {/* Сообщение об ошибке */}
            {error && (
                <div className="p-4 bg-red-500/20 border border-red-500/50 rounded-lg">
                    <p className="text-red-200 text-sm text-center">{error}</p>
                </div>
            )}

            {/* Поле ввода пароля */}
            <div>
                <input
                    type="password"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder="Введите пароль"
                    className="w-full px-4 py-3 bg-white/10 border border-white/20 rounded-lg text-white placeholder-white/50 focus:outline-none focus:border-[var(--pink-punk)] focus:ring-2 focus:ring-[var(--pink-punk)]/50 transition-all"
                    disabled={status === 'loading'}
                    autoFocus
                />
            </div>

            {/* Кнопка отправки */}
            <button
                type="submit"
                disabled={status === 'loading' || !password.trim()}
                className="w-full px-6 py-3 bg-[var(--pink-punk)] text-white font-bold rounded-lg hover:bg-[var(--pink-dark)] transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed"
            >
                {status === 'loading' ? 'Авторизация...' : 'Войти'}
            </button>
        </form>
    )
}

