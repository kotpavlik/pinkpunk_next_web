'use client'

import React, { useCallback, useRef, useState, useEffect } from 'react'
import * as yup from 'yup'
import { useRouter } from 'next/navigation'
import { useCartStore } from '@/zustand/cart_store/CartStore'
import { useUserStore } from '@/zustand/user_store/UserStore'
import { useOrderStore } from '@/zustand/order_store/OrderStore'
import { CreateOrderFromCartRequest } from '@/api/OrderApi'
import { fetchYandexSuggestions } from '@/features/yandex_connect/suggestService'
import Modal from '@/features/modal/Modal'
import Loader from '@/components/ui/shared/Loader'
import Link from 'next/link'
import Image from 'next/image'
import TelegramLoginModal from '@/components/ui/shared/TelegramLoginModal'
import { DotLottieReact } from '@lottiefiles/dotlottie-react'
import OrderConfirmedAnimation from '@/../public/animations/YourOrderIsConfirmed.json'

// Тип статуса заказа
type OrderStatus = 'pending_confirmation' | 'confirmed' | 'paid' | 'completed' | 'cancelled'

// Функция для перевода статуса заказа на русский язык
const getOrderStatusText = (status: string): string => {
    const statusMap: Record<OrderStatus, string> = {
        'pending_confirmation': 'ожидает подтверждения',
        'confirmed': 'подтвержден',
        'paid': 'оплачен',
        'completed': 'выполнен',
        'cancelled': 'отменен'
    }
    return statusMap[status as OrderStatus] || status
}

// Схема валидации Yup для заказа
const orderSchema = yup.object().shape({
    deliveryAddress: yup
        .string()
        .required('Адрес доставки обязателен')
        .min(5, 'Адрес должен содержать минимум 5 символов')
        .max(200, 'Адрес не должен превышать 200 символов'),
    apartment: yup
        .string()
        .required('Квартира обязательна')
        .matches(/^\d+[а-яА-Я]?$/, 'Квартира должна содержать только цифры и опционально букву кириллицы (например: 12, 5а)'),
    entrance: yup
        .string()
        .matches(/^\d+$/, 'Подъезд должен содержать только цифры')
        .nullable(),
    phoneNumber: yup
        .string()
        .required('Номер телефона обязателен')
        .matches(/^\+\d{1,4}\d{6,14}$/, 'Номер должен быть в международном формате +XXXXXXXXX')
        .test('phone-format', 'Некорректный формат номера телефона', value => {
            if (!value) return false
            // Убираем + и проверяем что остались только цифры
            const digits = value.replace('+', '')
            // Проверяем что номер содержит от 7 до 15 цифр (международный стандарт)
            return /^\d{7,15}$/.test(digits)
        }),
    comments: yup
        .string()
        .max(500, 'Комментарий не должен превышать 500 символов'),
    paymentMethod: yup
        .string()
        .oneOf(['card_online', 'card_offline', 'cash', 'crypto', 'bank_transfer'], 'Неверный способ оплаты')
        .required('Способ оплаты обязателен')
})

