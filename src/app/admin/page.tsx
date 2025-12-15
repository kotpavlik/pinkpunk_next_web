'use client'

import { useEffect, useState, useCallback } from 'react'
import { createPortal } from 'react-dom'
import { Bars3Icon } from '@heroicons/react/24/outline'
import { DotLottieReact } from '@lottiefiles/dotlottie-react'
import AdminAnimation from '@/../public/animations/Admin.json'
import { useUserStore } from '@/zustand/user_store/UserStore'
import { useAdminLoginStore } from '@/zustand/admin_login_store/AdminLoginStore'
import { AdminRouteGuard } from '@/components/ui/admin/AdminRouteGuard'
import AdminHeader from '@/components/ui/admin/AdminHeader'
import AdminCategories from '@/components/ui/admin/AdminCategories'
import { AdminProducts } from '@/components/ui/admin/AdminProducts'
import { AdminWorkWithUserOrders } from '@/components/ui/admin/AdminWorkWithUserOrders'
import { SessionManager } from '@/components/ui/admin/SessionManager'
import AdminUsers from '@/components/ui/admin/AdminUsers'

const tabs = [
    { id: 'categories' as const, label: 'Категории' },
    { id: 'products' as const, label: 'Товары' },
    { id: 'orders' as const, label: 'Заказы' },
    { id: 'sessions' as const, label: 'Сессии' },
    { id: 'users' as const, label: 'Пользователи' },
]

