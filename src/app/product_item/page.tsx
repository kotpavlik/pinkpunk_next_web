'use client'

import { useEffect, useMemo, useState, Suspense, useRef, useCallback } from 'react'
import { useSearchParams, useRouter } from 'next/navigation'
import useEmblaCarousel from 'embla-carousel-react'
import { useProductsStore } from '@/zustand/products_store/ProductsStore'
import { useUserStore } from '@/zustand/user_store/UserStore'
import { useCartStore } from '@/zustand/cart_store/CartStore'
import Loader from '@/components/ui/shared/Loader'
import TelegramLoginModal from '@/components/ui/shared/LazyTelegramLoginModal'
import ProductImage from '@/components/ui/product/ProductImage'
import { useImagePreload } from '@/hooks/useImagePreload'

/** Совпадает с верхним отступом до галереи на десктопе (`top-24` под хедер) */
const DESKTOP_STICKY_TOP_PX = 96
/** Вертикальный зазор между фото на десктопе (`gap-2`); учитывается в пороге скролла правой колонки */
const DESKTOP_GALLERY_GAP_PX = 8

function ProductItemContent() {
    const router = useRouter()
    const searchParams = useSearchParams()
    const productId = searchParams.get('id')
    const { currentProduct, getProductById } = useProductsStore()
    const { user, isAuthenticated } = useUserStore()
    const { addToCart, error: cartError, setError: setCartError } = useCartStore()
    const [emblaRef, emblaApi] = useEmblaCarousel({
        axis: 'y',
        loop: false,
        dragFree: false,
        align: 'start',
    })
    const [currentCarouselIndex, setCurrentCarouselIndex] = useState(0)
    const [sheetPosition, setSheetPosition] = useState(0) // 0 = свернуто, 1 = развернуто
    const [isDragging, setIsDragging] = useState(false)
    const [startY, setStartY] = useState(0)
    const [windowHeight, setWindowHeight] = useState(700) // дефолтная высота для SSR
    const [isSheetActive, setIsSheetActive] = useState(false) // Флаг активности bottom sheet для немедленной блокировки
    const [contentScrollTop, setContentScrollTop] = useState(0) // Позиция прокрутки контента
    const [, setLastDeltaY] = useState(0) // Последнее направление движения для определения направления свайпа
    const [isLoginModalOpen, setIsLoginModalOpen] = useState(false)
    const [pendingProduct, setPendingProduct] = useState<{ productId: string; quantity: number } | null>(null)
    const [isAddingToCart, setIsAddingToCart] = useState(false)
    const [showError, setShowError] = useState(false)
    const sheetRef = useRef<HTMLDivElement>(null)
    const dragHandleRef = useRef<HTMLSpanElement>(null)
    const desktopGalleryRootRef = useRef<HTMLDivElement>(null)
    const mobileEmblaSlidesRef = useRef<HTMLDivElement>(null)
    const desktopRightPanelRef = useRef<HTMLDivElement>(null)
    /** На десктопе: блок характеристик крутится только после прокрутки всех фото */
    const [desktopRightScrollUnlocked, setDesktopRightScrollUnlocked] = useState(false)

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

    // Предзагрузка всех изображений товара в фоне
    const imageUrls = useMemo(() => {
        if (!currentProduct || currentProduct._id !== productId) {
            return []
        }

        return currentProduct.photos?.map(photo => getImageUrl(photo)) || []
    }, [currentProduct, productId])
    useImagePreload(imageUrls)

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

                body.style.overflow = 'hidden'
                body.style.position = 'fixed'
                body.style.width = '100%'
                body.style.overscrollBehaviorY = 'none'
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

    useEffect(() => {
        setCurrentCarouselIndex(0)
    }, [currentProduct?._id, currentProduct?.photos])

    useEffect(() => {
        if (currentProduct?.photos && currentProduct.photos.length > 0 && currentCarouselIndex >= currentProduct.photos.length) {
            setCurrentCarouselIndex(0)
        }
    }, [currentProduct?.photos, currentCarouselIndex])

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

    const syncDesktopGalleryFromScroll = useCallback(() => {
        if (typeof window === 'undefined' || window.innerWidth < 768) return

        const root = desktopGalleryRootRef.current
        const photos = currentProduct?.photos
        if (!photos?.length) {
            setDesktopRightScrollUnlocked(true)
            return
        }
        if (!root) return

        const rect = root.getBoundingClientRect()
        const scrolledPastPin = DESKTOP_STICKY_TOP_PX - rect.top

        if (photos.length <= 1) {
            setDesktopRightScrollUnlocked(true)
            return
        }

        if (scrolledPastPin < 0) {
            setDesktopRightScrollUnlocked(false)
            return
        }

        const slides = Array.from(root.children) as HTMLElement[]
        if (slides.length !== photos.length) {
            return
        }

        let sumPrevHeights = 0
        let slidesBeforeLastReady = true
        for (let i = 0; i < slides.length - 1; i++) {
            const h = slides[i].offsetHeight
            if (h < 4) slidesBeforeLastReady = false
            sumPrevHeights += h
        }

        const gapContribution = Math.max(0, slides.length - 1) * DESKTOP_GALLERY_GAP_PX
        const unlockThreshold = sumPrevHeights + gapContribution

        const unlocked =
            slidesBeforeLastReady && sumPrevHeights > 0 && scrolledPastPin >= unlockThreshold - 1
        setDesktopRightScrollUnlocked((prev) => (prev === unlocked ? prev : unlocked))
    }, [currentProduct?.photos])

    useEffect(() => {
        if (typeof window === 'undefined') return

        const run = () => syncDesktopGalleryFromScroll()

        window.addEventListener('scroll', run, { passive: true })
        window.addEventListener('resize', run)
        run()

        return () => {
            window.removeEventListener('scroll', run)
            window.removeEventListener('resize', run)
        }
    }, [syncDesktopGalleryFromScroll])

    useEffect(() => {
        const root = desktopGalleryRootRef.current
        if (!root || typeof ResizeObserver === 'undefined') return

        const ro = new ResizeObserver(() => syncDesktopGalleryFromScroll())
        ro.observe(root)
        return () => ro.disconnect()
    }, [syncDesktopGalleryFromScroll, currentProduct?._id])

    useEffect(() => {
        syncDesktopGalleryFromScroll()
    }, [syncDesktopGalleryFromScroll])

    useEffect(() => {
        const node = mobileEmblaSlidesRef.current
        if (!node || !emblaApi || typeof ResizeObserver === 'undefined') return

        const ro = new ResizeObserver(() => {
            requestAnimationFrame(() => {
                try {
                    emblaApi.reInit()
                } catch {
                    /* ignore */
                }
            })
        })
        ro.observe(node)
        return () => ro.disconnect()
    }, [emblaApi, currentProduct?._id])

    useEffect(() => {
        if (!desktopRightScrollUnlocked && desktopRightPanelRef.current) {
            desktopRightPanelRef.current.scrollTop = 0
        }
    }, [desktopRightScrollUnlocked])

    useEffect(() => {
        setDesktopRightScrollUnlocked(false)
        requestAnimationFrame(() => {
            syncDesktopGalleryFromScroll()
        })
    }, [currentProduct?._id, syncDesktopGalleryFromScroll])

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
    const handleTouchStart = useCallback((e: TouchEvent) => {
        // Проверяем, не был ли клик на span (drag handle)
        const target = e.target as HTMLElement
        if (target.tagName === 'SPAN' || target.closest('span')) {
            // Если клик на span, не обрабатываем здесь - пусть onClick/onTouchStart на span обработает
            return
        }

        e.preventDefault() // Предотвращаем дефолтное поведение сразу
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
    }, [emblaApi])

    // Обработчик для свайпа вниз в области контента
    const handleContentTouchStart = (e: React.TouchEvent) => {
        const target = e.currentTarget as HTMLElement
        const scrollTop = target.scrollTop
        setContentScrollTop(scrollTop)

        // Если контент в самом верху и bottom sheet открыт, разрешаем закрытие
        if (scrollTop === 0 && sheetPosition > 0) {
            e.stopPropagation()
            // Создаем нативный TouchEvent из React.TouchEvent
            const nativeEvent = e.nativeEvent as TouchEvent
            handleTouchStart(nativeEvent)
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
                const nativeEvent = e.nativeEvent as TouchEvent
                handleTouchMove(nativeEvent)
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

    const handleTouchMove = useCallback((e: TouchEvent) => {
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
        setSheetPosition(prev => {
            const newPosition = Math.max(0, Math.min(1, prev + (deltaY * sensitivity / maxHeight)))
            return newPosition
        })
        setStartY(touchY) // Обновляем начальную позицию для следующего движения
    }, [isDragging, startY, windowHeight])

    const handleTouchEnd = useCallback(() => {
        setIsDragging(false)

        // Определяем направление последнего движения
        setLastDeltaY(prev => {
            const isSwipeDown = prev < 0

            // Если делали свайп вниз, закрываем при меньшем пороге (15%)
            // Если делали свайп вверх, открываем при большем пороге (25%)
            setSheetPosition(current => {
                if (isSwipeDown) {
                    // Свайп вниз - закрываем при позиции меньше 0.15 (15%)
                    if (current < 0.15) {
                        // Восстанавливаем карусель только если sheet закрыт
                        if (emblaApi) {
                            emblaApi.reInit({
                                watchDrag: true,
                                watchResize: true,
                            })
                        }
                        return 0
                    } else {
                        // Если не закрыли полностью, возвращаем к открытому состоянию
                        return 1
                    }
                } else {
                    // Свайп вверх - открываем при позиции больше 0.25 (25%)
                    if (current > 0.25) {
                        return 1
                    } else {
                        // Восстанавливаем карусель только если sheet закрыт
                        if (emblaApi) {
                            emblaApi.reInit({
                                watchDrag: true,
                                watchResize: true,
                            })
                        }
                        return 0
                    }
                }
            })
            return 0
        })
        setStartY(0)
    }, [emblaApi])

    // Добавляем нативные обработчики touch событий с { passive: false }
    useEffect(() => {
        const sheetElement = sheetRef.current
        if (!sheetElement) return

        sheetElement.addEventListener('touchstart', handleTouchStart, { passive: false })
        sheetElement.addEventListener('touchmove', handleTouchMove, { passive: false })
        sheetElement.addEventListener('touchend', handleTouchEnd, { passive: false })

        return () => {
            sheetElement.removeEventListener('touchstart', handleTouchStart)
            sheetElement.removeEventListener('touchmove', handleTouchMove)
            sheetElement.removeEventListener('touchend', handleTouchEnd)
        }
    }, [handleTouchStart, handleTouchMove, handleTouchEnd])

    // Добавляем нативный обработчик для drag handle span
    useEffect(() => {
        const dragHandle = dragHandleRef.current
        if (!dragHandle) return

        const handleDragHandleTouch = (e: TouchEvent) => {
            e.preventDefault()
            e.stopPropagation()
            if (sheetPosition === 0) {
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

        dragHandle.addEventListener('touchstart', handleDragHandleTouch, { passive: false })

        return () => {
            dragHandle.removeEventListener('touchstart', handleDragHandleTouch)
        }
    }, [sheetPosition, emblaApi])

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
                if (isAddingToCart) {
                    return // Предотвращаем повторные нажатия
                }

                try {
                    setIsAddingToCart(true)

                    // Закрываем модалку логина
                    setIsLoginModalOpen(false)

                    // Небольшая задержка для закрытия модалки
                    await new Promise(resolve => setTimeout(resolve, 300))

                    if (!user._id) return

                    await addToCart(user._id, pendingProduct.productId, pendingProduct.quantity)

                    setPendingProduct(null)
                } catch {
                    // Silent error handling
                } finally {
                    setIsAddingToCart(false)
                }
            }
            handleAddToCart()
        }
    }, [pendingProduct, user._id, isAuthenticated, addToCart, isAddingToCart])

    const handleAddToCartClick = async (e?: React.MouseEvent) => {
        if (e) {
            e.preventDefault()
            e.stopPropagation()
        }

        if (!currentProduct) return

        // Проверяем авторизацию
        if (!user._id || !isAuthenticated()) {
            // Сохраняем информацию о товаре для добавления после логина
            setPendingProduct({
                productId: currentProduct.productId,
                quantity: 1
            })
            setIsLoginModalOpen(true)
            return
        }

        if (isAddingToCart) {
            return // Предотвращаем повторные нажатия
        }

        // Если авторизован, добавляем сразу
        if (!user._id) return

        try {
            setIsAddingToCart(true)
            await addToCart(user._id, currentProduct.productId, 1)
        } catch {
            // Silent error handling
        } finally {
            setIsAddingToCart(false)
        }
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

    if (!currentProduct || currentProduct._id !== productId) {
        return <Loader fullScreen showText />
    }

    return (
        <div className="fixed md:relative inset-0 md:inset-auto min-h-screen w-full md:w-full md:max-w-none md:mx-0 md:mb-20 md:pt-0 z-20 md:z-auto m-0 p-0">
            <div className="relative min-h-[100dvh] text-white pt-0  pb-0 md:pb-16 flex flex-col md:flex-row gap-0 md:gap-0 items-start m-0 p-0 md:p-0">

                {currentProduct.photos && currentProduct.photos.length > 0 && (
                    <div className="w-full md:w-1/2 md:max-w-[50%] md:flex-shrink-0 md:min-w-0 flex flex-col md:flex-col gap-0 md:gap-0 md:items-stretch">
                        {/* Main photo */}
                        <div
                            className="fixed md:relative inset-0 w-full h-screen overflow-hidden md:overflow-visible md:h-auto md:min-h-0 md:w-full z-10"
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
                                    ref={mobileEmblaSlidesRef}
                                    className="flex flex-col h-full"
                                    style={{
                                        pointerEvents: isSheetActive ? 'none' : 'auto',
                                        touchAction: isSheetActive ? 'none' : 'auto',
                                    }}
                                >
                                    {currentProduct.photos.map((photo, idx) => {
                                        const imageUrl = getImageUrl(photo)

                                        return (
                                        <div
                                            key={`${currentProduct._id}-${imageUrl}-${idx}`}
                                            className="relative flex-[0_0_auto] w-full shrink-0 flex flex-col pb-2 box-border"
                                            style={{
                                                pointerEvents: isSheetActive ? 'none' : 'auto',
                                                touchAction: isSheetActive ? 'none' : 'auto',
                                            }}
                                        >
                                            <div className="relative w-full">
                                                <ProductImage
                                                    src={imageUrl}
                                                    alt={`${currentProduct.name} ${idx + 1}`}
                                                    fill={false}
                                                    sizes="(max-width: 768px) 100vw, 50vw"
                                                    className="block"
                                                    priority={idx === 0}
                                                    quality={95}
                                                    showSkeleton={idx === 0}
                                                />
                                            </div>
                                        </div>
                                        )
                                    })}
                                </div>
                                {/* Mobile indicators */}
                                {currentProduct.photos.length > 1 && (
                                    <div className="absolute left-4 top-1/2 -translate-y-1/2 z-10 flex flex-col gap-2">
                                        {currentProduct.photos.map((_, idx) => (
                                            <div
                                                key={`${currentProduct._id}-indicator-${idx}`}
                                                className={`w-2 h-2 rounded-full transition-all duration-300 ${currentCarouselIndex === idx
                                                    ? 'bg-[var(--color-green)]'
                                                    : 'bg-[var(--green)]/50'
                                                    }`}
                                            />
                                        ))}
                                    </div>
                                )}
                            </div>
                            {/* Desktop: фото идут столбиком в потоке документа — реальный скролл, не подмена по индексу */}
                            <div
                                ref={desktopGalleryRootRef}
                                className="hidden md:flex md:flex-col md:gap-2 relative w-full"
                            >
                                {currentProduct.photos.map((photo, idx) => {
                                    const imageUrl = getImageUrl(photo)

                                    return (
                                        <div
                                            key={`${currentProduct._id}-desk-${imageUrl}-${idx}`}
                                            className="relative w-full shrink-0"
                                        >
                                            <div className="relative w-full">
                                                <ProductImage
                                                    src={imageUrl}
                                                    alt={`${currentProduct.name} ${idx + 1}`}
                                                    fill={false}
                                                    sizes="50vw"
                                                    className="block"
                                                    priority={idx === 0}
                                                    quality={95}
                                                    showSkeleton={idx === 0}
                                                />
                                            </div>
                                        </div>
                                    )
                                })}
                            </div>
                        </div>
                    </div>
                )}

                {/* Desktop only content — скролл только после прокрутки всех фото слева */}
                <div
                    ref={desktopRightPanelRef}
                    className={`hidden md:flex md:flex-col sticky top-24 self-start w-full md:w-1/2 md:min-w-0 md:max-w-[50%] md:flex-shrink-0 md:pl-8 md:pr-10 lg:pr-14 gap-6 h-[calc(100dvh-6rem)] min-h-0 ${desktopRightScrollUnlocked ? 'overflow-y-auto' : 'overflow-y-hidden'}`}
                >
                    {/* Название товара */}
                    <div>
                        <h1 className="text-4xl md:text-5xl font-blauer-nue font-bold mb-2 text-white leading-tight">
                            {currentProduct.name}
                        </h1>
                    </div>

                    {/* Кнопка добавления в корзину с ценой */}
                    <div className="pb-4 border-b border-white/10">
                        <button
                            type="button"
                            onClick={handleAddToCartClick}
                            className="w-full py-4 px-6 bg-[var(--mint-dark)] hover:bg-[var(--mint-dark)]/90 text-white font-blauer-nue font-bold text-lg rounded-lg transition-all duration-300 disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-between"
                            disabled={currentProduct.stockQuantity === 0 || isAddingToCart}
                            style={{ pointerEvents: 'auto', zIndex: 10 }}
                        >
                            <span>
                                {isAddingToCart ? 'Добавление...' : currentProduct.stockQuantity > 0 ? 'Добавить в корзину' : 'Товар закончился'}
                            </span>
                            <span className="flex items-baseline gap-2">
                                <span className="text-2xl font-bold">
                                    {currentProduct.price.toLocaleString('ru-RU')}
                                </span>
                                <span className="text-base font-medium">BYN</span>
                            </span>
                        </button>
                    </div>

                    {/* Описание */}
                    {currentProduct.description && (
                        <div className="space-y-2">
                            <h2 className="text-lg font-blauer-nue font-semibold text-white mb-2">Описание</h2>
                            <p className="text-white/80 leading-relaxed text-base">
                                {currentProduct.description}
                            </p>
                        </div>
                    )}

                    {/* Характеристики */}
                    <div className="space-y-4 py-4 border-t border-b border-white/10">
                        <h2 className="text-lg font-blauer-nue font-semibold text-white mb-3">Характеристики</h2>
                        <div className="grid grid-cols-1 gap-3">
                            {/* Артикул */}
                            <div className="flex items-center justify-between py-2">
                                <span className="text-white/60 text-sm font-medium">Артикул</span>
                                <span className="text-white font-semibold">{currentProduct.productId}</span>
                            </div>

                            {/* Категория */}
                            {currentProduct.category && (
                                <div className="flex items-center justify-between py-2 border-t border-white/5">
                                    <span className="text-white/60 text-sm font-medium">Категория</span>
                                    <span className="text-white font-semibold">
                                        {typeof currentProduct.category === 'string'
                                            ? currentProduct.category
                                            : currentProduct.category.name}
                                    </span>
                                </div>
                            )}

                            {/* Размер */}
                            <div className="flex items-center justify-between py-2 border-t border-white/5">
                                <span className="text-white/60 text-sm font-medium">Размер</span>
                                <span className="text-white font-semibold">{currentProduct.size}</span>
                            </div>

                            {/* В наличии */}
                            <div className="flex items-center justify-between py-2 border-t border-white/5">
                                <span className="text-white/60 text-sm font-medium">В наличии</span>
                                <span className={`font-semibold ${currentProduct.stockQuantity > 0 ? 'text-[var(--mint-dark)]' : 'text-red-400'}`}>
                                    {currentProduct.stockQuantity > 0 ? `${currentProduct.stockQuantity} шт.` : 'Нет в наличии'}
                                </span>
                            </div>
                        </div>
                    </div>
                </div>
            </div>

            {/* Mobile fixed button - always visible */}
            <div className="md:hidden fixed bottom-0 left-0 w-full z-50">
                <div className="px-4 py-3" >
                    <button
                        type="button"
                        onClick={handleAddToCartClick}
                        disabled={currentProduct.stockQuantity === 0 || isAddingToCart}
                        className="w-full py-4 flex items-center justify-around bg-[var(--mint-dark)]/70 font-blauer-nue rounded-lg disabled:opacity-50 disabled:cursor-not-allowed"
                        style={{ pointerEvents: 'auto' }}
                    >
                        <div className="text-white text-sm font-bold">
                            {isAddingToCart ? 'Добавление...' : currentProduct.stockQuantity > 0 ? 'Добавить в корзину' : 'Товар закончился'}
                        </div>
                        <div className="text-white text-xl font-bold">
                            {currentProduct.price.toLocaleString('ru-RU')}
                            <span className="text-white ml-1 text-sm font-bold">BYN</span>
                        </div>
                    </button>
                </div>
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
                    ref={sheetRef}
                    className="rounded-t-3xl relative overflow-hidden h-full"
                    style={{
                        background: 'rgba(255, 255, 255, 0.1)',
                        backdropFilter: 'blur(20px) saturate(180%)',
                        WebkitBackdropFilter: 'blur(20px) saturate(180%)',
                        borderTop: '1px solid var(--mint-dark)',
                        touchAction: isDragging ? 'none' : 'pan-y',
                        WebkitTouchCallout: 'none',
                        WebkitUserSelect: 'none',
                        userSelect: 'none',
                    }}
                >
                    {/* Drag handle */}
                    <div
                        className="sticky top-0   w-full flex items-center justify-center z-10 pt-2 pb-2"
                        onTouchStart={(e) => {
                            // Если клик на span, не обрабатываем здесь
                            const target = e.target as HTMLElement
                            if (target.tagName === 'SPAN' || target.closest('span')) {
                                return
                            }
                        }}
                    >
                        <span
                            ref={dragHandleRef}
                            className="w-12 h-[3px] bg-[var(--mint-dark)] rounded-full cursor-pointer"
                            onClick={(e) => {
                                e.preventDefault()
                                e.stopPropagation()
                                if (sheetPosition === 0) {
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
                            }}
                        ></span>
                    </div>

                    {/* Scrollable content container */}
                    <div
                        className="relative overflow-y-auto h-full"
                        style={{
                            maxHeight: 'calc(100% - 100px)',
                            WebkitOverflowScrolling: 'touch',
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
                            <div className="text-white text-2xl font-blauer-nue font-bold mb-3 text-center">
                                {currentProduct.name}
                            </div>

                            {/* Expandable content */}
                            <div
                                className="overflow-visible"
                                style={{
                                    maxHeight: sheetPosition > 0 ? '5000px' : '0',
                                    opacity: sheetPosition > 0 ? 1 : 0,
                                    overflow: sheetPosition > 0 ? 'visible' : 'hidden',
                                    transition: 'opacity 0.3s ease-out, maxHeight 0.3s ease-out',
                                }}
                            >
                                <div className="space-y-5 pb-4">
                                    {/* Цена - выделенный блок */}
                                    <div className="flex items-baseline justify-center gap-2 py-3 border-y border-white/10">
                                        <span className="text-3xl font-bold text-[var(--mint-dark)]">
                                            {currentProduct.price.toLocaleString('ru-RU')}
                                        </span>
                                        <span className="text-lg text-white/80 font-medium">BYN</span>
                                    </div>

                                    {/* Описание */}
                                    {currentProduct.description && (
                                        <div className="space-y-2">
                                            <h2 className="text-base font-blauer-nue font-semibold text-white mb-2">Описание</h2>
                                            <p className="text-white/80 text-sm leading-relaxed">
                                                {currentProduct.description}
                                            </p>
                                        </div>
                                    )}

                                    {/* Характеристики */}
                                    <div className="space-y-3 py-3 border-t border-b border-white/10">
                                        <h2 className="text-base font-blauer-nue font-semibold text-white mb-3">Характеристики</h2>
                                        <div className="space-y-3">
                                            {/* Артикул */}
                                            <div className="flex items-center justify-between py-1.5">
                                                <span className="text-white/60 text-sm font-medium">Артикул</span>
                                                <span className="text-white font-semibold text-sm">{currentProduct.productId}</span>
                                            </div>

                                            {/* Категория */}
                                            {currentProduct.category && (
                                                <div className="flex items-center justify-between py-1.5 border-t border-white/5">
                                                    <span className="text-white/60 text-sm font-medium">Категория</span>
                                                    <span className="text-white font-semibold text-sm">
                                                        {typeof currentProduct.category === 'string'
                                                            ? currentProduct.category
                                                            : currentProduct.category.name}
                                                    </span>
                                                </div>
                                            )}

                                            {/* Размер */}
                                            <div className="flex items-center justify-between py-1.5 border-t border-white/5">
                                                <span className="text-white/60 text-sm font-medium">Размер</span>
                                                <span className="text-white font-semibold text-sm">{currentProduct.size}</span>
                                            </div>

                                            {/* В наличии - выделено */}
                                            <div className="flex items-center justify-between py-2 border-t border-white/5 bg-white/5 rounded-lg px-3 -mx-3">
                                                <span className="text-white/60 text-sm font-medium">В наличии</span>
                                                <span className={`font-bold text-base ${currentProduct.stockQuantity > 0 ? 'text-[var(--mint-dark)]' : 'text-red-400'}`}>
                                                    {currentProduct.stockQuantity > 0 ? `${currentProduct.stockQuantity} шт.` : 'Нет в наличии'}
                                                </span>
                                            </div>
                                        </div>
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