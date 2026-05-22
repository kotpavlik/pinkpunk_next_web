'use client'

import { useEffect, useState, useCallback, useRef } from 'react'
import { useRouter } from 'next/navigation'
import { useUserStore } from '@/zustand/user_store/UserStore'
import { useOrderStore } from '@/zustand/order_store/OrderStore'
import { XMarkIcon, CalendarIcon, PhoneIcon, MapPinIcon, PencilIcon, ShoppingBagIcon } from '@heroicons/react/24/outline'
import { CheckBadgeIcon as CheckBadgeIconSolid } from '@heroicons/react/24/solid'
import ContactInfoModal from '@/components/ui/shared/ContactInfoModal'
import Loader from '@/components/ui/shared/Loader'
import AvatarLoader from '@/components/ui/shared/AvatarLoader'
import { OrderCard } from '@/components/ui/shared/OrderCard'
import { tokenManager } from '@/utils/TokenManager'
import TelegramLoginModal from '@/components/ui/shared/LazyTelegramLoginModal'
import { formatShippingAddress } from '@/utils/formatShippingAddress'
import { storefrontProfileDisplayName } from '@/utils/crmUserDisplayName'
import { UserApi } from '@/api/UserApi'
import { resolveEffectiveDiscountPercent, type LoyaltyStatus } from '@/api/LoyaltyApi'
import LoyaltyStatusBlock, {
    LoyaltyAvatarRing,
    LoyaltyLevelPopout,
    LoyaltyLevelsSection,
    LoyaltyProfileIdentityBlock,
    LoyaltyUserDiscountBadge,
} from '@/components/ui/shared/LoyaltyStatusBlock'
import LoyaltyLevelUpToast from '@/components/ui/shared/LoyaltyLevelUpToast'
import {
    detectLevelUp,
    getLevelTheme,
    readStoredLoyaltyLevelId,
    storeLoyaltyLevelId,
} from '@/utils/loyaltyLevelTheme'

