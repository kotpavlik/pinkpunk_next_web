'use client'

import { useEffect, useMemo, useState, useCallback } from 'react'
import { createPortal } from 'react-dom'
import { useRouter } from 'next/navigation'
import { useCartStore } from '@/zustand/cart_store/CartStore'
import { useUserStore } from '@/zustand/user_store/UserStore'
import Image from 'next/image'
import Loader from './Loader'
import { XMarkIcon } from '@heroicons/react/24/outline'
import TelegramLoginModal from './TelegramLoginModal'

interface CartModalProps {
    isOpen: boolean
    onClose: () => void
}

export default function CartModal({ isOpen, onClose }: CartModalProps) {
    const router = useRouter()
    const { user, isAuthenticated } = useUserStore()
    const {
        items: cartItems,
        stats,
        error,
        getCart,
        updateCartItem,
        removeFromCart,
        clearCart,
        setError,
        isLoading,
    } = useCartStore()
    const [mounted, setMounted] = useState(false)
    const [showError, setShowError] = useState(false)
    const [isInitialLoad, setIsInitialLoad] = useState(true)
    const [isClosing, setIsClosing] = useState(false)
    const [isLoginModalOpen, setIsLoginModalOpen] = useState(false)
    const [pendingOrder, setPendingOrder] = useState(false)

    useEffect(() => {
        setMounted(true)
    }, [])

    useEffect(() => {
        if (isOpen && user?._id) {
            setIsInitialLoad(true)
            getCart(user._id).finally(() => {
                setIsInitialLoad(false)
            })
        }
    }, [isOpen, user?._id, getCart])

    // Функция для закрытия с анимацией
    const handleClose = useCallback(() => {
        setIsClosing(true)
        setTimeout(() => {
            setIsClosing(false)
            onClose()
        }, 300) // Длительность анимации
    }, [onClose])

    // Обработка перенаправления на страницу заказа после успешного логина
    useEffect(() => {
        if (pendingOrder && user._id && isAuthenticated()) {
            const handleRedirect = async () => {
                setIsLoginModalOpen(false)
                await new Promise(resolve => setTimeout(resolve, 300))
                handleClose()
                setTimeout(() => router.push('/order'), 300)
                setPendingOrder(false)
            }
            handleRedirect()
        }
    }, [pendingOrder, user._id, isAuthenticated, router, handleClose])

    // Закрытие по Escape
    useEffect(() => {
        if (!isOpen) return

        const handleEscape = (e: KeyboardEvent) => {
            if (e.key === 'Escape') {
                handleClose()
            }
        }

        document.addEventListener('keydown', handleEscape)
        return () => document.removeEventListener('keydown', handleEscape)
    }, [isOpen, handleClose])

    // Автоматическое скрытие ошибки через 3 секунды
    useEffect(() => {
        if (error) {
            setShowError(true)
            const timer = setTimeout(() => {
                setShowError(false)
                setTimeout(() => setError(null), 300)
            }, 3000)
            return () => clearTimeout(timer)
        } else {
            setShowError(false)
        }
    }, [error, setError])

    const totalPrice = useMemo(() => {
        return stats?.totalPrice || cartItems.reduce((t, it) => t + it.product.price * it.quantity, 0)
    }, [stats?.totalPrice, cartItems])

    const totalItems = useMemo(() => {
        return stats?.totalItems || cartItems.reduce((t, it) => t + it.quantity, 0)
    }, [stats?.totalItems, cartItems])

    if (!mounted || !isOpen) {
        return null
    }

    const modalContent = (
        <div
            className="fixed inset-0 z-50 flex items-end md:items-center justify-end"
            onClick={(e) => {
                if (e.target === e.currentTarget) {
                    handleClose()
                }
            }}
        >
            {/* Overlay */}
            <div
                className="absolute inset-0 bg-black/60 backdrop-blur-sm transition-opacity duration-300"
                onClick={handleClose}
            />

            {/* Modal Content */}
            <div
                className={`relative w-full md:w-1/2 lg:w-2/5 h-full md:h-full bg-gradient-to-br from-white/10 via-white/5 to-white/10 backdrop-blur-2xl border-t md:border-l md:border-t-0 border-white/20 shadow-2xl flex flex-col ${isClosing ? 'cart-modal-closing' : 'cart-modal-content'}`}
                style={{
                    background: 'linear-gradient(135deg, rgba(255, 255, 255, 0.1) 0%, rgba(255, 255, 255, 0.05) 50%, rgba(255, 255, 255, 0.1) 100%)',
                    backdropFilter: 'blur(30px) saturate(180%)',
                    WebkitBackdropFilter: 'blur(30px) saturate(180%)',
                    boxShadow: '0 20px 60px rgba(0, 0, 0, 0.5), 0 0 0 1px rgba(255, 255, 255, 0.1)',
                }}
                onClick={(e) => e.stopPropagation()}
            >
                {/* Loader только при первой загрузке */}
                {isInitialLoad && isLoading && (
                    <div className="absolute inset-0 z-10 flex items-center justify-center bg-black/60 backdrop-blur-sm">
                        <Loader fullScreen showText />
                    </div>
                )}

                {/* Header */}
                <div className="flex-shrink-0 flex items-center justify-between p-6 border-b border-white/10">
                    <h2 className="text-2xl md:text-3xl font-blauer-nue font-bold text-white">
                        Корзина {totalItems > 0 && <span className="text-white/60 text-lg">({totalItems})</span>}
                    </h2>
                    <button
                        onClick={handleClose}
                        className="text-white/70 hover:text-white transition-colors p-2 rounded-full hover:bg-white/10"
                        aria-label="Закрыть"
                    >
                        <XMarkIcon className="h-6 w-6" />
                    </button>
                </div>

                {/* Content - Scrollable */}
                <div className="flex-1 overflow-y-auto px-6 py-4">
                    {cartItems.length === 0 ? (
                        <div className="flex items-center justify-center h-full text-white/80">
                            <Loader src='/animations/empty.lottie' size='md' className='w-full h-full' />
                        </div>
                    ) : (
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                            {cartItems.map(({ _id, product, quantity }) => (
                                <div key={_id} className="flex flex-col gap-3">
                                    <div className="flex items-start gap-2">
                                        <div className="relative w-20 aspect-[9/16] overflow-hidden border border-white/10 flex-shrink-0">
                                            {product.photos?.[0] ? (
                                                <Image src={product.photos[0]} alt={product.name} fill className="object-cover" />
                                            ) : (
                                                <div className="w-full h-full flex items-center justify-center text-white/40">📦</div>
                                            )}
                                        </div>
                                        <div className="flex-1 min-w-0 flex flex-col justify-between " style={{ height: 'calc(5rem * 16 / 9)' }}>
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
                                            </div>

                                            <div className="flex flex-col gap-2">
                                                {/* Кнопки больше/меньше */}
                                                <div className="bg-white/5 border border-white/10 flex items-center gap-2 w-fit ">
                                                    <button
                                                        className="w-7 h-7 text-white/70 hover:text-white hover:bg-white/10 transition-colors flex items-center justify-center text-sm"
                                                        disabled={quantity === 1}
                                                        onClick={() => user?._id && updateCartItem(user._id, _id, quantity - 1)}
                                                    >
                                                        −
                                                    </button>
                                                    <span className="px-2 text-white text-xs min-w-[1.5rem] text-center font-medium">{quantity}</span>
                                                    <button
                                                        className="w-7 h-7 text-white/70 hover:text-white hover:bg-white/10 transition-colors flex items-center justify-center text-sm"
                                                        onClick={() => user?._id && updateCartItem(user._id, _id, quantity + 1)}
                                                    >
                                                        +
                                                    </button>
                                                </div>

                                                {/* Кнопка удаления */}
                                                <button
                                                    onClick={() => user?._id && removeFromCart(user._id, _id)}
                                                    className="bg-white/5 border border-white/10 w-fit py-1 px-3 text-xs text-white/70 hover:text-white hover:bg-white/10 transition-colors"
                                                    title="Удалить"
                                                >
                                                    Удалить
                                                </button>
                                            </div>
                                        </div>
                                    </div>
                                </div>
                            ))}
                        </div>
                    )}
                </div>

                {/* Footer - Fixed */}
                {cartItems.length > 0 && (
                    <div className="flex-shrink-0 border-t border-white/10 p-6 space-y-4">
                        <div className="flex items-center justify-between">
                            <span className="text-white/90 text-lg font-blauer-nue">Итого</span>
                            <span className="text-2xl font-bold text-[var(--mint-bright)]">{totalPrice.toFixed(2)} BYN</span>
                        </div>
                        <div className="flex gap-3">
                            <button
                                onClick={() => {
                                    handleClose()
                                    setTimeout(() => router.push('/catalog'), 300)
                                }}
                                className="flex-1 px-4 py-3 bg-white/10 hover:bg-white/15 text-white/90 rounded-lg border border-white/10 font-blauer-nue transition-colors"
                            >
                                Каталог
                            </button>
                            <button
                                onClick={() => {
                                    // Проверяем авторизацию
                                    if (!user._id || !isAuthenticated()) {
                                        setPendingOrder(true)
                                        setIsLoginModalOpen(true)
                                        return
                                    }
                                    handleClose()
                                    setTimeout(() => router.push('/order'), 300)
                                }}
                                disabled={cartItems.length === 0}
                                className="flex-1 px-4 py-3 bg-[var(--pink-punk)] hover:bg-[var(--pink-light)] text-white rounded-lg border border-white/10 font-blauer-nue transition-colors disabled:bg-white/10 disabled:text-white/40 disabled:cursor-not-allowed"
                            >
                                Оформить заказ
                            </button>
                        </div>
                        {cartItems.length > 0 && (
                            <button
                                onClick={() => user?._id && clearCart(user._id)}
                                className="w-full px-4 py-2 rounded-lg bg-white/10 hover:bg-white/20 text-white/70 hover:text-white font-blauer-nue border border-white/10 transition-colors text-sm"
                            >
                                Очистить корзину
                            </button>
                        )}
                    </div>
                )}
            </div>

            {/* Сообщение об ошибке по центру экрана */}
            {error && showError && (
                <div
                    className="fixed inset-0 z-[9999] flex items-center justify-center pointer-events-none"
                    style={{
                        animation: showError ? 'fadeIn 0.3s ease-out' : 'fadeOut 0.3s ease-out'
                    }}
                >
                    <div
                        className="rounded-2xl p-6 shadow-2xl max-w-md mx-4 pointer-events-auto"
                        style={{
                            background: 'var(--background)/50',
                            backdropFilter: 'blur(30px) saturate(180%)',
                            WebkitBackdropFilter: 'blur(30px) saturate(180%)',
                            boxShadow: '0 20px 60px rgba(0, 0, 0, 0.5), 0 0 0 1px rgba(255, 255, 255, 0.1)',
                        }}
                    >
                        <div className="flex items-center justify-between gap-4">
                            <p className="text-white font-medium text-center flex-1">{error}</p>
                            <button
                                className="text-white/70 hover:text-white transition-colors flex-shrink-0"
                                onClick={() => {
                                    setShowError(false)
                                    setTimeout(() => setError(null), 300)
                                }}
                                aria-label="Закрыть"
                            >
                                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                                </svg>
                            </button>
                        </div>
                    </div>
                </div>
            )}

            <style jsx global>{`
                @keyframes fadeIn {
                    from {
                        opacity: 0;
                        transform: translateY(-20px);
                    }
                    to {
                        opacity: 1;
                        transform: translateY(0);
                    }
                }
                @keyframes fadeOut {
                    from {
                        opacity: 1;
                        transform: translateY(0);
                    }
                    to {
                        opacity: 0;
                        transform: translateY(-20px);
                    }
                }
                .cart-modal-content {
                    animation: slideInRight 0.3s ease-out;
                }
                .cart-modal-closing {
                    animation: slideOutRight 0.3s ease-in;
                }
                @keyframes slideInRight {
                    from {
                        transform: translateX(100%);
                    }
                    to {
                        transform: translateX(0);
                    }
                }
                @keyframes slideOutRight {
                    from {
                        transform: translateX(0);
                    }
                    to {
                        transform: translateX(100%);
                    }
                }
                @media (max-width: 768px) {
                    .cart-modal-content {
                        animation: slideInUp 0.3s ease-out;
                    }
                    .cart-modal-closing {
                        animation: slideOutDown 0.3s ease-in;
                    }
                    @keyframes slideInUp {
                        from {
                            transform: translateY(100%);
                        }
                        to {
                            transform: translateY(0);
                        }
                    }
                    @keyframes slideOutDown {
                        from {
                            transform: translateY(0);
                        }
                        to {
                            transform: translateY(100%);
                        }
                    }
                }
            `}</style>
        </div>
    )

    // Проверяем, что document.body существует перед созданием портала
    if (typeof document === 'undefined' || !document.body) {
        return (
            <>
                {/* Telegram Login Modal */}
                <TelegramLoginModal
                    isOpen={isLoginModalOpen}
                    onClose={() => {
                        setIsLoginModalOpen(false)
                        // Если пользователь закрыл модалку без логина, очищаем pending заказ
                        if (!isAuthenticated()) {
                            setPendingOrder(false)
                        }
                    }}
                />
            </>
        )
    }

    return (
        <>
            {createPortal(modalContent, document.body)}
            {/* Telegram Login Modal */}
            <TelegramLoginModal
                isOpen={isLoginModalOpen}
                onClose={() => {
                    setIsLoginModalOpen(false)
                    // Если пользователь закрыл модалку без логина, очищаем pending заказ
                    if (!isAuthenticated()) {
                        setPendingOrder(false)
                    }
                }}
            />
        </>
    )
}

