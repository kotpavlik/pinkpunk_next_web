'use client'

import { useEffect, useMemo, useState } from "react";
import Image from 'next/image'
import Link from 'next/link'
import { useProductsStore } from "@/zustand/products_store/ProductsStore";
import { useUserStore } from "@/zustand/user_store/UserStore";
import { useAppStore } from "@/zustand/app_store/AppStore";
import Loader from "@/components/ui/shared/Loader";

const Catalog = () => {
    const { products, getProducts } = useProductsStore()
    const isAdmin = useUserStore((state) => state.user.isAdmin)
    const status = useAppStore((state) => state.status)
    const [isLoading, setIsLoading] = useState(true)
    const [isInitialLoad, setIsInitialLoad] = useState(true)

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

    // Показываем loader если:
    // 1. Статус загрузки в AppStore
    // 2. Локальная загрузка активна
    // 3. Первоначальная загрузка
    // 4. Нет продуктов и статус не failed (значит еще загружается)
    const shouldShowLoader = status === 'loading' || isLoading || isInitialLoad || (safeProducts.length === 0 && status !== 'failed')

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
                                return (
                                    <div key={product._id} className="group relative bg-white/5 backdrop-blur-sm border border-white/10 overflow-hidden">
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
                                                    <button className="px-3 py-2  bg-[var(--mint-dark)]/70 hover:bg-[var(--green)]/80 font-bold text-white text-xs md:text-sm backdrop-blur-sm border border-white/10 font-blauer-nue">
                                                        в корзину
                                                    </button>
                                                </div>

                                                {/* Bottom info slide-up like CarouselSection */}

                                                <div className="absolute bottom-0 left-0 right-0 cursor-default backdrop-blur-sm transition-transform duration-300 translate-y-[calc(100%-4rem)] group-hover:translate-y-0">
                                                    <div className="p-4 pb-8">
                                                        <div className="flex items-center justify-between ">
                                                            <h3 className="font-blauer-nue text-sm md:text-base font-semibold line-clamp-2">
                                                                {product.name}
                                                            </h3>
                                                            <p className="font-blauer-nue text-base md:text-lg font-bold text-[var(--mint-dark)]">
                                                                {product.price.toLocaleString('ru-RU')} BYN
                                                            </p>
                                                        </div>

                                                        <div className="display md:block hidden text-white/50">
                                                            <p className="font-blauer-nue pb-2 text-xs text-white/50">
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

            {/* notifications are omitted here */}
        </div>
    );
}

export default Catalog;