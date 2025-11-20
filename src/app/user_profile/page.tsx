'use client'

import { useEffect, useState, useCallback } from 'react'
import { useRouter } from 'next/navigation'
import Image from 'next/image'
import { useUserStore } from '@/zustand/user_store/UserStore'
import { useOrderStore } from '@/zustand/order_store/OrderStore'
import { UserIcon, XMarkIcon, CalendarIcon, PhoneIcon, MapPinIcon, PencilIcon, ShoppingBagIcon } from '@heroicons/react/24/outline'
import { CheckBadgeIcon as CheckBadgeIconSolid } from '@heroicons/react/24/solid'
import ContactInfoModal from '@/components/ui/shared/ContactInfoModal'
import Loader from '@/components/ui/shared/Loader'
import { OrderCard } from '@/components/ui/shared/OrderCard'
import { tokenManager } from '@/utils/TokenManager'
import TelegramLoginModal from '@/components/ui/shared/TelegramLoginModal'

export default function UserProfile() {
    const router = useRouter()
    const { user, clearToken } = useUserStore()
    const { orders, isLoading: ordersLoading, error: ordersError, getMyOrders } = useOrderStore()
    const [isMounted, setIsMounted] = useState(false)
    const [isInitialLoad, setIsInitialLoad] = useState(true)
    const [imageError, setImageError] = useState(false)
    const [isPhoneModalOpen, setIsPhoneModalOpen] = useState(false)
    const [isAddressModalOpen, setIsAddressModalOpen] = useState(false)
    const [isLogoutModalOpen, setIsLogoutModalOpen] = useState(false)
    const [hasLoaded, setHasLoaded] = useState(false)
    const [isLoginModalOpen, setIsLoginModalOpen] = useState(false)
    const [isCheckingToken, setIsCheckingToken] = useState(true)

    // Эффект для проверки и обновления токенов при загрузке страницы
    useEffect(() => {
        const checkAndRefreshTokens = async () => {
            setIsCheckingToken(true)

            console.log('🔍 User profile: checking tokens...');

            try {
                // Если пользователь не авторизован, перенаправляем на главную
                if (!user.userId) {
                    console.log('❌ No userId, redirecting to home');
                    router.push('/')
                    return
                }

                // Проверяем наличие токенов (accessToken или refreshToken)
                const hasTokens = tokenManager.isAuthenticated();

                if (!hasTokens) {
                    console.log('❌ No tokens at all, showing login modal');
                    setIsLoginModalOpen(true)
                    return
                }

                // Пытаемся получить валидный access token
                // getAccessToken() автоматически обновит токен если нужно
                try {
                    const token = await tokenManager.getAccessToken();

                    if (token) {
                        console.log('✅ Got valid access token');
                        // Все ОК, токен есть и валиден
                    } else {
                        // Токен не удалось получить даже после refresh
                        // Возможно, refresh token тоже истек
                        console.log('⚠️ Could not get access token, checking if refresh token exists');

                        if (!tokenManager.getRefreshToken()) {
                            console.log('❌ No refresh token, showing login modal');
                            setIsLoginModalOpen(true)
                        } else {
                            // Refresh token есть, но почему-то не удалось получить access token
                            // Возможно, временная проблема - не показываем модалку
                            console.log('⚠️ Refresh token exists but getAccessToken failed - might be temporary');
                        }
                    }
                } catch (error) {
                    console.error('⚠️ Error getting access token:', error);
                    // При ошибке проверяем, есть ли refresh token
                    if (!tokenManager.getRefreshToken()) {
                        console.log('❌ No refresh token after error, showing login modal');
                        setIsLoginModalOpen(true)
                    } else {
                        console.log('⚠️ Error but refresh token exists - not showing modal');
                    }
                }
            } finally {
                setIsCheckingToken(false)
            }
        }

        setIsMounted(true)
        checkAndRefreshTokens()
    }, [user.userId, router])

    // Эффект для завершения инициализации после проверки токенов
    useEffect(() => {
        if (!isCheckingToken && user.userId) {
            // Завершаем инициализацию после небольшой задержки для плавности
            setTimeout(() => {
                setIsInitialLoad(false)
            }, 300)
        }
    }, [isCheckingToken, user.userId])

    // Эффект для закрытия модалки авторизации после успешного логина
    useEffect(() => {
        if (isLoginModalOpen && tokenManager.isAuthenticated() && user._id) {
            // Если пользователь успешно авторизовался, закрываем модалку
            setIsLoginModalOpen(false)
        }
    }, [isLoginModalOpen, user._id])

    // Отдельный эффект для загрузки заказов - срабатывает когда user._id становится доступным
    useEffect(() => {
        // Загружаем заказы пользователя только если:
        // 1. Пользователь авторизован (user.userId есть)
        // 2. user._id доступен
        // 3. Еще не загружали заказы (!hasLoaded)
        if (user.userId && user._id && !hasLoaded) {
            const userId = user._id
            getMyOrders(userId).then(() => {
                setHasLoaded(true)
            }).catch(() => {
                // Ошибка загрузки заказов
            })
        }
    }, [user._id, user.userId, hasLoaded, getMyOrders])

    const handleRefresh = useCallback(() => {
        if (user._id) {
            getMyOrders(user._id).catch(() => {
                // Ошибка обновления заказов
            })
        }
    }, [user._id, getMyOrders])


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
        <div className="relative min-h-screen pt-20 pb-20 px-4 md:px-6 lg:px-8">
            {/* Loader только при первой загрузке страницы */}
            {isInitialLoad && (
                <div className="fixed inset-0 z-[9998] flex items-center justify-center bg-black/60 backdrop-blur-sm">
                    <Loader fullScreen showText />
                </div>
            )}

            <div className="max-w-7xl mx-auto">
                {/* Заголовок страницы с кнопкой выхода */}
                <div className="flex justify-between items-center mb-6">
                    <h1 className="text-3xl md:text-4xl font-bold font-durik text-[var(--pink-punk)] uppercase">
                        Профиль
                    </h1>
                    <button
                        onClick={handleLogoutClick}
                        className="px-6 py-2.5 bg-[#12c998] hover:bg-[#0fa87a] text-white font-bold rounded-xl transition-all uppercase text-sm duration-200 shadow-lg hover:shadow-xl transform hover:scale-105"
                    >
                        Выйти
                    </button>
                </div>

                {/* Основной контент в grid layout */}
                <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 md:gap-6">
                    {/* Левая колонка - Профиль и основная информация */}
                    <div className="lg:col-span-1 space-y-4 md:space-y-6">
                        {/* Карточка профиля - компактная */}
                        <div className="bg-white/5 backdrop-blur-md rounded-xl border border-white/10 p-5 shadow-xl hover:shadow-2xl transition-shadow">
                            <div className="flex flex-col items-center text-center">
                                {/* Аватар */}
                                <div className="relative mb-4">
                                    {isMounted && (user.photoUrl || user.photo_url) && !imageError ? (
                                        <div className="relative h-24 w-24 md:h-28 md:w-28 rounded-full overflow-hidden border-2 border-[var(--pink-punk)] shadow-lg">
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
                                        <div className="h-24 w-24 md:h-28 md:w-28 rounded-full bg-white/10 border-2 border-[var(--pink-punk)] flex items-center justify-center">
                                            <UserIcon className="h-12 w-12 md:h-14 md:w-14 text-white/50" />
                                        </div>
                                    )}
                                    {/* Бейдж премиум */}
                                    {user.isPremium && (
                                        <div className="absolute -bottom-1 -right-1 bg-gradient-to-r from-[var(--pink-punk)] to-[var(--pink-dark)] rounded-full p-1.5 shadow-lg">
                                            <CheckBadgeIconSolid className="h-4 w-4 text-white" />
                                        </div>
                                    )}
                                </div>

                                {/* Основная информация */}
                                <h2 className="text-xl md:text-2xl font-bold text-white mb-1">
                                    {user.firstName && user.lastName
                                        ? `${user.firstName} ${user.lastName}`
                                        : user.firstName || user.username || 'Пользователь'}
                                </h2>
                                {user.username && (
                                    <p className="text-white/70 text-sm mb-1">
                                        @{user.username}
                                    </p>
                                )}
                                {user.userId && (
                                    <p className="text-white/50 text-xs">
                                        ID: {user.userId}
                                    </p>
                                )}
                            </div>
                        </div>

                        {/* Активность - компактная карточка */}
                        <div className="bg-white/5 backdrop-blur-md rounded-xl border border-white/10 p-4 shadow-xl">
                            <h3 className="text-base font-bold text-white mb-3 flex items-center gap-2">
                                <CalendarIcon className="h-4 w-4 text-[var(--pink-punk)]" />
                                Активность
                            </h3>
                            <div>
                                <span className="text-white/60 text-xs block mb-1">Последняя активность</span>
                                <p className="text-white font-semibold text-sm">
                                    {formatDate(user.lastActivity)}
                                </p>
                            </div>
                        </div>
                    </div>

                    {/* Правая колонка - Контактная информация и адрес */}
                    <div className="lg:col-span-2 space-y-4 md:space-y-6">
                        {/* Контактная информация */}
                        <div className="bg-white/5 backdrop-blur-md rounded-xl border border-white/10 p-5 shadow-xl">
                            <div className="flex items-center justify-between mb-4">
                                <h3 className="text-lg font-bold text-white flex items-center gap-2">
                                    <PhoneIcon className="h-5 w-5 text-[#16ffbd]" />
                                    Контактная информация
                                </h3>
                                {user.userPhoneNumber && (
                                    <button
                                        onClick={() => setIsPhoneModalOpen(true)}
                                        className="text-[#16ffbd] hover:text-[#12c998] transition-colors p-1.5 rounded-lg hover:bg-white/10"
                                        aria-label="Редактировать телефон"
                                        title={user.userPhoneNumber}
                                    >
                                        <PencilIcon className="h-4 w-4" />
                                    </button>
                                )}
                            </div>
                            {user.userPhoneNumber ? (
                                <div className="flex items-center gap-3">
                                    <div className="p-2 bg-[#16ffbd]/10 rounded-lg">
                                        <PhoneIcon className="h-5 w-5 text-[#16ffbd]" />
                                    </div>
                                    <p className="text-white font-semibold">{user.userPhoneNumber}</p>
                                </div>
                            ) : (
                                <button
                                    onClick={() => setIsPhoneModalOpen(true)}
                                    className="w-full px-4 py-3 bg-white/10 hover:bg-white/20 border border-white/20 rounded-lg text-white/70 hover:text-white transition-all text-sm font-medium flex items-center justify-center gap-2"
                                >
                                    <PhoneIcon className="h-4 w-4" />
                                    Добавить номер телефона
                                </button>
                            )}
                        </div>

                        {/* Адрес доставки */}
                        <div className="bg-white/5 backdrop-blur-md rounded-xl border border-white/10 p-5 shadow-xl">
                            <div className="flex items-center justify-between mb-4">
                                <h3 className="text-lg font-bold text-white flex items-center gap-2">
                                    <MapPinIcon className="h-5 w-5 text-[var(--pink-punk)]" />
                                    Адрес доставки
                                </h3>
                                {user.shippingAddress && (
                                    <button
                                        onClick={() => setIsAddressModalOpen(true)}
                                        className="text-[var(--pink-punk)] hover:text-[var(--pink-dark)] transition-colors p-1.5 rounded-lg hover:bg-white/10"
                                        aria-label="Редактировать адрес"
                                    >
                                        <PencilIcon className="h-4 w-4" />
                                    </button>
                                )}
                            </div>
                            {user.shippingAddress ? (
                                <div className="space-y-2">
                                    <div className="flex items-start gap-3">
                                        <div className="p-2 bg-[var(--pink-punk)]/10 rounded-lg mt-0.5">
                                            <MapPinIcon className="h-4 w-4 text-[var(--pink-punk)]" />
                                        </div>
                                        <div className="flex-1 space-y-1.5 text-sm">
                                            <p className="text-white font-semibold">{user.shippingAddress.fullName}</p>
                                            <p className="text-white/80">{user.shippingAddress.phone}</p>
                                            <p className="text-white/80">{user.shippingAddress.address}</p>
                                            <p className="text-white/80">
                                                {user.shippingAddress.city}, {user.shippingAddress.postalCode}
                                            </p>
                                            <p className="text-white/80">{user.shippingAddress.country}</p>
                                            {user.shippingAddress.notes && (
                                                <p className="text-white/60 italic mt-2 text-xs">
                                                    Примечание: {user.shippingAddress.notes}
                                                </p>
                                            )}
                                        </div>
                                    </div>
                                </div>
                            ) : (
                                <button
                                    onClick={() => setIsAddressModalOpen(true)}
                                    className="w-full px-4 py-3 bg-white/10 hover:bg-white/20 border border-white/20 rounded-lg text-white/70 hover:text-white transition-all text-sm font-medium flex items-center justify-center gap-2"
                                >
                                    <MapPinIcon className="h-4 w-4" />
                                    Добавить адрес доставки
                                </button>
                            )}
                        </div>
                    </div>
                </div>

                {/* Секция заказов - на всю ширину */}
                <div className="mt-6 bg-white/5 backdrop-blur-md rounded-xl border border-white/10 p-5 shadow-xl">
                    <div className="flex justify-between items-center mb-5">
                        <div className='flex items-center gap-3'>
                            <div className="p-2 bg-[var(--pink-punk)]/10 rounded-lg">
                                <ShoppingBagIcon className="h-5 w-5 text-[var(--pink-punk)]" />
                            </div>
                            <div>
                                <h3 className="text-[var(--pink-punk)] font-bold flex items-center gap-2 text-lg">
                                    Мои заказы
                                </h3>
                                <p className="text-white/60 text-xs mt-0.5">
                                    Всего заказов: {orders.length}
                                </p>
                            </div>
                        </div>
                        {/* Кнопка обновления */}
                        <button
                            onClick={handleRefresh}
                            disabled={ordersLoading}
                            className="p-2 bg-[var(--mint-bright)] text-black rounded-lg transition-all disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center hover:scale-105"
                            title={ordersLoading ? 'Загрузка...' : 'Обновить заказы'}
                        >
                            {ordersLoading ? (
                                <svg
                                    className="w-5 h-5 animate-spin"
                                    fill="none"
                                    viewBox="0 0 24 24"
                                >
                                    <circle
                                        className="opacity-25"
                                        cx="12"
                                        cy="12"
                                        r="10"
                                        stroke="currentColor"
                                        strokeWidth="4"
                                    />
                                    <path
                                        className="opacity-75"
                                        fill="currentColor"
                                        d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
                                    />
                                </svg>
                            ) : (
                                <svg
                                    className="w-5 h-5"
                                    fill="none"
                                    stroke="currentColor"
                                    viewBox="0 0 24 24"
                                >
                                    <path
                                        strokeLinecap="round"
                                        strokeLinejoin="round"
                                        strokeWidth={2}
                                        d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15"
                                    />
                                </svg>
                            )}
                        </button>
                    </div>

                    {/* Загрузка */}
                    {ordersLoading && (
                        <div className="flex justify-center items-center py-8">
                            <Loader size="md" />
                        </div>
                    )}

                    {/* Ошибка */}
                    {ordersError && !ordersLoading && (
                        <div className="bg-red-500/10 border border-red-500 rounded-lg p-4 text-red-400">
                            <p className="font-semibold">Ошибка загрузки заказов</p>
                            <p className="text-sm">{ordersError}</p>
                        </div>
                    )}

                    {/* Список заказов */}
                    {!ordersLoading && !ordersError && orders.length > 0 && (
                        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                            {orders.map((order) => (
                                <OrderCard
                                    key={order._id}
                                    order={order}
                                    onDeleted={() => {
                                        // OrderStore уже обновил состояние после удаления,
                                        // поэтому дополнительный запрос не нужен
                                    }}
                                />
                            ))}
                        </div>
                    )}

                    {/* Пустое состояние */}
                    {!ordersLoading && !ordersError && orders.length === 0 && hasLoaded && (
                        <div className="text-center py-12">
                            <div className="inline-block p-4 bg-white/5 rounded-full mb-4">
                                <ShoppingBagIcon className="h-12 w-12 text-white/30" />
                            </div>
                            <p className="text-white/80 font-semibold text-base mb-2">У вас пока нет заказов</p>
                            <p className="text-white/50 text-sm">
                                Оформите первый заказ в нашем магазине!
                            </p>
                        </div>
                    )}
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

            {/* Модалка авторизации при истечении токена */}
            {isLoginModalOpen && (
                <TelegramLoginModal
                    isOpen={isLoginModalOpen}
                    onClose={() => {
                        setIsLoginModalOpen(false)
                        // Если пользователь закрыл модалку без авторизации, перенаправляем на главную
                        if (!tokenManager.isAuthenticated()) {
                            router.push('/')
                        }
                    }}
                />
            )}

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
