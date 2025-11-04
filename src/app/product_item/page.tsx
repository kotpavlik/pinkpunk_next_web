'use client'

import { useEffect, useState, Suspense } from 'react'
import { useSearchParams, useRouter } from 'next/navigation'
import Image from 'next/image'
import useEmblaCarousel from 'embla-carousel-react'
import { useProductsStore } from '@/zustand/products_store/ProductsStore'
import Loader from '@/components/ui/shared/Loader'

function ProductItemContent() {
    const router = useRouter()
    const searchParams = useSearchParams()
    const productId = searchParams.get('id')
    const { currentProduct, getProductById } = useProductsStore()
    const [selectedIndex, setSelectedIndex] = useState(0)
    const [emblaRef, emblaApi] = useEmblaCarousel({
        axis: 'y',
        loop: false,
        dragFree: false,
    })
    const [currentCarouselIndex, setCurrentCarouselIndex] = useState(0)
    const [sheetPosition, setSheetPosition] = useState(0) // 0 = свернуто, 1 = развернуто
    const [isDragging, setIsDragging] = useState(false)
    const [startY, setStartY] = useState(0)
    const [windowHeight, setWindowHeight] = useState(700) // дефолтная высота для SSR
    const [isSheetActive, setIsSheetActive] = useState(false) // Флаг активности bottom sheet для немедленной блокировки
    const [contentScrollTop, setContentScrollTop] = useState(0) // Позиция прокрутки контента
    const [lastDeltaY, setLastDeltaY] = useState(0) // Последнее направление движения для определения направления свайпа

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

    useEffect(() => {
        if (productId) {
            getProductById(productId)
        }
    }, [productId, getProductById])

    // Получаем высоту окна для расчетов
    useEffect(() => {
        if (typeof window !== 'undefined') {
            setWindowHeight(window.innerHeight)
            const handleResize = () => {
                setWindowHeight(window.innerHeight)
            }
            window.addEventListener('resize', handleResize)
            return () => window.removeEventListener('resize', handleResize)
        }
    }, [])

    // Скрываем Header и Footer на мобильных устройствах и блокируем скролл body
    useEffect(() => {
        if (typeof window !== 'undefined' && window.innerWidth < 768) {
            const header = document.querySelector('header')
            const footer = document.querySelector('footer')
            const body = document.body

            if (header) {
                header.style.display = 'none'
            }
            if (footer) {
                footer.style.display = 'none'
            }
            if (body) {
                // Более надежный вариант для предотвращения прокрутки страницы в Safari
                body.style.overscrollBehaviorY = 'none'
                body.style.height = '100%'
                body.style.overflow = 'auto'
                body.style.position = 'fixed'
                body.style.width = '100%'
            }

            return () => {
                if (header) {
                    header.style.display = ''
                }
                if (footer) {
                    footer.style.display = ''
                }
                if (body) {
                    body.style.overscrollBehaviorY = ''
                    body.style.height = ''
                    body.style.overflow = ''
                    body.style.position = ''
                    body.style.width = ''
                }
            }
        }
    }, [])

    // Сброс индекса при смене товара
    useEffect(() => {
        if (currentProduct?.photos && currentProduct.photos.length > 0) {
            setSelectedIndex(0)
            setCurrentCarouselIndex(0)
        }
    }, [currentProduct?._id, currentProduct?.photos])

    // Отслеживание изменений в карусели
    useEffect(() => {
        if (!emblaApi) return

        const onSelect = () => {
            setCurrentCarouselIndex(emblaApi.selectedScrollSnap())
        }

        emblaApi.on('select', onSelect)
        onSelect() // Устанавливаем начальное значение

        return () => {
            emblaApi.off('select', onSelect)
        }
    }, [emblaApi])

    // Обновляем флаг активности bottom sheet
    useEffect(() => {
        setIsSheetActive(sheetPosition > 0 || isDragging)
    }, [sheetPosition, isDragging])

    // Отключаем карусель, когда bottom sheet открыт
    useEffect(() => {
        if (!emblaApi) return

        if (isSheetActive) {
            // Полностью блокируем карусель - синхронно
            try {
                emblaApi.reInit({
                    watchDrag: false,
                    watchResize: false,
                })
            } catch {
                // Если reInit не работает, просто игнорируем
            }
        } else {
            // Восстанавливаем карусель только если sheet полностью закрыт
            try {
                emblaApi.reInit({
                    watchDrag: true,
                    watchResize: true,
                })
            } catch {
                // Если reInit не работает, просто игнорируем
            }
        }
    }, [emblaApi, isSheetActive])

    // Обработчики для bottom sheet
    const handleTouchStart = (e: React.TouchEvent) => {
        e.stopPropagation()
        const touchY = e.touches[0].clientY
        setStartY(touchY)

        // Сразу устанавливаем флаг активности для немедленной блокировки карусели
        setIsSheetActive(true)
        setIsDragging(true)

        // Дополнительно блокируем карусель синхронно
        if (emblaApi) {
            try {
                emblaApi.reInit({
                    watchDrag: false,
                    watchResize: false,
                })
            } catch {
                // Игнорируем ошибки
            }
        }
    }

    // Обработчик для свайпа вниз в области контента
    const handleContentTouchStart = (e: React.TouchEvent) => {
        const target = e.currentTarget as HTMLElement
        const scrollTop = target.scrollTop
        setContentScrollTop(scrollTop)

        // Если контент в самом верху и bottom sheet открыт, разрешаем закрытие
        if (scrollTop === 0 && sheetPosition > 0) {
            e.stopPropagation()
            handleTouchStart(e)
        }
    }

    const handleContentTouchMove = (e: React.TouchEvent) => {
        const target = e.currentTarget as HTMLElement
        const scrollTop = target.scrollTop

        // Если контент в самом верху и делаем свайп вниз, закрываем bottom sheet
        if (scrollTop === 0 && contentScrollTop === 0 && isDragging) {
            const touchY = e.touches[0].clientY
            const deltaY = startY - touchY

            // Если свайп вниз (deltaY < 0), закрываем bottom sheet
            if (deltaY < 0) {
                e.preventDefault()
                e.stopPropagation()
                handleTouchMove(e)
            }
        }
    }

    const handleContentTouchEnd = (e: React.TouchEvent) => {
        // Если мы перетаскивали bottom sheet из области контента, завершаем перетаскивание
        if (isDragging && contentScrollTop === 0 && sheetPosition > 0) {
            e.stopPropagation()
            handleTouchEnd()
        }
    }

    const handleTouchMove = (e: React.TouchEvent) => {
        if (!isDragging) return
        e.preventDefault()
        e.stopPropagation()
        const touchY = e.touches[0].clientY
        const deltaY = startY - touchY // Положительное значение = движение вверх (открытие), отрицательное = движение вниз (закрытие)

        // Сохраняем направление движения
        setLastDeltaY(deltaY)

        // Максимальная высота = 70% экрана
        const maxHeight = windowHeight * 0.7
        // Увеличиваем чувствительность для закрытия (свайп вниз)
        // При свайпе вниз делаем движение более чувствительным
        const sensitivity = deltaY < 0 ? 1.5 : 1 // Увеличиваем чувствительность для закрытия
        const newPosition = Math.max(0, Math.min(1, sheetPosition + (deltaY * sensitivity / maxHeight)))
        setSheetPosition(newPosition)
        setStartY(touchY) // Обновляем начальную позицию для следующего движения
    }

    const handleTouchEnd = () => {
        setIsDragging(false)

        // Определяем направление последнего движения
        const isSwipeDown = lastDeltaY < 0

        // Если делали свайп вниз, закрываем при меньшем пороге (15%)
        // Если делали свайп вверх, открываем при большем пороге (25%)
        if (isSwipeDown) {
            // Свайп вниз - закрываем при позиции меньше 0.15 (15%)
            if (sheetPosition < 0.15) {
                setSheetPosition(0)
                // Восстанавливаем карусель только если sheet закрыт
                if (emblaApi) {
                    emblaApi.reInit({
                        watchDrag: true,
                        watchResize: true,
                    })
                }
            } else {
                // Если не закрыли полностью, возвращаем к открытому состоянию
                setSheetPosition(1)
            }
        } else {
            // Свайп вверх - открываем при позиции больше 0.25 (25%)
            if (sheetPosition > 0.25) {
                setSheetPosition(1)
            } else {
                setSheetPosition(0)
                // Восстанавливаем карусель только если sheet закрыт
                if (emblaApi) {
                    emblaApi.reInit({
                        watchDrag: true,
                        watchResize: true,
                    })
                }
            }
        }

        setStartY(0)
        setLastDeltaY(0)
    }

    if (!productId) {
        return (
            <div className="relative md:max-w-[100vw] md:px-0 min-h-screen mb-20">
                <div className="text-white text-center py-20">
                    <h1 className="text-2xl font-blauer-nue">Товар не найден</h1>
                    <p className="text-white/60 mt-2">ID товара не указан</p>
                </div>
            </div>
        )
    }

    if (!currentProduct) {
        return <Loader fullScreen showText />
    }

    return (
        <div className="fixed md:relative inset-0 md:inset-auto min-h-screen w-full md:w-[90vw] md:m-auto md:mb-20 md:pb-20 md:pt-0 z-20 md:z-auto m-0 p-0">
            <div className="relative h-full text-white pt-0 md:pt-24 pb-0 md:pb-16 flex flex-col md:flex-row gap-0 md:gap-20 items-start m-0 p-0 md:p-0">

                {currentProduct.photos && currentProduct.photos.length > 0 && (
                    <div className="w-full md:w-auto flex flex-col md:flex-row gap-2 md:items-start md:flex-nowrap">
                        {/* Main photo */}
                        <div
                            className="fixed md:relative inset-0 w-full h-screen md:flex-1 md:h-[90vh] md:min-w-[400px] md:overflow-hidden z-10"
                            style={{
                                pointerEvents: isSheetActive ? 'none' : 'auto',
                                touchAction: isSheetActive ? 'none' : 'auto',
                            }}
                        >
                            {/* Back button - Mobile only */}
                            <button
                                onClick={() => router.back()}
                                className="md:hidden absolute top-4 left-4 z-30 w-10 h-10 rounded-full flex items-center justify-center bg-black/30 backdrop-blur-sm border border-white/20 hover:bg-black/50 transition-colors"
                                style={{
                                    WebkitTouchCallout: 'none',
                                    WebkitUserSelect: 'none',
                                    userSelect: 'none',
                                    touchAction: 'manipulation',
                                    WebkitTapHighlightColor: 'transparent',
                                    pointerEvents: 'auto',
                                }}
                            >
                                <svg
                                    className="w-6 h-6 text-white"
                                    fill="none"
                                    stroke="currentColor"
                                    viewBox="0 0 24 24"
                                >
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
                                </svg>
                            </button>

                            {/* Mobile: vertical swipe carousel */}
                            <div
                                className="md:hidden relative w-full h-full"
                                ref={emblaRef}
                                style={{
                                    pointerEvents: isSheetActive ? 'none' : 'auto',
                                    touchAction: isSheetActive ? 'none' : 'pan-y',
                                    WebkitTouchCallout: 'none',
                                    WebkitUserSelect: 'none',
                                    userSelect: 'none',
                                    overflow: isSheetActive ? 'hidden' : 'auto',
                                    position: 'relative',
                                }}
                                onTouchStart={(e) => {
                                    // Если bottom sheet активен, полностью блокируем
                                    if (isSheetActive) {
                                        e.preventDefault()
                                        e.stopPropagation()
                                        if (e.nativeEvent) {
                                            e.nativeEvent.stopImmediatePropagation?.()
                                        }
                                    }
                                }}
                                onTouchMove={(e) => {
                                    // Если bottom sheet активен, полностью блокируем
                                    if (isSheetActive) {
                                        e.preventDefault()
                                        e.stopPropagation()
                                        if (e.nativeEvent) {
                                            e.nativeEvent.stopImmediatePropagation?.()
                                        }
                                    }
                                }}
                                onTouchEnd={(e) => {
                                    // Если bottom sheet активен, блокируем
                                    if (isSheetActive) {
                                        e.preventDefault()
                                        e.stopPropagation()
                                        if (e.nativeEvent) {
                                            e.nativeEvent.stopImmediatePropagation?.()
                                        }
                                    }
                                }}
                            >
                                <div
                                    className="flex flex-col h-full"
                                    style={{
                                        pointerEvents: isSheetActive ? 'none' : 'auto',
                                        touchAction: isSheetActive ? 'none' : 'auto',
                                    }}
                                >
                                    {currentProduct.photos.map((photo, idx) => (
                                        <div
                                            key={idx}
                                            className="relative min-h-0 flex-[0_0_100vh] w-full h-screen"
                                            style={{
                                                pointerEvents: isSheetActive ? 'none' : 'auto',
                                                touchAction: isSheetActive ? 'none' : 'auto',
                                            }}
                                        >
                                            <Image
                                                src={getImageUrl(photo)}
                                                alt={`${currentProduct.name} ${idx + 1}`}
                                                fill
                                                sizes="(max-width: 768px) 100vw, 50vw"
                                                className="object-cover w-full h-full"
                                                priority={idx === 0}
                                                quality={95}
                                                style={{
                                                    pointerEvents: isSheetActive ? 'none' : 'auto',
                                                    touchAction: isSheetActive ? 'none' : 'auto',
                                                }}
                                            />
                                        </div>
                                    ))}
                                </div>
                                {/* Mobile indicators */}
                                {currentProduct.photos.length > 1 && (
                                    <div className="absolute left-4 top-1/2 -translate-y-1/2 z-10 flex flex-col gap-2">
                                        {currentProduct.photos.map((_, idx) => (
                                            <div
                                                key={idx}
                                                className={`w-2 h-2 rounded-full transition-all duration-300 ${currentCarouselIndex === idx
                                                    ? 'bg-[var(--color-green)]'
                                                    : 'bg-[var(--green)]/50'
                                                    }`}
                                            />
                                        ))}
                                    </div>
                                )}
                            </div>
                            {/* Desktop: static image */}
                            <div className="hidden md:block relative w-full h-full">
                                {currentProduct.photos[selectedIndex] && (
                                    <div className="relative w-full h-full">
                                        <Image
                                            key={selectedIndex}
                                            src={getImageUrl(currentProduct.photos[selectedIndex])}
                                            alt={`${currentProduct.name} ${selectedIndex + 1}`}
                                            fill
                                            sizes="50vw"
                                            className="object-contain object-top transition-opacity duration-700 ease-in-out"
                                            priority={selectedIndex === 0}
                                            quality={95}
                                        />
                                    </div>
                                )}
                            </div>
                        </div>

                        {/* Thumbnails navigation */}
                        {currentProduct.photos.length > 1 && (
                            <div className="md:flex md:flex-col gap-2 overflow-x-auto md:overflow-x-visible md:overflow-y-auto md:h-[90vh] md:flex-shrink-0 pb-2 md:pb-0 hidden">
                                {currentProduct.photos.map((photo, idx) => (
                                    <button
                                        key={idx}
                                        onClick={() => setSelectedIndex(idx)}
                                        className={`relative flex-shrink-0  w-9 h-16 md:w-11 md:h-18 overflow-hidden border-[1px] transition-all duration-300  ${selectedIndex === idx
                                            ? 'border-[var(--mint-dark)] bg-white/10'
                                            : 'border-white/20 bg-white/5 hover:border-white/40'
                                            }`}
                                    >
                                        <Image
                                            src={getImageUrl(photo)}
                                            alt={`${currentProduct.name} миниатюра ${idx + 1}`}
                                            fill
                                            sizes="96px"
                                            className="object-cover"
                                            quality={80}
                                        />
                                    </button>
                                ))}
                            </div>
                        )}
                    </div>
                )}

                {/* Desktop only content */}
                <div className="hidden md:block w-full md:w-1/2">
                    <h1 className="text-3xl font-blauer-nue font-bold mb-4">{currentProduct.name}</h1>
                    <p className="text-white/80 mb-4">{currentProduct.description}</p>
                    <p className="text-2xl font-bold text-[var(--mint-dark)] mb-4">
                        {currentProduct.price.toLocaleString('ru-RU')} BYN
                    </p>
                    <p className="text-white/60 mb-2">
                        В наличии: {currentProduct.stockQuantity} шт.
                    </p>
                    <p className="text-white/60 mb-4">Размер: {currentProduct.size}</p>
                </div>
            </div>

            {/* Mobile fixed button - always visible */}
            <div className="md:hidden fixed bottom-0 left-0 w-full z-50">
                <div className="px-4 py-3" >
                    <button className="w-full py-4 flex items-center justify-around bg-[var(--mint-dark)]/70 font-blauer-nue rounded-lg">
                        <div className="text-white text-sm font-bold">Добавить в корзину</div>
                        <div className="text-white text-xl font-bold">
                            {currentProduct.price.toLocaleString('ru-RU')}
                            <span className="text-white ml-1 text-sm font-bold">BYN</span>
                        </div>
                    </button>
                </div>
            </div>

            {/* Mobile bottom sheet - pull to expand */}
            <div
                className="md:hidden fixed left-0 w-full z-40"
                style={{
                    bottom: '-1px',
                    top: `${80 + (1 - sheetPosition) * (windowHeight - 80 - 20 - 120)}px`,
                    transition: isDragging ? 'none' : 'top 0.3s ease-out',
                }}
            >
                <div
                    className="rounded-t-3xl relative overflow-hidden h-full"
                    style={{
                        background: 'rgba(255, 255, 255, 0.1)',
                        backdropFilter: 'blur(20px) saturate(180%)',
                        WebkitBackdropFilter: 'blur(20px) saturate(180%)',
                        borderTop: '1px solid var(--mint-dark)',
                        touchAction: 'pan-y',
                        WebkitTouchCallout: 'none',
                        WebkitUserSelect: 'none',
                        userSelect: 'none',
                    }}
                    onTouchStart={(e) => {
                        e.stopPropagation()
                        handleTouchStart(e)
                    }}
                    onTouchMove={(e) => {
                        e.stopPropagation()
                        handleTouchMove(e)
                    }}
                    onTouchEnd={(e) => {
                        e.stopPropagation()
                        handleTouchEnd()
                    }}
                >
                    {/* Drag handle */}
                    <div className="sticky top-0   w-full flex items-center justify-center z-10 pt-2 pb-2">
                        <span className="w-12 h-[3px] bg-[var(--mint-dark)] rounded-full"></span>
                    </div>

                    {/* Scrollable content container */}
                    <div
                        className="relative overflow-y-auto h-full"
                        style={{

                            maxHeight: 'calc(100% - 0px)',
                            maskImage: 'linear-gradient(to bottom, transparent 0px, transparent 200px, black 200px, black calc(100% - 80px), transparent calc(100% - 80px))',
                            WebkitMaskImage: 'linear-gradient(to bottom,   black calc(100% - 90px), transparent calc(100% - 90px))',
                        }}
                        onTouchStart={handleContentTouchStart}
                        onTouchMove={handleContentTouchMove}
                        onTouchEnd={handleContentTouchEnd}
                        onScroll={(e) => {
                            const target = e.currentTarget as HTMLElement
                            setContentScrollTop(target.scrollTop)
                        }}
                    >
                        {/* Content */}
                        <div className="relative w-full pt-2 pb-4 px-4">
                            {/* Always visible: Product name */}
                            <div className="text-white text-xl font-blauer-nue font-bold mb-4 text-center">
                                {currentProduct.name}
                            </div>

                            {/* Expandable content */}
                            <div
                                className="overflow-hidden"
                                style={{
                                    maxHeight: sheetPosition > 0 ? '1000px' : '0',
                                    transition: 'maxHeight 0.3s ease-out',
                                }}
                            >
                                <div className="space-y-4 pb-4">
                                    {/* Описание */}
                                    {currentProduct.description && (
                                        <div>
                                            <p className="text-white font-bold text-sm mb-2">Описание:</p>
                                            <p className="text-white/80 text-sm">{currentProduct.description}</p>
                                        </div>
                                    )}

                                    {/* Характеристики */}
                                    <div className="space-y-2">
                                        <p className="text-white font-bold text-sm mb-2">Характеристики:</p>
                                        <div className="space-y-1">
                                            <p className="text-white/60 text-sm">
                                                Артикул: <span className="text-white">{currentProduct.productId}</span>
                                            </p>
                                            {currentProduct.category && (
                                                <p className="text-white/60 text-sm">
                                                    Категория: <span className="text-white">
                                                        {typeof currentProduct.category === 'string'
                                                            ? currentProduct.category
                                                            : currentProduct.category.name}
                                                    </span>
                                                </p>
                                            )}
                                            <p className="text-white/60 text-sm">
                                                Размер: <span className="text-white">{currentProduct.size}</span>
                                            </p>
                                            <p className="text-white/60 text-sm">
                                                В наличии: <span className="text-white">{currentProduct.stockQuantity} шт.</span>
                                            </p>
                                        </div>
                                    </div>

                                    {/* Цена */}
                                    <div className="flex items-center justify-between pt-2 border-t border-white/10">
                                        <p className="text-white/60 text-sm">Цена:</p>
                                        <p className="text-2xl font-bold text-[var(--mint-dark)]">
                                            {currentProduct.price.toLocaleString('ru-RU')} BYN
                                        </p>
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            </div>

        </div >
    )
}

export default function ProductItem() {
    return (
        <Suspense fallback={<Loader fullScreen showText />}>
            <ProductItemContent />
        </Suspense>
    )
}