export default function UserProfile() {
    const router = useRouter()
    const { user, clearToken } = useUserStore()
    const { orders, isLoading: ordersLoading, error: ordersError, getMyOrders } = useOrderStore()
    const [isMounted, setIsMounted] = useState(false)
    const [isInitialLoad, setIsInitialLoad] = useState(true)
    const [isPhoneModalOpen, setIsPhoneModalOpen] = useState(false)
    const [isAddressModalOpen, setIsAddressModalOpen] = useState(false)
    const [isLogoutModalOpen, setIsLogoutModalOpen] = useState(false)
    const [hasLoaded, setHasLoaded] = useState(false)
    const [isLoginModalOpen, setIsLoginModalOpen] = useState(false)
    const [isTelegramLinkModalOpen, setIsTelegramLinkModalOpen] = useState(false)
    const [isCheckingToken, setIsCheckingToken] = useState(true)
    const [paymentMessage, setPaymentMessage] = useState<{ type: 'success' | 'error'; title: string; description?: string } | null>(null)
    const hasCheckedPaymentRef = useRef(false)
    const [loyalty, setLoyalty] = useState<LoyaltyStatus | null>(null)
    const [loyaltyLoading, setLoyaltyLoading] = useState(false)
    const [loyaltyError, setLoyaltyError] = useState<string | null>(null)
    const [levelUpToast, setLevelUpToast] = useState<{ levelId: string; apiLabel: string } | null>(null)
    const [levelUpGlow, setLevelUpGlow] = useState<{ levelId: string; seq: number } | null>(null)
    const [loyaltyLevelPopout, setLoyaltyLevelPopout] = useState<string | null>(null)
    const loyaltyCardRef = useRef<HTMLDivElement>(null)

    const loadLoyalty = useCallback(async () => {
        if (!user._id || !tokenManager.isAuthenticated()) return
        setLoyaltyLoading(true)
        setLoyaltyError(null)
        try {
            const data = await UserApi.getLoyalty()
            const prevId = readStoredLoyaltyLevelId()
            const { isNew } = detectLevelUp(prevId, data.level.id)
            if (isNew) {
                setLevelUpToast({ levelId: data.level.id, apiLabel: data.level.label })
                setLevelUpGlow(prev => ({ levelId: data.level.id, seq: (prev?.seq ?? 0) + 1 }))
            }
            storeLoyaltyLevelId(data.level.id)
            setLoyalty(data)
        } catch {
            setLoyaltyError('Не удалось загрузить программу лояльности')
        } finally {
            setLoyaltyLoading(false)
        }
    }, [user._id])

    useEffect(() => {
        if (!paymentMessage) return

        const timeout = window.setTimeout(() => {
            setPaymentMessage(null)
        }, 3000)

        return () => window.clearTimeout(timeout)
    }, [paymentMessage])

    useEffect(() => {
        if (!levelUpGlow) return
        const el = loyaltyCardRef.current
        if (!el) return

        el.style.setProperty('--level-up-glow-color', getLevelTheme(levelUpGlow.levelId).labelColor)
        el.classList.remove('animate-loyalty-level-up-glow')
        void el.offsetWidth
        el.classList.add('animate-loyalty-level-up-glow')

        const onAnimationEnd = (event: AnimationEvent) => {
            if (event.animationName !== 'loyalty-level-up-shadow-pulse') return
            el.classList.remove('animate-loyalty-level-up-glow')
            setLevelUpGlow(null)
        }

        el.addEventListener('animationend', onAnimationEnd)
        return () => el.removeEventListener('animationend', onAnimationEnd)
    }, [levelUpGlow])

    // Эффект для проверки и обновления токенов при загрузке страницы
    useEffect(() => {
        const checkAndRefreshTokens = async () => {
            setIsCheckingToken(true)

            try {
                // Если пользователь не авторизован, перенаправляем на главную
                if (!user._id) {
                    router.push('/')
                    return
                }

                // Проверяем наличие токенов (accessToken или refreshToken)
                const hasTokens = tokenManager.isAuthenticated();

                if (!hasTokens) {
                    setIsLoginModalOpen(true)
                    return
                }

                // Пытаемся получить валидный access token
                // getAccessToken() автоматически обновит токен если нужно
                try {
                    const token = await tokenManager.getAccessToken();

                    if (token) {
                        // Все ОК, токен есть и валиден
                    } else {
                        // Токен не удалось получить даже после refresh
                        // Возможно, refresh token тоже истек
                        if (!tokenManager.getRefreshToken()) {
                            setIsLoginModalOpen(true)
                        }
                    }
                } catch {
                    // При ошибке проверяем, есть ли refresh token
                    if (!tokenManager.getRefreshToken()) {
                        setIsLoginModalOpen(true)
                    }
                }
            } finally {
                setIsCheckingToken(false)
            }
        }

        setIsMounted(true)
        checkAndRefreshTokens()
    }, [user._id, router])

    // Эффект для завершения инициализации после проверки токенов
    useEffect(() => {
        if (!isCheckingToken && user._id) {
            // Завершаем инициализацию после небольшой задержки для плавности
            setTimeout(() => {
                setIsInitialLoad(false)
            }, 300)
        }
    }, [isCheckingToken, user._id])

    // Закрытие модалки только из TelegramLoginModal.onClose после успешного входа; авто‑закрытие при появлении токена ломало SMS‑OTP.

    // Подтверждаем оплату после возврата из Alfa. Сам редирект на профиль не считается оплатой.
    useEffect(() => {
        if (hasCheckedPaymentRef.current) return

        const params = new URLSearchParams(window.location.search)
        const ct = params.get('ct')
        const orderId = params.get('orderId')

        if (!ct || !orderId) {
            return
        }

        hasCheckedPaymentRef.current = true
        window.scrollTo({ top: 0, left: 0, behavior: 'auto' })

        const confirmPayment = async () => {
            try {
                const result = await useOrderStore.getState().updatePaymentStatus(orderId, ct)

                if (result.paid) {
                    setPaymentMessage({
                        type: 'success',
                        title: 'Заказ успешно оплачен',
                        description: result.actionCodeDescription || result.actionCodeMessage,
                    })
                    if (user._id) {
                        await getMyOrders(user._id)
                        setHasLoaded(true)
                        void loadLoyalty()
                    }
                } else {
                    setPaymentMessage({
                        type: 'error',
                        title: result.actionCodeMessage || 'Оплата не подтверждена',
                        description: result.actionCodeDescription,
                    })
                }
            } catch {
                setPaymentMessage({
                    type: 'error',
                    title: 'Не удалось проверить оплату',
                    description: 'Попробуйте обновить список заказов или свяжитесь с менеджером.',
                })
            } finally {
                router.replace('/user_profile', { scroll: true })
            }
        }

        void confirmPayment()
    }, [user._id, getMyOrders, router, loadLoyalty])

    // Отдельный эффект для загрузки заказов - срабатывает когда user._id становится доступным
    useEffect(() => {
        // Загружаем заказы пользователя только если:
        // 1. Пользователь авторизован (есть accountId / _id)
        // 2. user._id доступен
        // 3. Еще не загружали заказы (!hasLoaded)
        if (user._id && !hasLoaded) {
            const userId = user._id
            getMyOrders(userId).then(() => {
                setHasLoaded(true)
            }).catch(() => {
                // Ошибка загрузки заказов
            })
        }
    }, [user._id, hasLoaded, getMyOrders])

    useEffect(() => {
        if (!isCheckingToken && user._id && tokenManager.isAuthenticated()) {
            void loadLoyalty()
        }
    }, [isCheckingToken, user._id, loadLoyalty])

    const handleRefresh = useCallback(() => {
        if (user._id) {
            getMyOrders(user._id).catch(() => {
                // Ошибка обновления заказов
            })
            void loadLoyalty()
        }
    }, [user._id, getMyOrders, loadLoyalty])
    const handleLogoutClick = () => {
        setIsLogoutModalOpen(true)
    }

    const handleLogoutConfirm = () => {
        clearToken()
        router.push('/')
    }

    if (!isMounted || !user._id) {
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

    const profileDisplayName = storefrontProfileDisplayName(user)
    const telegramUsername = user.username?.trim()
    const isTelegramLinked = user.telegramUserId != null && user.telegramUserId !== undefined
    const showZeroDiscountHint =
        !loyaltyLoading &&
        loyalty != null &&
        resolveEffectiveDiscountPercent(loyalty) === 0
    const highlightExplorerCard =
        showZeroDiscountHint && loyalty != null && loyalty.expPoints === 0
    const highlightNextLevelId =
        showZeroDiscountHint && loyalty != null && loyalty.expPoints > 0
            ? loyalty.nextLevel?.id ?? null
            : null

    return (
        <div className="relative min-h-screen pt-20 pb-20 px-4 md:px-6 lg:px-8">
            {/* Loader только при первой загрузке страницы */}
            {isInitialLoad && (
                <div className="fixed inset-0 z-[9998] flex items-center justify-center bg-black/60 backdrop-blur-sm">
                    <Loader fullScreen showText />
                </div>
            )}

            {levelUpToast && (
                <LoyaltyLevelUpToast
                    levelId={levelUpToast.levelId}
                    apiLabel={levelUpToast.apiLabel}
                    onDismiss={() => setLevelUpToast(null)}
                />
            )}

            {paymentMessage && (
                <div className="pointer-events-none fixed inset-0 z-[10000] flex items-center justify-center px-4">
                    <div className={`pointer-events-auto w-full max-w-md border p-5 text-white shadow-2xl backdrop-blur-xl ${paymentMessage.type === 'success'
                        ? 'border-[var(--mint-dark)] bg-black/85'
                        : 'border-[var(--pink-punk)] bg-black/85'
                        }`}>
                        <div className="flex items-start justify-between gap-4">
                            <div>
                                <p className={`font-blauer-nue text-xl font-semibold ${paymentMessage.type === 'success' ? 'text-[var(--mint-bright)]' : 'text-[var(--pink-punk)]'}`}>
                                    {paymentMessage.title}
                                </p>
                                {paymentMessage.description && (
                                    <p className="mt-2 text-sm text-white/70">{paymentMessage.description}</p>
                                )}
                            </div>
                            <button
                                type="button"
                                onClick={() => setPaymentMessage(null)}
                                className="shrink-0 text-white/60 transition-colors hover:text-white"
                                aria-label="Закрыть уведомление"
                            >
                                <XMarkIcon className="h-5 w-5" />
                            </button>
                        </div>
                    </div>
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

                <div className="flex flex-col gap-3 md:gap-4">
                    <div className="grid grid-cols-1 gap-3 md:gap-4 lg:grid-cols-3 lg:items-start">
                        <div className="flex flex-col gap-3 md:gap-4 lg:col-span-1">
                            <div
                                ref={loyaltyCardRef}
                                className="bg-white/5 backdrop-blur-md rounded-xl border border-white/10 p-4 shadow-xl transition-shadow hover:shadow-2xl"
                            >
                                <div className="flex w-full min-w-0 flex-col items-stretch text-center">
                                    <LoyaltyProfileIdentityBlock
                                        status={loyalty}
                                        loading={loyaltyLoading}
                                        onExplorerHintClick={() => {
                                            if (!loyalty) return
                                            if (loyalty.expPoints > 0 && loyalty.nextLevel) {
                                                setLoyaltyLevelPopout(loyalty.nextLevel.id)
                                            } else {
                                                setLoyaltyLevelPopout('explorer')
                                            }
                                        }}
                                    >
                                        <div className="relative shrink-0">
                                            <LoyaltyAvatarRing
                                                levelId={loyalty?.level.id}
                                                loading={loyaltyLoading}
                                                className="h-20 w-20 md:h-24 md:w-24"
                                            >
                                                <AvatarLoader className="w-full h-full" />
                                            </LoyaltyAvatarRing>
                                            {user.isPremium && (
                                                <div className="absolute -bottom-1 -right-1 bg-gradient-to-r from-[var(--pink-punk)] to-[var(--pink-dark)] rounded-full p-1.5 shadow-lg">
                                                    <CheckBadgeIconSolid className="h-4 w-4 text-white" />
                                                </div>
                                            )}
                                        </div>
                                        <div className="flex min-w-0 flex-1 items-start justify-between gap-2">
                                            <div className="text-left min-w-0 flex-1">
                                                <h2 className="text-lg md:text-xl font-bold text-white leading-tight truncate">
                                                    {profileDisplayName}
                                                </h2>
                                                {telegramUsername && (
                                                    <p className="text-white/70 text-sm mt-0.5 truncate">
                                                        @{telegramUsername.replace(/^@/, '')}
                                                    </p>
                                                )}
                                                {user.userPhoneNumber && (
                                                    <p className="text-white/60 text-xs mt-1 truncate">
                                                        {user.userPhoneNumber}
                                                    </p>
                                                )}
                                            </div>
                                            <LoyaltyUserDiscountBadge
                                                status={loyalty}
                                                loading={loyaltyLoading}
                                                className="self-start"
                                            />
                                        </div>
                                    </LoyaltyProfileIdentityBlock>

                                    <LoyaltyLevelsSection
                                        embedded
                                        embeddedCompactTop={showZeroDiscountHint}
                                        status={loyalty}
                                        loading={loyaltyLoading}
                                        onLevelClick={setLoyaltyLevelPopout}
                                        highlightExplorerCard={highlightExplorerCard}
                                        highlightLevelId={highlightNextLevelId}
                                    />

                                    {loyaltyLevelPopout && loyalty && (
                                        <LoyaltyLevelPopout
                                            levelId={loyaltyLevelPopout}
                                            status={loyalty}
                                            onClose={() => setLoyaltyLevelPopout(null)}
                                        />
                                    )}

                                    <LoyaltyStatusBlock
                                        embedded
                                        hideLevels
                                        status={loyalty}
                                        loading={loyaltyLoading}
                                        error={loyaltyError}
                                        onRetry={() => void loadLoyalty()}
                                    />
                                </div>
                            </div>

                        </div>

                        <div className="flex flex-col gap-3 md:gap-4 lg:col-span-2">
                            <div className="grid grid-cols-1 gap-3 md:gap-4 sm:grid-cols-2">
                                <div className="bg-white/5 backdrop-blur-md rounded-xl border border-white/10 p-4 shadow-xl">
                                    <h3 className="text-sm font-bold text-white mb-2">Telegram</h3>
                                    {isTelegramLinked ? (
                                        <div className="space-y-0.5">
                                            <p className="text-sm font-semibold text-[#2AABEE]">Telegram подключён</p>
                                            {telegramUsername && (
                                                <p className="text-white/60 text-xs truncate">
                                                    @{telegramUsername.replace(/^@/, '')}
                                                </p>
                                            )}
                                        </div>
                                    ) : (
                                        <>
                                            <p className="text-white/60 text-xs leading-relaxed mb-2">
                                                Привяжите Telegram к аккаунту с номером {user.userPhoneNumber || 'телефона'}, чтобы
                                                не создавать второй профиль в магазине.
                                            </p>
                                            <button
                                                type="button"
                                                onClick={() => setIsTelegramLinkModalOpen(true)}
                                                className="w-full px-3 py-2 bg-[#2AABEE]/20 hover:bg-[#2AABEE]/30 border border-[#2AABEE]/40 text-white text-sm font-semibold rounded-lg transition-colors"
                                            >
                                                Привязать Telegram
                                            </button>
                                        </>
                                    )}
                                </div>
                                <div className="bg-white/5 backdrop-blur-md rounded-xl border border-white/10 p-4 shadow-xl">
                                    <h3 className="text-sm font-bold text-white mb-2 flex items-center gap-2">
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

                            <div className="bg-white/5 backdrop-blur-md rounded-xl border border-white/10 p-4 shadow-xl">
                                <div className="flex items-center justify-between mb-3">
                                    <h3 className="text-sm font-bold text-white">
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
                                {user.email?.trim() && (
                                    <div className="mb-3 pb-3 border-b border-white/10">
                                        <span className="text-white/60 text-xs block mb-1">Email</span>
                                        <p className="text-white font-semibold break-all">{user.email.trim()}</p>
                                    </div>
                                )}
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
                                        className="w-full px-3 py-2 bg-white/10 hover:bg-white/20 border border-white/20 rounded-lg text-white/70 hover:text-white transition-all text-sm font-medium flex items-center justify-center gap-2"
                                    >
                                        <PhoneIcon className="h-4 w-4" />
                                        Добавить номер телефона
                                    </button>
                                )}
                            </div>

                            <div className="bg-white/5 backdrop-blur-md rounded-xl border border-white/10 p-4 shadow-xl">
                                <div className="flex items-center justify-between mb-3">
                                    <h3 className="text-sm font-bold text-white">
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
                                                <p className="text-white/80">{formatShippingAddress(user.shippingAddress)}</p>
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
                                        className="w-full px-3 py-2 bg-white/10 hover:bg-white/20 border border-white/20 rounded-lg text-white/70 hover:text-white transition-all text-sm font-medium flex items-center justify-center gap-2"
                                    >
                                        <MapPinIcon className="h-4 w-4" />
                                        Добавить адрес доставки
                                    </button>
                                )}
                            </div>
                        </div>
                    </div>

                    {/* Секция заказов — на всю ширину */}
                    <div className="bg-white/5 backdrop-blur-md rounded-xl border border-white/10 p-4 shadow-xl">
                        <div className="flex justify-between items-center mb-4">
                            <div className="flex items-center gap-3">
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
                            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
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
                            <div className="flex items-center justify-center py-12 px-4">
                                <div className="text-center max-w-md mx-auto">
                                    <div className="bg-gradient-to-br from-[var(--pink-punk)]/10 via-transparent to-[var(--mint-bright)]/10 backdrop-blur-sm border border-white/10 rounded-2xl p-8 md:p-10">
                                        <div className="w-32 h-32 md:w-40 md:h-40 mx-auto mb-6 flex items-center justify-center">
                                            <Loader src="/animations/empty.lottie" loop autoplay />
                                        </div>
                                        <h3 className="text-white text-xl md:text-2xl font-bold mb-3">
                                            У вас пока нет заказов
                                        </h3>
                                        <p className="text-white/60 text-sm md:text-base leading-relaxed">
                                            Оформите первый заказ в нашем магазине и начните получать удовольствие от покупок!
                                        </p>
                                        <button
                                            type="button"
                                            onClick={() => router.push('/catalog')}
                                            className="mt-6 px-6 py-3 bg-[var(--pink-punk)] text-white font-bold rounded-xl transition-all hover:opacity-90 hover:shadow-lg active:opacity-100"
                                        >
                                            Перейти к покупкам
                                        </button>
                                    </div>
                                </div>
                            </div>
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

            {isTelegramLinkModalOpen && (
                <TelegramLoginModal
                    isOpen={isTelegramLinkModalOpen}
                    linkTelegramOnly
                    openTelegramOnMount
                    onClose={() => setIsTelegramLinkModalOpen(false)}
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
