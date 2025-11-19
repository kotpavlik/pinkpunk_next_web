'use client'

import { useEffect, useMemo, useState } from "react";
import Image from 'next/image'
import Link from 'next/link'
import { useProductsStore } from "@/zustand/products_store/ProductsStore";
import { useUserStore } from "@/zustand/user_store/UserStore";
import { useAppStore } from "@/zustand/app_store/AppStore";
import { useCartStore } from "@/zustand/cart_store/CartStore";
import Loader from "@/components/ui/shared/Loader";
import TelegramLoginModal from "@/components/ui/shared/TelegramLoginModal";
import { ProductResponse } from "@/api/ProductApi";

const Catalog = () => {
    const { products, getProducts } = useProductsStore()
    const { user, isAuthenticated } = useUserStore()
    const { addToCart, error: cartError, setError: setCartError, isLoading: isCartLoading } = useCartStore()
    const isAdmin = useUserStore((state) => state.user.isAdmin)
    const status = useAppStore((state) => state.status)
    const [isLoading, setIsLoading] = useState(true)
    const [isInitialLoad, setIsInitialLoad] = useState(true)
    const [isLoginModalOpen, setIsLoginModalOpen] = useState(false)
    const [pendingProduct, setPendingProduct] = useState<{ productId: string; quantity: number } | null>(null)
    const [isAddingToCart, setIsAddingToCart] = useState<{ [key: string]: boolean }>({})
    const [showError, setShowError] = useState(false)

    // notifications removed in this page version; handled elsewhere if needed

    // no-op placeholders removed

    useEffect(() => {
        const loadProducts = async () => {
            try {
                setIsLoading(true)
                setIsInitialLoad(true)
                // Админы видят все товары (включая неактивные), клиенты - только активные
                await getProducts(isAdmin)
            } catch {
                // no-op
            } finally {
                setIsLoading(false)
                // Добавляем небольшую задержку для отображения loader при первой загрузке
                setTimeout(() => {
                    setIsInitialLoad(false)
                }, 300)
            }
        }
        loadProducts()
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [isAdmin])

    const safeProducts = useMemo(() => products || [], [products])

    // Автоматическое отображение ошибки из корзины
    useEffect(() => {
        if (cartError) {
            setShowError(true)
            const timer = setTimeout(() => {
                setShowError(false)
                setTimeout(() => setCartError(null), 300)
            }, 5000) // Показываем ошибку 5 секунд
            return () => clearTimeout(timer)
        } else {
            setShowError(false)
        }
    }, [cartError, setCartError])

    // Обработка добавления товара после логина
    useEffect(() => {
        if (pendingProduct && user._id && isAuthenticated()) {
            const handleAddToCart = async () => {
                const productKey = pendingProduct.productId
                if (isAddingToCart[productKey]) {
                    return // Предотвращаем повторные нажатия
                }

                try {
                    setIsAddingToCart(prev => ({ ...prev, [productKey]: true }))

                    // Закрываем модалку логина
                    setIsLoginModalOpen(false)

                    // Небольшая задержка для закрытия модалки
                    await new Promise(resolve => setTimeout(resolve, 300))

                    if (!user._id) return

                    const success = await addToCart(user._id, pendingProduct.productId, pendingProduct.quantity)

                    if (success) {
                        // Скроллим к товару по центру экрана
                        setTimeout(() => {
                            const productElement = document.querySelector(`[data-product-id="${pendingProduct.productId}"]`)
                            if (productElement) {
                                productElement.scrollIntoView({ behavior: 'smooth', block: 'center' })
                            }
                        }, 100)
                    }

                    setPendingProduct(null)
                } catch (error) {
                    console.error('Ошибка при добавлении товара в корзину:', error)
                } finally {
                    setIsAddingToCart(prev => ({ ...prev, [productKey]: false }))
                }
            }
            handleAddToCart()
        }
    }, [pendingProduct, user._id, isAuthenticated, addToCart, isAddingToCart])

    const handleAddToCartClick = async (e: React.MouseEvent, product: ProductResponse) => {
        e.preventDefault()
        e.stopPropagation()

        // Проверяем авторизацию
        if (!user._id || !isAuthenticated()) {
            // Сохраняем информацию о товаре для добавления после логина
            setPendingProduct({
                productId: product.productId,
                quantity: 1
            })
            setIsLoginModalOpen(true)
            return
        }

        const productKey = product.productId
        if (isAddingToCart[productKey]) {
            return // Предотвращаем повторные нажатия
        }

        // Если авторизован, добавляем сразу
        if (!user._id) return

        try {
            setIsAddingToCart(prev => ({ ...prev, [productKey]: true }))
            const success = await addToCart(user._id, product.productId, 1)

            if (success) {
                // Скроллим к товару по центру экрана
                const productElement = document.querySelector(`[data-product-id="${product.productId}"]`)
                if (productElement) {
                    productElement.scrollIntoView({ behavior: 'smooth', block: 'center' })
                }
            }
        } catch (error) {
            console.error('Ошибка при добавлении товара в корзину:', error)
        } finally {
            setIsAddingToCart(prev => ({ ...prev, [productKey]: false }))
        }
    }

    const handleRefresh = async () => {
        try {
            setIsLoading(true)
            await getProducts(isAdmin)
        } catch {
            // no-op
        } finally {
            // Добавляем небольшую задержку, чтобы loader был виден
            setTimeout(() => {
                setIsLoading(false)
            }, 500)
        }
    }

    // Показываем loader только при загрузке продуктов, НЕ при операциях с корзиной
    // 1. Локальная загрузка активна (только для продуктов)
    // 2. Первоначальная загрузка
    // 3. Нет продуктов и статус не failed (значит еще загружается)
    // Исключаем операции с корзиной - они не должны показывать fullscreen loader
    const shouldShowLoader = (isLoading || isInitialLoad || (safeProducts.length === 0 && status !== 'failed')) && !isCartLoading

    if (shouldShowLoader) {
        return <Loader fullScreen showText />
    }

    return (
        <div className="relative md:max-w-[100vw]  md:px-0  min-h-screen mb-20">
            <div className="relative w-full pt-24 pb-16">
                <header className="flex items-end justify-between mb-2">
                    <h1 className="text-2xl md:text-4xl ml-6 font-blauer-nue font-bold text-white">
                        Каталог
                        {safeProducts.length > 0 && (
                            <span className="ml-3 align-middle text-lg md:text-2xl font-normal text-white/60">({safeProducts.length})</span>
                        )}
                    </h1>

                </header>

                <section className="">
                    {safeProducts.length === 0 ? (
                        <div className="flex items-center justify-center min-h-[300px]">
                            <div className="text-center">
                                <div className="text-white text-lg  mb-4">Каталог пуст</div>
                                <button
                                    onClick={handleRefresh}
                                    className="px-4 py-2 rounded-lg bg-[var(--mint-bright)]/90 hover:bg-[var(--mint-bright)] text-black font-blauer-nue transition-colors"
                                    disabled={isLoading}
                                >
                                    Обновить каталог
                                </button><data value=""></data>
                            </div>
                        </div>
                    ) : (
                        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-1 p-1">
                            {safeProducts.map(product => {
                                if (!product || !product._id) return null
                                const firstPhoto = product.photos?.[0]
                                const secondPhoto = product.photos && product.photos.length > 1 ? product.photos[1] : null
                                const productKey = product.productId
                                const isAdding = isAddingToCart[productKey] || false
                                return (
                                    <div key={product._id} className="group relative overflow-hidden" data-product-id={product.productId}>
                                        <Link href={`/product_item?id=${product._id}`} className="block">
                                            <div className="relative w-full aspect-[4/6]  bg-white/3">
                                                {/* default image */}
                                                {firstPhoto ? (
                                                    <Image
                                                        src={firstPhoto}
                                                        alt={product.name}
                                                        fill
                                                        sizes="(max-width: 768px) 100vw, (max-width: 1024px) 50vw, 25vw"
                                                        className="object-cover transition-opacity duration-300"
                                                        priority={false}
                                                    />
                                                ) : (
                                                    <div className="w-full h-full flex items-center justify-center text-white/40">📦</div>
                                                )}
                                                {/* hover image */}
                                                {secondPhoto && (
                                                    <Image
                                                        src={secondPhoto}
                                                        alt={`${product.name} alt`}
                                                        fill
                                                        sizes="(max-width: 768px) 100vw, (max-width: 1024px) 50vw, 25vw"
                                                        className="object-cover opacity-0 group-hover:opacity-100 transition-opacity duration-500"
                                                    />
                                                )}

                                                {/* Add to cart button (always visible on mobile, hover on md+) */}
                                                <div className="absolute top-3 right-3 z-10 opacity-100 md:opacity-0 md:group-hover:opacity-100 transition-all duration-300 transform md:-translate-y-2 md:group-hover:translate-y-0">
                                                    <button
                                                        type="button"
                                                        onClick={(e) => handleAddToCartClick(e, product)}
                                                        disabled={isAdding || product.stockQuantity === 0}
                                                        className="px-3 py-2 rounded-md bg-[var(--mint-dark)]/70 hover:bg-[var(--green)]/80 text-white text-xs md:text-sm backdrop-blur-sm border border-white/10 shadow-md font-blauer-nue disabled:opacity-50 disabled:cursor-not-allowed"
                                                        aria-label="Добавить в корзину"
                                                    >
                                                        {isAdding ? '...' : 'в корзину'}
                                                    </button>
                                                </div>

                                                {/* Bottom info slide-up like CarouselSection */}

                                                <div className="absolute bottom-0  left-0 right-0 cursor-default transition-transform duration-300 md:translate-y-[calc(100%-4.5rem)] translate-y-[calc(100%-3.5rem)] group-hover:translate-y-0"
                                                    style={{
                                                        background: 'var(--background)',
                                                        borderTop: '1px solid var(--mint-dark)',
                                                    }}>
                                                    <div className="p-4 md:pb-2 pb-10">
                                                        <div className="flex items-center justify-between ">
                                                            <h3 className="font-blauer-nue text-sm md:text-base font-semibold line-clamp-2">
                                                                {product.name}
                                                            </h3>
                                                            <p className="font-blauer-nue text-base md:text-lg font-bold text-[var(--mint-dark)]">
                                                                {product.price.toLocaleString('ru-RU')} BYN
                                                            </p>
                                                        </div>

                                                        <div className="display md:block hidden text-white/50">
                                                            <p className="font-blauer-nue pb-4 text-xs text-white/50">
                                                                сейчас в наличии: {product.stockQuantity} шт.
                                                            </p>
                                                            <p className="font-blauer-nue text-xs pb-2  ">
                                                                {product.description}
                                                            </p>
                                                        </div>
                                                    </div>
                                                </div>
                                            </div>
                                        </Link>
                                    </div>
                                )
                            }).filter(Boolean)}
                        </div>
                    )}
                </section>
            </div>

            {/* Модалка логина */}
            <TelegramLoginModal
                isOpen={isLoginModalOpen}
                onClose={() => {
                    setIsLoginModalOpen(false)
                    // Если пользователь закрыл модалку без логина, очищаем pending продукт
                    if (!isAuthenticated()) {
                        setPendingProduct(null)
                    }
                }}
            />

            {/* Сообщение об ошибке */}
            {cartError && showError && (
                <div
                    className="fixed inset-0 z-[9999] flex items-center justify-center pointer-events-none"
                    style={{
                        animation: showError ? 'fadeIn 0.3s ease-out' : 'fadeOut 0.3s ease-out'
                    }}
                >
                    <div
                        className="rounded-2xl p-6 shadow-2xl max-w-md mx-4 pointer-events-auto"
                        style={{
                            background: 'rgba(0, 0, 0, 0.8)',
                            backdropFilter: 'blur(30px) saturate(180%)',
                            WebkitBackdropFilter: 'blur(30px) saturate(180%)',
                            boxShadow: '0 20px 60px rgba(0, 0, 0, 0.5), 0 0 0 1px rgba(255, 255, 255, 0.1)',
                            border: '1px solid rgba(255, 255, 255, 0.1)',
                        }}
                    >
                        <div className="flex items-center justify-between gap-4">
                            <p className="text-white font-blauer-nue font-medium text-center flex-1">{cartError}</p>
                            <button
                                className="text-white/70 hover:text-white transition-colors flex-shrink-0"
                                onClick={() => {
                                    setShowError(false)
                                    setTimeout(() => setCartError(null), 300)
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
            `}</style>

            {/* notifications are omitted here */}
        </div>
    );
}

export default Catalog;