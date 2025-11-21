'use client'

import { useEffect, useState } from 'react'
import LoginForm from './LoginForm'
import { useUserStore } from '@/zustand/user_store/UserStore'
import { useAdminLoginStore } from '@/zustand/admin_login_store/AdminLoginStore'

const AdminLogin = () => {
    const [isInitialized, setIsInitialized] = useState(false)
    const userData = useUserStore((state) => state.user)
    const { logoutAdmin, validateToken, isCheckingToken } = useAdminLoginStore()
    const isAdmin = useUserStore((state) => state.isAdmin())

    useEffect(() => {
        const checkToken = async () => {
            if (userData.token) {
                await validateToken()
            }
            setIsInitialized(true)
        }
        checkToken()
    }, [userData.token, validateToken])

    // Показываем загрузку пока проверяем токен
    if (!isInitialized || isCheckingToken) {
        return (
            <div className="flex flex-col justify-center items-center w-full h-full">
                <div className="text-center space-y-4">
                    <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-[#affc4e] mx-auto"></div>
                    <p className="text-[#affc4e] text-sm">Проверка авторизации...</p>
                </div>
            </div>
        )
    }

    return (
        <div className="flex flex-col justify-center items-center w-full h-full">
            {isAdmin ? (
                <div className="text-center space-y-4">
                    <h3 className="text-[#affc4e] text-lg font-bold">Вы авторизованы как админ</h3>
                    <p className="text-[#affc4e] text-sm">Добро пожаловать, {userData.username}!</p>
                    <button
                        onClick={async () => {
                            try {
                                await logoutAdmin()
                            } catch {
                                // Silent error handling
                            }
                        }}
                        className="px-4 py-2 bg-[#ff2b9c] text-white rounded hover:bg-[#ff1a8c] transition-colors"
                    >
                        Выйти
                    </button>
                </div>
            ) : userData._id ? (
                <LoginForm _id={userData._id} userId={userData.userId !== null ? String(userData.userId) : null} username={userData.username} />
            ) : (
                <div className="text-center text-white/60">
                    Необходимо авторизоваться через Telegram
                </div>
            )}
        </div>
    )
}

export default AdminLogin