export default function OrderPage() {
    const router = useRouter()
    const { user, isAuthenticated } = useUserStore()
    const { createOrderFromCart, isCreating } = useOrderStore()
    const {
        items: cartItems,
        stats,
        cartId,
        clearCart,
        validateCart,
        lastValidationResult,
        getCart,
        isLoading: isCartLoading
    } = useCartStore()

    // Состояние формы заказа
    const [deliveryAddress, setDeliveryAddress] = useState('')
    const [apartment, setApartment] = useState('')
    const [entrance, setEntrance] = useState('')
    const [phoneNumber, setPhoneNumber] = useState('')
    const [comments, setComments] = useState('')
    const [paymentMethod, setPaymentMethod] = useState<'card_online' | 'card_offline' | 'cash' | 'crypto' | 'bank_transfer'>('cash')
    const [isSubmitting, setIsSubmitting] = useState(false)
    const [errors, setErrors] = useState<{ [key: string]: string | undefined }>({})
    const [addressSuggestions, setAddressSuggestions] = useState<string[]>([])
    const [showSuggestions, setShowSuggestions] = useState(false)
    const suggestTimerRef = useRef<NodeJS.Timeout | null>(null)
    const suggestAbortRef = useRef<AbortController | null>(null)

    // Состояние для модального окна валидации
    const [showValidationModal, setShowValidationModal] = useState(false)
    // Состояние для модального окна авторизации
    const [isLoginModalOpen, setIsLoginModalOpen] = useState(false)
    // Состояние для модального окна успешного создания заказа
    const [showSuccessModal, setShowSuccessModal] = useState(false)
    const [successOrderData, setSuccessOrderData] = useState<{ orderNumber: string; status: string; totalAmount: number } | null>(null)
    const successModalTimeoutRef = useRef<NodeJS.Timeout | null>(null)

    // Загружаем корзину при монтировании
    useEffect(() => {
        if (user?._id) {
            getCart(user._id)
        }
    }, [user?._id, getCart])

    // Очищаем таймер при размонтировании компонента
    useEffect(() => {
        const timeoutRef = successModalTimeoutRef
        return () => {
            const timeoutId = timeoutRef.current
            if (timeoutId) {
                clearTimeout(timeoutId)
            }
        }
    }, [])

    // Функция для валидации поля с помощью Yup
    const validateField = useCallback(async (fieldName: string, value: string) => {
        try {
            await orderSchema.validateAt(fieldName, { [fieldName]: value })
            return null
        } catch (error) {
            if (error instanceof yup.ValidationError) {
                return error.message
            }
            return 'Ошибка валидации'
        }
    }, [])

    // Функция для форматирования номера телефона
    const formatPhoneNumber = useCallback((value: string) => {
        // Убираем все кроме цифр и +
        const cleanValue = value.replace(/[^\d+]/g, '')

        // Если уже есть +, возвращаем как есть
        if (cleanValue.startsWith('+')) {
            return cleanValue
        }

        // Убираем все кроме цифр
        const digits = cleanValue.replace(/\D/g, '')

        // Если пустая строка, возвращаем +
        if (digits.length === 0) {
            return '+'
        }

        // Если номер начинается с 80 (Беларусь), заменяем на 375
        if (digits.startsWith('80') && digits.length >= 11) {
            return `+375${digits.slice(2)}`
        }

        // Если номер начинается с 8 (Россия/Беларусь), заменяем на 7 или 375
        if (digits.startsWith('8') && digits.length >= 11) {
            // Если 11 цифр, то это российский номер
            if (digits.length === 11) {
                return `+7${digits.slice(1)}`
            }
            // Если больше 11, то белорусский
            return `+375${digits.slice(1)}`
        }

        // Если номер начинается с 7 (Россия), добавляем +
        if (digits.startsWith('7') && digits.length >= 11) {
            return `+${digits}`
        }

        // Если номер начинается с 375 (Беларусь), добавляем +
        if (digits.startsWith('375') && digits.length >= 12) {
            return `+${digits}`
        }

        // Для других случаев просто добавляем +
        return `+${digits}`
    }, [])

    // Обработчик изменения номера телефона
    const handlePhoneChange = useCallback(async (e: React.ChangeEvent<HTMLInputElement>) => {
        const value = e.target.value
        const formatted = formatPhoneNumber(value)
        setPhoneNumber(formatted)

        // Валидация номера
        const error = await validateField('phoneNumber', formatted)
        setErrors(prev => ({ ...prev, phoneNumber: error || undefined }))
    }, [formatPhoneNumber, validateField])

    // Обработчик изменения комментария
    const handleCommentsChange = useCallback(async (e: React.ChangeEvent<HTMLTextAreaElement>) => {
        const value = e.target.value
        setComments(value)

        // Валидация комментария
        const error = await validateField('comments', value)
        setErrors(prev => ({ ...prev, comments: error || undefined }))
    }, [validateField])

    // Обработчик изменения квартиры
    const handleApartmentChange = useCallback(async (e: React.ChangeEvent<HTMLInputElement>) => {
        const value = e.target.value
        setApartment(value)

        // Валидация квартиры
        const error = await validateField('apartment', value)
        setErrors(prev => ({ ...prev, apartment: error || undefined }))
    }, [validateField])

    // Обработчик изменения подъезда
    const handleEntranceChange = useCallback(async (e: React.ChangeEvent<HTMLInputElement>) => {
        // Разрешаем только цифры
        const value = e.target.value.replace(/\D/g, '')
        setEntrance(value)

        // Валидация подъезда (необязательное поле)
        if (value.trim()) {
            const error = await validateField('entrance', value)
            setErrors(prev => ({ ...prev, entrance: error || undefined }))
        } else {
            setErrors(prev => ({ ...prev, entrance: undefined }))
        }
    }, [validateField])

    // Обработчик изменения адреса с серверными подсказками
    const handleAddressChange = useCallback(async (e: React.ChangeEvent<HTMLInputElement>) => {
        const value = e.target.value
        setDeliveryAddress(value)

        // Валидация адреса
        const error = await validateField('deliveryAddress', value)
        setErrors(prev => ({ ...prev, deliveryAddress: error || undefined }))

        // Дебаунс подсказок
        if (suggestTimerRef.current) {
            clearTimeout(suggestTimerRef.current)
        }

        if (suggestAbortRef.current) {
            suggestAbortRef.current.abort()
            suggestAbortRef.current = null
        }

        if (value.trim().length < 3) {
            setAddressSuggestions([])
            setShowSuggestions(false)
            return
        }

        suggestTimerRef.current = setTimeout(async () => {
            try {
                const controller = new AbortController()
                suggestAbortRef.current = controller
                const list = await fetchYandexSuggestions(value, controller.signal)
                setAddressSuggestions(list.slice(0, 8))
                setShowSuggestions(true)
            } catch {
                // ignore
            } finally {
                suggestAbortRef.current = null
            }
        }, 300)
    }, [validateField])

    const handlePickSuggestion = useCallback((s: string) => {
        setDeliveryAddress(s)
        setAddressSuggestions([])
        setShowSuggestions(false)
    }, [])

    // Подтягиваем телефон из user при загрузке, если он есть
    useEffect(() => {
        if (user?.userPhoneNumber && !phoneNumber) {
            const formatted = formatPhoneNumber(user.userPhoneNumber)
            setPhoneNumber(formatted)
            // Валидация номера
            validateField('phoneNumber', formatted).then(error => {
                setErrors(prev => ({ ...prev, phoneNumber: error || undefined }))
            })
        }
    }, [user?.userPhoneNumber, phoneNumber, formatPhoneNumber, validateField])

    // Функция для отправки заказа
    const handleSubmitOrder = useCallback(async () => {
        // Проверка авторизации пользователя
        const hasUserId = !!user?._id
        const isAuth = isAuthenticated()
        const isUserAuthenticated = hasUserId && isAuth

        if (!isUserAuthenticated) {
            console.log('User not authenticated:', { hasUserId, isAuth, userId: user?._id })
            setIsLoginModalOpen(true)
            setIsSubmitting(false)
            return
        }

        console.log('User authenticated, proceeding with order creation')

        if (cartItems.length === 0 || !cartId) {
            setErrors({ general: 'Недостаточно данных для создания заказа' })
            return
        }

        setIsSubmitting(true)
        setErrors({})

        try {
            // Валидация всей формы с помощью Yup
            const formData = {
                deliveryAddress,
                apartment,
                entrance: entrance || null,
                phoneNumber,
                comments,
                paymentMethod
            }

            await orderSchema.validate(formData, { abortEarly: false })

            // Формируем полный адрес: основной адрес + подъезд (если есть) + квартира
            // Парсим адрес для создания shippingAddress
            const addressParts = deliveryAddress.split(',').map(part => part.trim())
            const city = addressParts[0] || 'Не указан'
            const baseAddress = addressParts.slice(1).join(', ') || deliveryAddress

            // Формируем полный адрес с подъездом и квартирой
            let address = baseAddress
            if (entrance.trim()) {
                address += `, подъезд ${entrance.trim()}`
            }
            if (apartment.trim()) {
                address += `, кв. ${apartment.trim()}`
            }

            // Подготавливаем данные заказа
            if (!user._id || !phoneNumber) {
                setErrors({ general: 'Недостаточно данных для создания заказа' })
                setIsSubmitting(false)
                return
            }

            const orderData: CreateOrderFromCartRequest = {
                userId: user._id,
                cartId: cartId,
                userPhoneNumber: phoneNumber,
                shippingAddress: {
                    fullName: user.username || user.firstName || 'Пользователь',
                    phone: phoneNumber,
                    address: address,
                    city: city,
                    postalCode: '000000',
                    country: 'Беларусь',
                    notes: comments
                },
                paymentMethod: paymentMethod,
                shippingCost: 0,
                notes: comments
            }

            // Сначала валидируем корзину
            const validationResult = await validateCart()

            if (validationResult && !validationResult.isValid) {
                // Корзина не валидна
                setShowValidationModal(true)
                setIsSubmitting(false)
                return
            }

            // Создаем заказ через OrderStore
            const order = await createOrderFromCart(orderData)

            // Сохраняем данные заказа для модального окна
            setSuccessOrderData({
                orderNumber: order.orderNumber,
                status: order.status,
                totalAmount: order.totalAmount
            })

            // Очищаем корзину
            await clearCart(user._id)

            // Сбрасываем форму
            setDeliveryAddress('')
            setApartment('')
            setEntrance('')
            setPhoneNumber('')
            setComments('')
            setPaymentMethod('cash')

            // Показываем модальное окно успеха
            setShowSuccessModal(true)
        } catch (error) {
            if (error instanceof yup.ValidationError) {
                // Преобразуем ошибки Yup в формат для отображения
                const yupErrors: { [key: string]: string } = {}
                error.inner.forEach((err) => {
                    if (err.path) {
                        yupErrors[err.path] = err.message
                    }
                })
                setErrors(yupErrors)
            } else {
                setErrors({ general: 'Произошла ошибка при отправке заказа' })
            }
        } finally {
            setIsSubmitting(false)
        }
    }, [
        cartItems,
        user,
        cartId,
        deliveryAddress,
        apartment,
        entrance,
        phoneNumber,
        comments,
        paymentMethod,
        validateCart,
        createOrderFromCart,
        clearCart,
        isAuthenticated
    ])

    // Функция для повторного создания заказа после исправления корзины
    const handleRetryOrder = useCallback(() => {
        setShowValidationModal(false)
        router.push('/catalog')
    }, [router])

    // Функция для отмены валидации
    const handleCancelValidation = useCallback(() => {
        setShowValidationModal(false)
    }, [])

    // Показываем loader при загрузке корзины
    if (isCartLoading) {
        return <Loader fullScreen showText />
    }

    // Если корзина пуста, показываем сообщение
    if (cartItems.length === 0) {
        return (
            <>
                <div className="relative md:max-w-[100vw] md:px-0 min-h-screen mb-20">
                    {showSuccessModal && successOrderData ? (
                        <div className="text-white text-center py-20 px-4">
                            <div className="mb-6">
                                <div className="w-32 h-32 mx-auto mb-4">
                                    <DotLottieReact
                                        data={OrderConfirmedAnimation}
                                        loop={true}
                                        autoplay={true}
                                        style={{
                                            width: '100%',
                                            height: '100%',
                                        }}
                                    />
                                </div>
                                <h1 className="text-xl font-blauer-nue mb-2 text-[var(--pink-punk)]">
                                    заказ #{successOrderData.orderNumber} успешно создан!
                                </h1>
                                <p className="text-white/70 mb-6">
                                    корзина пуста, все заказы оформлены! <br />скоро с вами свяжется наш менеджер!
                                </p>
                            </div>

                            <div className="max-w-md mx-auto space-y-3 mb-8">
                                <div className="flex justify-between items-center p-4 bg-white/5 border border-white/10">
                                    <span className="text-white/70">Статус:</span>
                                    <span className="text-white font-semibold">{getOrderStatusText(successOrderData.status)}</span>
                                </div>
                                <div className="flex justify-between items-center p-4 bg-white/5 border border-white/10">
                                    <span className="text-white/70">Сумма заказа:</span>
                                    <span className="text-[var(--mint-bright)] font-bold text-lg">{successOrderData.totalAmount.toFixed(2)} BYN</span>
                                </div>
                            </div>

                            <div className="mb-6">
                                <p className="text-white/70 text-sm">
                                    Информация о заказе доступна в вашем профиле
                                </p>
                            </div>

                            <div className="flex flex-col sm:flex-row gap-4 justify-center max-w-md mx-auto">
                                <Link
                                    href="/catalog"
                                    className="px-6 py-3 bg-white/10 text-white hover:bg-white/20 transition-colors font-semibold border border-white/20"
                                >
                                    Вернуться в каталог
                                </Link>
                                <button
                                    onClick={() => {
                                        if (successModalTimeoutRef.current) {
                                            clearTimeout(successModalTimeoutRef.current)
                                        }
                                        setShowSuccessModal(false)
                                        router.push('/user_profile')
                                    }}
                                    className="px-6 py-3 bg-[var(--pink-punk)] text-white hover:bg-[var(--pink-light)] transition-colors font-semibold"
                                >
                                    Отслеживать заказ
                                </button>
                            </div>
                        </div>
                    ) : (
                        // Обычное сообщение о пустой корзине
                        <div className="text-white text-center py-20">
                            <h1 className="text-2xl font-blauer-nue mb-4">Корзина пуста</h1>
                            <Link href="/catalog" className="text-[var(--mint-dark)] hover:underline">
                                Вернуться в каталог
                            </Link>
                        </div>
                    )}
                </div >

                {/* Модальное окно успешного создания заказа (для мобильных устройств) */}
                {
                    showSuccessModal && successOrderData && (
                        <div
                            className="fixed inset-0 flex items-center justify-center bg-black/60 backdrop-blur-md transition-opacity duration-300 z-50 sm:hidden"
                            onClick={(e) => {
                                if (e.target === e.currentTarget) {
                                    if (successModalTimeoutRef.current) {
                                        clearTimeout(successModalTimeoutRef.current)
                                    }
                                    setShowSuccessModal(false)
                                    router.push('/user_profile')
                                }
                            }}
                        >
                            <div
                                className="relative bg-gradient-to-br from-white/10 via-white/5 to-white/10 backdrop-blur-2xl border border-white/20 shadow-2xl max-w-md w-full mx-4 max-h-[90vh] flex flex-col"
                                style={{
                                    background: 'linear-gradient(135deg, rgba(255, 255, 255, 0.1) 0%, rgba(255, 255, 255, 0.05) 50%, rgba(255, 255, 255, 0.1) 100%)',
                                    backdropFilter: 'blur(30px) saturate(180%)',
                                    WebkitBackdropFilter: 'blur(30px) saturate(180%)',
                                    boxShadow: '0 20px 60px rgba(0, 0, 0, 0.5), 0 0 0 1px rgba(255, 255, 255, 0.1)',
                                }}
                                onClick={(e) => e.stopPropagation()}
                            >
                                {/* Заголовок и кнопка закрытия */}
                                <div className="flex-shrink-0 p-6">
                                    <button
                                        onClick={() => {
                                            if (successModalTimeoutRef.current) {
                                                clearTimeout(successModalTimeoutRef.current)
                                            }
                                            setShowSuccessModal(false)
                                            router.push('/user_profile')
                                        }}
                                        className="absolute top-4 right-4 text-white/70 hover:text-white transition-colors z-10"
                                        aria-label="Закрыть"
                                    >
                                        <svg className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                                        </svg>
                                    </button>

                                    <div className="mb-4">
                                        <div className="inline-block relative">
                                            <h2 className="text-2xl font-bold font-durik text-[var(--pink-punk)] mb-2">
                                                Успех!
                                            </h2>
                                            <div className="h-1 w-full bg-[var(--pink-punk)] absolute bottom-0 left-0"></div>
                                        </div>
                                    </div>
                                </div>

                                {/* Контент */}
                                <div className="flex-1 overflow-y-auto px-6 pb-6">
                                    <div className="mb-6 text-center">
                                        <div className="w-32 h-32 mx-auto mb-4">
                                            <DotLottieReact
                                                data={OrderConfirmedAnimation}
                                                loop={true}
                                                autoplay={true}
                                                style={{
                                                    width: '100%',
                                                    height: '100%',
                                                }}
                                            />
                                        </div>
                                        <h3 className="text-xl font-bold text-white mb-2">
                                            заказ #{successOrderData.orderNumber} успешно создан!
                                        </h3>
                                    </div>

                                    <div className="space-y-3 mb-6">
                                        <div className="flex justify-between items-center p-3 bg-white/5 border border-white/10">
                                            <span className="text-white/70">Статус:</span>
                                            <span className="text-white font-semibold">{getOrderStatusText(successOrderData.status)}</span>
                                        </div>
                                        <div className="flex justify-between items-center p-3 bg-white/5 border border-white/10">
                                            <span className="text-white/70">Сумма заказа:</span>
                                            <span className="text-[var(--mint-bright)] font-bold text-lg">{successOrderData.totalAmount.toFixed(2)} BYN</span>
                                        </div>
                                    </div>

                                    <div className="mb-4">
                                        <p className="text-white/70 text-sm text-center">
                                            Информация о заказе доступна в вашем профиле
                                        </p>
                                    </div>

                                    <div className="flex flex-col gap-3">
                                        <Link
                                            href="/catalog"
                                            className="w-full px-4 py-3 bg-white/10 text-white hover:bg-white/20 transition-colors font-semibold border border-white/20 text-center"
                                            onClick={() => {
                                                if (successModalTimeoutRef.current) {
                                                    clearTimeout(successModalTimeoutRef.current)
                                                }
                                                setShowSuccessModal(false)
                                            }}
                                        >
                                            Вернуться в каталог
                                        </Link>
                                        <button
                                            onClick={() => {
                                                if (successModalTimeoutRef.current) {
                                                    clearTimeout(successModalTimeoutRef.current)
                                                }
                                                setShowSuccessModal(false)
                                                router.push('/user_profile')
                                            }}
                                            className="w-full px-4 py-3 bg-[var(--pink-punk)] text-white hover:bg-[var(--pink-light)] transition-colors font-semibold"
                                        >
                                            Отслеживать заказ
                                        </button>
                                    </div>
                                </div>
                            </div>
                        </div>
                    )
                }
            </>
        )
    }

    const totalPrice = stats?.totalPrice || 0
    const totalItems = stats?.totalItems || 0

    return (
        <>
            <div className="relative md:max-w-[100vw] md:px-0 min-h-screen mb-20">
                <div className="relative w-full pt-24 pb-16 px-4 md:px-6">
                    <header className="mb-8">
                        <h1 className="text-2xl md:text-4xl font-blauer-nue font-bold text-white mb-2">
                            Оформление заказа
                        </h1>
                        <p className="text-white/60 text-sm md:text-base">
                            Заполните форму для завершения заказа
                        </p>
                    </header>

                    <div className="mx-auto grid grid-cols-1 lg:grid-cols-3 gap-6">
                        {/* Левая колонка - Форма заказа */}
                        <div className="lg:col-span-2 space-y-6 order-2 lg:order-1">
                            {/* Форма заказа */}
                            <div className="bg-white/5 backdrop-blur-sm p-6 border border-white/10 space-y-6">
                                <h2 className="text-xl font-blauer-nue font-semibold text-white mb-4">
                                    Информация для заказа
                                </h2>

                                {/* Общая ошибка */}
                                {errors.general && (
                                    <div className="bg-[var(--pink-punk)]/20 border border-[var(--pink-punk)] p-3 text-[var(--pink-punk)] text-sm">
                                        {errors.general}
                                    </div>
                                )}

                                {/* Адрес доставки */}
                                <div className="relative w-full">
                                    <label className="block text-sm font-medium text-white/80 mb-2">
                                        Адрес доставки *
                                    </label>
                                    <div className="relative">
                                        <input
                                            type="text"
                                            value={deliveryAddress}
                                            onChange={handleAddressChange}
                                            placeholder="Начните вводить адрес доставки"
                                            className={`w-full px-4 py-3 bg-white/10 border text-white placeholder-white/40 focus:outline-none focus:ring-2 focus:ring-[var(--mint-dark)] ${errors.deliveryAddress ? 'border-[var(--pink-punk)]' : 'border-white/20'
                                                }`}
                                        />
                                        {errors.deliveryAddress && (
                                            <p className="absolute top-full left-0 right-0 text-[var(--pink-punk)] text-xs px-2 py-1 bg-black/80 backdrop-blur-sm animate-slideDown z-10">
                                                {errors.deliveryAddress}
                                            </p>
                                        )}
                                    </div>

                                    {/* Подсказки адресов */}
                                    <div
                                        className={`w-full mt-2 bg-white/10 backdrop-blur-sm border border-white/20 shadow-lg max-h-48 overflow-y-auto transition-all duration-300 ease-in-out ${showSuggestions && addressSuggestions.length > 0
                                            ? 'opacity-100 max-h-48 transform translate-y-0'
                                            : 'opacity-0 max-h-0 transform -translate-y-2 pointer-events-none'
                                            }`}
                                    >
                                        {addressSuggestions.map((suggestion, index) => (
                                            <button
                                                key={index}
                                                type="button"
                                                onClick={() => handlePickSuggestion(suggestion)}
                                                className="w-full px-4 py-2 text-left text-white hover:bg-white/20 text-sm transition-colors duration-200"
                                            >
                                                {suggestion}
                                            </button>
                                        ))}
                                    </div>
                                </div>

                                {/* Подъезд и квартира */}
                                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                    {/* Подъезд */}
                                    <div className="w-full relative">
                                        <label className="block text-sm font-medium text-white/80 mb-2">
                                            Подъезд
                                        </label>
                                        <div className="relative">
                                            <input
                                                type="text"
                                                value={entrance}
                                                onChange={handleEntranceChange}
                                                placeholder="Необязательно"
                                                className={`w-full px-4 py-3 bg-white/10 border text-white placeholder-white/40 focus:outline-none focus:ring-2 focus:ring-[var(--mint-dark)] ${errors.entrance ? 'border-[var(--pink-punk)]' : 'border-white/20'
                                                    }`}
                                            />
                                            {errors.entrance && (
                                                <p className="absolute top-full left-0 right-0 text-[var(--pink-punk)] text-xs px-2 py-1 bg-black/80 backdrop-blur-sm animate-slideDown z-10">
                                                    {errors.entrance}
                                                </p>
                                            )}
                                        </div>
                                    </div>

                                    {/* Квартира */}
                                    <div className="w-full relative">
                                        <label className="block text-sm font-medium text-white/80 mb-2">
                                            Квартира *
                                        </label>
                                        <div className="relative">
                                            <input
                                                type="text"
                                                value={apartment}
                                                onChange={handleApartmentChange}
                                                placeholder="Например: 12 или 5а"
                                                className={`w-full px-4 py-3 bg-white/10 border text-white placeholder-white/40 focus:outline-none focus:ring-2 focus:ring-[var(--mint-dark)] ${errors.apartment ? 'border-[var(--pink-punk)]' : 'border-white/20'
                                                    }`}
                                                required
                                            />
                                            {errors.apartment && (
                                                <p className="absolute top-full left-0 right-0 text-[var(--pink-punk)] text-xs px-2 py-1 bg-black/80 backdrop-blur-sm animate-slideDown z-10">
                                                    {errors.apartment}
                                                </p>
                                            )}
                                        </div>
                                    </div>
                                </div>

                                {/* Номер телефона */}
                                <div className="w-full relative">
                                    <label className="block text-sm font-medium text-white/80 mb-2">
                                        Номер телефона *
                                    </label>
                                    <div className="relative">
                                        <input
                                            type="tel"
                                            value={phoneNumber}
                                            onChange={handlePhoneChange}
                                            placeholder="+375 (XX) XXX-XX-XX"
                                            className={`w-full px-4 py-3 bg-white/10 border text-white placeholder-white/40 focus:outline-none focus:ring-2 focus:ring-[var(--mint-dark)] ${errors.phoneNumber ? 'border-[var(--pink-punk)]' : 'border-white/20'
                                                }`}
                                            required
                                        />
                                        {errors.phoneNumber && (
                                            <p className="absolute top-full left-0 right-0 text-[var(--pink-punk)] text-xs px-2 py-1 bg-black/80 backdrop-blur-sm animate-slideDown z-10">
                                                {errors.phoneNumber}
                                            </p>
                                        )}
                                    </div>
                                </div>

                                {/* Способ оплаты */}
                                <div>
                                    <label className="block text-sm font-medium text-white/80 mb-2">
                                        Способ оплаты *
                                    </label>
                                    <div className="space-y-2">
                                        <label className="flex items-center p-3 bg-white/5 hover:bg-white/10 cursor-pointer">
                                            <input
                                                type="radio"
                                                name="payment"
                                                value="cash"
                                                checked={paymentMethod === 'cash'}
                                                onChange={(e) => setPaymentMethod(e.target.value as typeof paymentMethod)}
                                                className="mr-3 text-[var(--mint-dark)]"
                                            />
                                            <span className="text-white">Наличными при получении</span>
                                        </label>
                                        <label className="flex items-center p-3 bg-white/5 hover:bg-white/10 cursor-pointer">
                                            <input
                                                type="radio"
                                                name="payment"
                                                value="card_offline"
                                                checked={paymentMethod === 'card_offline'}
                                                onChange={(e) => setPaymentMethod(e.target.value as typeof paymentMethod)}
                                                className="mr-3 text-[var(--mint-dark)]"
                                            />
                                            <span className="text-white">Картой при получении</span>
                                        </label>
                                        <label className="flex items-center p-3 bg-white/5 hover:bg-white/10 cursor-pointer">
                                            <input
                                                type="radio"
                                                name="payment"
                                                value="card_online"
                                                checked={paymentMethod === 'card_online'}
                                                onChange={(e) => setPaymentMethod(e.target.value as typeof paymentMethod)}
                                                className="mr-3 text-[var(--mint-dark)]"
                                            />
                                            <span className="text-white">Картой онлайн</span>
                                        </label>
                                    </div>
                                </div>

                                {/* Комментарий */}
                                <div className="relative">
                                    <label className="block text-sm font-medium text-white/80 mb-2">
                                        Комментарий к заказу
                                    </label>
                                    <div className="relative">
                                        <textarea
                                            value={comments}
                                            onChange={handleCommentsChange}
                                            placeholder="Дополнительная информация (необязательно)"
                                            className={`w-full px-4 py-3 bg-white/10 border text-white placeholder-white/40 focus:outline-none focus:ring-2 focus:ring-[var(--mint-dark)] resize-none ${errors.comments ? 'border-[var(--pink-punk)]' : 'border-white/20'
                                                }`}
                                            rows={3}
                                        />
                                        {errors.comments && (
                                            <p className="absolute top-full left-0 mt-1 text-[var(--pink-punk)] text-xs z-10 px-2 py-1">{errors.comments}</p>
                                        )}
                                    </div>
                                </div>

                                {/* Кнопки */}
                                <div className="flex gap-3 pt-4">
                                    <Link
                                        href="/catalog"
                                        className="flex-1 px-4 py-3 bg-white/10 text-white hover:bg-white/20 transition-colors text-center"
                                    >
                                        Отменить
                                    </Link>
                                    <button
                                        onClick={handleSubmitOrder}
                                        disabled={!deliveryAddress.trim() || !apartment.trim() || !phoneNumber.trim() || isSubmitting || isCreating || Object.values(errors).some(error => error)}
                                        className="flex-1 px-4 py-3 bg-[var(--mint-dark)] text-white hover:bg-[var(--green)] transition-colors font-semibold disabled:bg-gray-500 disabled:cursor-not-allowed"
                                    >
                                        {(isSubmitting || isCreating) ? (
                                            <div className="flex items-center justify-center">
                                                <div className="animate-spin h-4 w-4 border-b-2 border-white mr-2"></div>
                                                Создание заказа...
                                            </div>
                                        ) : (
                                            'Подтвердить заказ'
                                        )}
                                    </button>
                                </div>
                            </div>
                        </div>

                        {/* Правая колонка - Детали заказа */}
                        <div className="lg:col-span-1 space-y-6 order-1 lg:order-2">
                            {/* Информация о заказе */}
                            <div className="bg-white/5 backdrop-blur-sm p-6 border border-white/10 sticky top-24">
                                <h2 className="text-xl font-blauer-nue font-semibold text-white mb-4">
                                    Детали заказа
                                </h2>

                                {/* Товары */}
                                <div className="space-y-3 mb-4">
                                    {cartItems.map(({ _id, product, quantity }) => {
                                        const firstPhoto = product.photos?.[0]
                                        // Функция для обработки URL фотографий
                                        const getImageUrl = (photoUrl: string) => {
                                            if (photoUrl.startsWith('http://') || photoUrl.startsWith('https://')) {
                                                return photoUrl
                                            }
                                            if (photoUrl.startsWith('/')) {
                                                const baseURL = process.env.NEXT_PUBLIC_BASE_URL || 'https://pinkpunknestbot-production.up.railway.app'
                                                return `${baseURL}${photoUrl}`
                                            }
                                            return photoUrl
                                        }

                                        return (
                                            <div key={_id} className="flex flex-col gap-3">
                                                <div className="flex items-start gap-2">
                                                    <div className="relative w-20 aspect-[9/16] overflow-hidden border border-white/10 flex-shrink-0">
                                                        {firstPhoto ? (
                                                            <Image
                                                                src={getImageUrl(firstPhoto)}
                                                                alt={product.name}
                                                                fill
                                                                className="object-cover"
                                                            />
                                                        ) : (
                                                            <div className="w-full h-full flex items-center justify-center text-white/40">📦</div>
                                                        )}
                                                    </div>
                                                    <div className="flex-1 min-w-0 flex flex-col justify-between" style={{ height: 'calc(5rem * 16 / 9)' }}>
                                                        <div className="flex flex-col gap-1.5">
                                                            {/* Название */}
                                                            <h3 className="text-white font-semibold text-sm line-clamp-2 leading-tight">{product.name}</h3>

                                                            {/* Цена */}
                                                            <div className="text-[var(--mint-bright)] font-bold text-base">
                                                                {product.price} BYN
                                                            </div>

                                                            {/* Размер */}
                                                            {product.size && (
                                                                <div className="text-white/60 text-sm">
                                                                    {product.size}
                                                                </div>
                                                            )}

                                                            {/* Количество */}
                                                            <div className="text-white/60 text-sm">
                                                                Количество: {quantity} шт
                                                            </div>
                                                        </div>
                                                    </div>
                                                </div>
                                            </div>
                                        )
                                    })}
                                </div>

                                {/* Итого */}
                                <div className="relative overflow-hidden bg-gradient-to-r from-white/10 via-white/5 to-white/10 p-6 border border-[var(--mint-dark)]/30 backdrop-blur-sm">
                                    {/* Декоративный градиент */}
                                    <div className="absolute inset-0 bg-gradient-to-r from-[var(--mint-dark)]/10 via-transparent to-[var(--mint-dark)]/10 opacity-50"></div>

                                    <div className="relative">
                                        {/* На мобильных: вертикальная компоновка, на десктопе: горизонтальная */}
                                        <div className="flex flex-col md:flex-row md:items-center md:justify-between mb-3 gap-2 md:gap-0">
                                            <div className="flex items-center gap-2">
                                                <span className="text-xl font-blauer-nue font-bold text-white">Итого</span>
                                                <div className="h-1 w-1 bg-[var(--mint-dark)]"></div>
                                            </div>
                                            <span className="text-3xl font-blauer-nue font-bold text-[var(--mint-bright)]">
                                                {totalPrice.toFixed(2)} BYN
                                            </span>
                                        </div>

                                        <div className="flex flex-col md:flex-row md:items-center md:justify-between pt-3 border-t border-white/10 gap-2 md:gap-0">
                                            <div className="flex items-center gap-2">
                                                <svg className="w-4 h-4 text-white/60" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 11V7a4 4 0 00-8 0v4M5 9h14l1 12H4L5 9z" />
                                                </svg>
                                                <p className="text-sm text-white/70 font-blauer-nue">
                                                    {totalItems} {totalItems === 1 ? 'товар' : totalItems < 5 ? 'товара' : 'товаров'}
                                                </p>
                                            </div>
                                            <div className="text-sm text-white/50 font-blauer-nue">
                                                {cartItems.length} {cartItems.length === 1 ? 'позиция' : cartItems.length < 5 ? 'позиции' : 'позиций'}
                                            </div>
                                        </div>
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>

                {/* Модальное окно валидации корзины */}
                <Modal
                    isOpen={showValidationModal}
                    onClose={handleCancelValidation}
                    title="Проблемы с корзиной"
                >
                    <div className="p-6">
                        <div className="mb-4">
                            <h3 className="text-lg font-bold text-white mb-2">Корзина содержит недоступные товары</h3>
                            <p className="text-white/70 mb-4">
                                Некоторые товары в вашей корзине больше недоступны для заказа.
                            </p>
                        </div>

                        {/* Список проблем */}
                        {lastValidationResult && lastValidationResult.changes && lastValidationResult.changes.length > 0 && (
                            <div className="mb-6">
                                <h4 className="text-md font-semibold text-white mb-3">Обнаруженные проблемы:</h4>
                                <div className="space-y-2 max-h-40 overflow-y-auto">
                                    {lastValidationResult.changes.map((change, index) => (
                                        <div key={index} className="bg-white/10 p-3">
                                            <div className="flex items-start">
                                                <div className="flex-shrink-0 mr-3">
                                                    {change.type === 'product_removed' && <span className="text-red-400">❌</span>}
                                                    {change.type === 'quantity_adjusted' && <span className="text-orange-400">📦</span>}
                                                    {change.type === 'price_updated' && <span className="text-blue-400">💰</span>}
                                                </div>
                                                <div className="flex-1">
                                                    <p className="text-sm text-white">{change.message}</p>
                                                </div>
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            </div>
                        )}

                        <div className="mb-4">
                            <p className="text-white/70">
                                Пожалуйста, вернитесь в каталог и исправьте проблемы. Корзина будет автоматически синхронизирована.
                            </p>
                        </div>

                        {/* Кнопки */}
                        <div className="flex gap-3">
                            <button
                                onClick={handleCancelValidation}
                                className="flex-1 px-4 py-3 bg-white/10 text-white hover:bg-white/20 transition-colors"
                            >
                                Отмена
                            </button>
                            <button
                                onClick={handleRetryOrder}
                                className="flex-1 px-4 py-3 bg-[var(--mint-dark)] text-white hover:bg-[var(--green)] transition-colors font-semibold"
                            >
                                Перейти в каталог
                            </button>
                        </div>
                    </div>
                </Modal>

                {/* Telegram Login Modal */}
                {isLoginModalOpen && (
                    <TelegramLoginModal
                        isOpen={isLoginModalOpen}
                        onClose={() => {

                            setIsLoginModalOpen(false)
                        }}
                    />
                )}

            </div>
        </>
    )
}