export default function AdminPage() {
    const { user } = useUserStore()
    const { validateToken, isCheckingToken } = useAdminLoginStore()
    const [isInitialized, setIsInitialized] = useState(false)
    const [activeTab, setActiveTab] = useState<'categories' | 'products' | 'orders' | 'sessions' | 'users'>('categories')
    const [isTabModalOpen, setIsTabModalOpen] = useState(false)
    const [isClosing, setIsClosing] = useState(false)
    const [mounted, setMounted] = useState(false)

    useEffect(() => {
        setMounted(true)
    }, [])

    useEffect(() => {
        const checkToken = async () => {
            if (user.token) {
                await validateToken()
            }
            setIsInitialized(true)
        }
        checkToken()
    }, [user.token, validateToken])

    const handleCloseModal = useCallback(() => {
        setIsClosing(true)
        setTimeout(() => {
            setIsTabModalOpen(false)
            setIsClosing(false)
        }, 300)
    }, [])

    useEffect(() => {
        // Блокируем скролл body когда модальное окно открыто
        if (isTabModalOpen) {
            document.body.style.overflow = 'hidden'
        } else {
            document.body.style.overflow = ''
        }

        return () => {
            document.body.style.overflow = ''
        }
    }, [isTabModalOpen])

    // Закрытие по Escape
    useEffect(() => {
        const handleEscape = (e: KeyboardEvent) => {
            if (e.key === 'Escape' && isTabModalOpen) {
                handleCloseModal()
            }
        }

        if (isTabModalOpen) {
            document.addEventListener('keydown', handleEscape)
        }

        return () => {
            document.removeEventListener('keydown', handleEscape)
        }
    }, [isTabModalOpen, handleCloseModal])

    const handleTabSelect = (tabId: 'categories' | 'products' | 'orders' | 'sessions' | 'users') => {
        setActiveTab(tabId)
        handleCloseModal()
    }

    const getActiveTabLabel = () => {
        return tabs.find(tab => tab.id === activeTab)?.label || 'Категории'
    }

    // Если пользователь не авторизован, показываем форму логина
    if (!isInitialized || isCheckingToken) {
        return (
            <div className="flex flex-col justify-center items-center w-full h-screen bg-[#171717]">
                <div className="text-center ">
                    <DotLottieReact
                        data={AdminAnimation}
                        loop
                        autoplay
                        className="w-32 h-32 mx-auto"
                    />
                    <p className="text-[var(--pink-light)] text-sm">Проверка авторизации...</p>
                </div>
            </div>
        )
    }

    return (
        <AdminRouteGuard>
            <div className="relative md:max-w-[80vw] px-4 md:px-0 m-auto">

                <div className='relative z-10  flex flex-col pt-20 mb-20'>
                    <AdminHeader />
                    <div className="container mx-auto  md:px-4 py-4 md:py-6">
                        {/* Кнопка выбора таба на мобилке */}
                        <div className="md:hidden mb-4">
                            <button
                                onClick={() => setIsTabModalOpen(true)}
                                className="w-full flex items-center justify-between px-4 py-3 bg-white/10 backdrop-blur-sm border border-white/20 "
                            >
                                <span className="text-white font-semibold">{getActiveTabLabel()}</span>
                                <Bars3Icon className="h-6 w-6 text-white/70" />
                            </button>
                        </div>

                        {/* Табы на десктопе */}
                        <div className="hidden md:block mb-4 md:mb-6 overflow-x-auto scrollbar-hide">
                            <div className="flex gap-1 md:gap-2 border-b border-white/10 min-w-max md:min-w-0">
                                {tabs.map((tab) => (
                                    <button
                                        key={tab.id}
                                        onClick={() => setActiveTab(tab.id)}
                                        className={`px-3 py-2 md:px-4 md:py-2 text-sm md:text-base font-semibold transition-all whitespace-nowrap ${activeTab === tab.id
                                            ? 'text-[var(--mint-bright)] border-b-2 border-[var(--mint-bright)]'
                                            : 'text-white/50 hover:text-white/80'
                                            }`}
                                    >
                                        {tab.label}
                                    </button>
                                ))}
                            </div>
                        </div>
                        {/* Контент табов */}
                        <div>
                            {activeTab === 'categories' && <AdminCategories />}
                            {activeTab === 'products' && (<AdminProducts onClose={() => { }} />)}
                            {activeTab === 'orders' && <AdminWorkWithUserOrders />}
                            {activeTab === 'sessions' && <SessionManager />}
                            {activeTab === 'users' && <AdminUsers />}
                        </div>
                    </div>
                </div>
            </div>

            {/* Модальное окно выбора табов для мобилки */}
            {mounted && isTabModalOpen && typeof document !== 'undefined' && document.body && createPortal(
                <div
                    className={`fixed inset-0 flex items-end md:items-center justify-center bg-black/60 backdrop-blur-md transition-opacity duration-300 z-50 ${isClosing ? 'opacity-0' : 'opacity-100'}`}
                    onClick={(e) => {
                        if (e.target === e.currentTarget) {
                            handleCloseModal()
                        }
                    }}
                >
                    <div
                        className={`w-full bg-white/5 backdrop-blur-md border-t border-white/10 ${isClosing ? 'slideOutDown' : 'slideInUp'}`}
                        style={{
                            animation: isClosing ? 'slideOutDown 0.3s ease-out forwards' : 'slideInUp 0.3s ease-out forwards'
                        }}
                        onClick={(e) => e.stopPropagation()}
                    >
                        {/* Заголовок */}
                        <div className="px-6 py-4 border-b border-white/10 flex items-center justify-between">
                            <h2 className="text-2xl font-durik font-bold text-[var(--pink-punk)]">Выберите раздел</h2>
                            <button
                                onClick={handleCloseModal}
                                className="relative inline-flex items-center justify-center p-2 rounded-full text-white/50 hover:text-white hover:bg-white/10 backdrop-blur-sm transition-all duration-200"
                                aria-label="Закрыть"
                            >
                                <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M6 18L18 6M6 6l12 12" />
                                </svg>
                            </button>
                        </div>

                        {/* Список табов */}
                        <div className="py-2">
                            {tabs.map((tab) => (
                                <button
                                    key={tab.id}
                                    onClick={() => handleTabSelect(tab.id)}
                                    className={`w-full px-6 py-3 text-left transition-all duration-200 ${activeTab === tab.id
                                        ? 'bg-white/10 text-[var(--mint-bright)]'
                                        : 'text-white/70 hover:bg-white/10 hover:text-white'
                                        }`}
                                >
                                    <div className="flex items-center justify-between">
                                        <span className="font-semibold">{tab.label}</span>
                                        {activeTab === tab.id && (
                                            <svg className="w-5 h-5 text-[var(--mint-bright)]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                                            </svg>
                                        )}
                                    </div>
                                </button>
                            ))}
                        </div>
                    </div>
                </div>,
                document.body
            )}
        </AdminRouteGuard>
    )
}
