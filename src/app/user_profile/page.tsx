'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import Image from 'next/image'
import { useUserStore } from '@/zustand/user_store/UserStore'
import { UserIcon, XMarkIcon, CalendarIcon, PhoneIcon, MapPinIcon, PencilIcon } from '@heroicons/react/24/outline'
import { CheckBadgeIcon as CheckBadgeIconSolid } from '@heroicons/react/24/solid'
import ContactInfoModal from '@/components/ui/shared/ContactInfoModal'

export default function UserProfile() {
    const router = useRouter()
    const { user, clearToken } = useUserStore()
    const [isMounted, setIsMounted] = useState(false)
    const [imageError, setImageError] = useState(false)
    const [isPhoneModalOpen, setIsPhoneModalOpen] = useState(false)
    const [isAddressModalOpen, setIsAddressModalOpen] = useState(false)
    const [isLogoutModalOpen, setIsLogoutModalOpen] = useState(false)

    useEffect(() => {
        setIsMounted(true)
        // Если пользователь не авторизован, перенаправляем на главную
        if (!user.userId) {
            router.push('/')
        }
    }, [user.userId, router])

    useEffect(() => {
        setImageError(false)
    }, [user.photoUrl, user.photo_url])

    const handleLogoutClick = () => {
        setIsLogoutModalOpen(true)
    }

    const handleLogoutConfirm = () => {
        clearToken()
        router.push('/')
    }

    if (!isMounted || !user.userId) {
        return null
    }

    const formatDate = (dateString?: string) => {
        if (!dateString) return 'Не указано'
        try {
            const date = new Date(dateString)
            return date.toLocaleDateString('ru-RU', {
                year: 'numeric',
                month: 'long',
                day: 'numeric',
                hour: '2-digit',
                minute: '2-digit'
            })
        } catch {
            return dateString
        }
    }



    return (
        <div className="relative min-h-screen pt-24 pb-20 px-4 md:px-8">
            <div className="max-w-4xl mx-auto">
                <div className="flex justify-between items-end mb-4">
                    {/* Заголовок страницы */}
                    <h1 className="text-4xl md:text-5xl font-bold font-durik text-[var(--pink-punk)] uppercase" style={{ lineHeight: 0.6, display: 'flex', alignItems: 'flex-end' }}>
                        Профиль
                    </h1>
                    {/* Кнопка выхода */}
                    <button
                        onClick={handleLogoutClick}
                        className="px-8 py-3 bg-[#12c998] hover:bg-[#0fa87a] text-white font-bold rounded-2xl transition-all uppercase duration-200 transform shadow-lg"
                    >
                        Выйти
                    </button>
                </div>

                {/* Карточка профиля */}
                <div className="bg-white/5 backdrop-blur-md rounded-2xl border border-white/10 p-6 md:p-8 mb-6 shadow-xl">
                    <div className="flex flex-row  items-start md:items-center gap-6">
                        {/* Аватар */}
                        <div className="relative">
                            {isMounted && (user.photoUrl || user.photo_url) && !imageError ? (
                                <div className="relative h-18 w-18 md:h-32 md:w-32 rounded-full overflow-hidden border-2 border-[var(--pink-punk)] shadow-lg">
                                    <Image
                                        src={user.photoUrl || user.photo_url || ''}
                                        alt={user.firstName || user.username || 'User avatar'}
                                        fill
                                        className="object-cover"
                                        unoptimized
                                        onError={() => setImageError(true)}
                                    />
                                </div>
                            ) : (
                                <div className="h-18 w-18 md:h-32 md:w-32 rounded-full bg-white/10 border-2 border-[var(--pink-punk)] flex items-center justify-center">
                                    <UserIcon className="h-12 w-12 md:h-16 md:w-16 text-white/50" />
                                </div>
                            )}
                            {/* Бейдж премиум */}
                            {user.isPremium && (
                                <div className="absolute -bottom-1 -right-1 md:bottom-1 md:right-1 bg-gradient-to-r from-[var(--pink-punk)] to-[var(--pink-dark)] rounded-full md:p-1.5 p-1 shadow-lg">
                                    <CheckBadgeIconSolid className="h-5 w-5 text-white" />
                                </div>
                            )}
                        </div>

                        {/* Основная информация */}
                        <div className="flex-1">
                            <div className="flex flex-col md:flex-row md:items-center md:gap-3 mb-3">
                                <h2 className="text-2xl md:text-3xl font-bold text-white mb-1 md:mb-0">
                                    {user.firstName && user.lastName
                                        ? `${user.firstName} ${user.lastName}`
                                        : user.firstName || user.username || 'Пользователь'}
                                </h2>
                            </div>
                            {user.username && (
                                <p className="text-white/70 text-sm md:text-base ">
                                    @{user.username}
                                </p>
                            )}
                            {user.userId && (
                                <p className="text-white/50 text-xs md:text-sm">
                                    ID: {user.userId}
                                </p>
                            )}
                        </div>
                    </div>
                </div>

                {/* Детальная информация */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-6">


                    {/* Активность */}
                    <div className="bg-white/5 backdrop-blur-md rounded-2xl border border-white/10 p-6 shadow-xl">
                        <h3 className="text-lg font-bold text-white mb-4 flex items-center gap-2">
                            <CalendarIcon className="h-5 w-5 text-[var(--pink-punk)]" />
                            Активность
                        </h3>
                        <div className="space-y-3">
                            <div>
                                <span className="text-white/70 text-sm">Последняя активность</span>
                                <p className="text-white font-semibold mt-1">
                                    {formatDate(user.lastActivity)}
                                </p>
                            </div>
                        </div>
                    </div>


                    {/* Контактная информация */}
                    <div className="bg-white/5 backdrop-blur-md rounded-2xl border border-white/10 p-6 shadow-xl">
                        <h3 className="text-lg font-bold text-white mb-4 flex items-center gap-2">
                            <PhoneIcon className="h-5 w-5 text-[#16ffbd]" />
                            Контактная информация
                        </h3>
                        <div className="space-y-4">
                            {/* Телефон */}
                            <div>
                                <div className="flex items-center justify-between mb-2">
                                    <span className="text-white/70 text-sm">Номер телефона</span>
                                    {user.userPhoneNumber && (
                                        <button
                                            onClick={() => setIsPhoneModalOpen(true)}
                                            className="text-[#16ffbd] hover:text-[#12c998] transition-colors p-1 rounded hover:bg-white/10"
                                            aria-label="Редактировать телефон"
                                            title={user.userPhoneNumber}
                                        >
                                            <PencilIcon className="h-4 w-4" />
                                        </button>
                                    )}
                                </div>
                                {user.userPhoneNumber ? (
                                    <div className="flex items-center gap-2">

                                        <p className="text-white font-semibold">{user.userPhoneNumber}</p>
                                    </div>
                                ) : (
                                    <button
                                        onClick={() => setIsPhoneModalOpen(true)}
                                        className="w-full px-4 py-2 bg-white/10 hover:bg-white/20 border border-white/20 rounded-lg text-white/70 hover:text-white transition-all text-sm font-medium"
                                    >
                                        + Добавить номер телефона
                                    </button>
                                )}
                            </div>
                        </div>
                    </div>

                    {/* Адрес доставки */}
                    <div className="bg-white/5 backdrop-blur-md rounded-2xl border border-white/10 p-6 shadow-xl">
                        <h3 className="text-lg font-bold text-white mb-4 flex items-center gap-2">
                            <MapPinIcon className="h-5 w-5 text-[var(--pink-punk)]" />
                            Адрес доставки
                        </h3>
                        {user.shippingAddress ? (
                            <div className="space-y-3">
                                <div className="flex items-center justify-between mb-3">
                                    <span className="text-white/70 text-sm">Адрес сохранен</span>
                                    <button
                                        onClick={() => setIsAddressModalOpen(true)}
                                        className="text-[var(--pink-punk)] hover:text-[var(--pink-dark)] transition-colors"
                                        aria-label="Редактировать адрес"
                                    >
                                        <PencilIcon className="h-4 w-4" />
                                    </button>
                                </div>
                                <div className="space-y-2 text-sm">
                                    <p className="text-white font-semibold">{user.shippingAddress.fullName}</p>
                                    <p className="text-white/80">{user.shippingAddress.phone}</p>
                                    <p className="text-white/80">{user.shippingAddress.address}</p>
                                    <p className="text-white/80">
                                        {user.shippingAddress.city}, {user.shippingAddress.postalCode}
                                    </p>
                                    <p className="text-white/80">{user.shippingAddress.country}</p>
                                    {user.shippingAddress.notes && (
                                        <p className="text-white/60 italic mt-2">
                                            Примечание: {user.shippingAddress.notes}
                                        </p>
                                    )}
                                </div>
                            </div>
                        ) : (
                            <button
                                onClick={() => setIsAddressModalOpen(true)}
                                className="w-full px-4 py-2 bg-white/10 hover:bg-white/20 border border-white/20 rounded-lg text-white/70 hover:text-white transition-all text-sm font-medium"
                            >
                                + Добавить адрес доставки
                            </button>
                        )}
                    </div>
                </div>


            </div>

            {/* Модалки */}
            <ContactInfoModal
                isOpen={isPhoneModalOpen}
                onClose={() => setIsPhoneModalOpen(false)}
                type="phone"
            />
            <ContactInfoModal
                isOpen={isAddressModalOpen}
                onClose={() => setIsAddressModalOpen(false)}
                type="address"
            />

            {/* Модалка подтверждения выхода */}
            {isLogoutModalOpen && (
                <div
                    className="fixed inset-0 flex items-center justify-center bg-black/60 backdrop-blur-md transition-opacity duration-300 z-50"
                    onClick={(e) => {
                        if (e.target === e.currentTarget) {
                            setIsLogoutModalOpen(false)
                        }
                    }}
                >
                    <div
                        className="relative bg-gradient-to-br from-white/10 via-white/5 to-white/10 backdrop-blur-2xl rounded-3xl p-6 md:p-8 border border-white/20 shadow-2xl max-w-md w-full mx-4"
                        style={{
                            background: 'linear-gradient(135deg, rgba(255, 255, 255, 0.1) 0%, rgba(255, 255, 255, 0.05) 50%, rgba(255, 255, 255, 0.1) 100%)',
                            backdropFilter: 'blur(30px) saturate(180%)',
                            WebkitBackdropFilter: 'blur(30px) saturate(180%)',
                            boxShadow: '0 20px 60px rgba(0, 0, 0, 0.5), 0 0 0 1px rgba(255, 255, 255, 0.1)',
                        }}
                        onClick={(e) => e.stopPropagation()}
                    >
                        {/* Кнопка закрытия */}
                        <button
                            onClick={() => setIsLogoutModalOpen(false)}
                            className="absolute top-4 right-4 text-white/70 hover:text-white transition-colors"
                            aria-label="Закрыть"
                        >
                            <XMarkIcon className="h-6 w-6" />
                        </button>

                        {/* Заголовок */}
                        <div className="mb-6">
                            <div className="inline-block relative">
                                <h2 className="text-2xl font-bold font-durik text-[var(--pink-punk)] mb-2">
                                    Подтверждение выхода
                                </h2>
                                <div className="h-1 w-full bg-[var(--pink-punk)] absolute bottom-0 left-0"></div>
                            </div>
                        </div>

                        {/* Текст вопроса */}
                        <p className="text-white/80 mb-6 text-center">
                            Вы точно хотите закончить текущую сессию и выйти из аккаунта?
                        </p>

                        {/* Кнопки */}
                        <div className="flex gap-3">
                            <button
                                onClick={() => setIsLogoutModalOpen(false)}
                                className="flex-1 px-4 py-3 bg-white/10 hover:bg-white/20 text-white rounded-lg font-medium transition-all"
                            >
                                Отмена
                            </button>
                            <button
                                onClick={handleLogoutConfirm}
                                className="flex-1 px-4 py-3 bg-[var(--pink-punk)] text-white rounded-lg font-bold transition-all transform hover:bg-[var(--pink-punk)]/90 "
                            >
                                Выйти
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    )
}
