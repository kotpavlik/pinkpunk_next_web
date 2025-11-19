'use client'
import { useEffect, useState } from "react"
import useEmblaCarousel from 'embla-carousel-react'
import Image from 'next/image'
import Link from "next/link"
import { ProductResponse } from "@/api/ProductApi"
import { useUserStore } from "@/zustand/user_store/UserStore"
import { useCartStore } from "@/zustand/cart_store/CartStore"
import TelegramLoginModal from "./TelegramLoginModal"

interface CarouselSectionProps {
  title: string
  viewAllLink?: string
  products: ProductResponse[]
  loop?: boolean
  autoplayInterval?: number
  slidesToShow?: {
    mobile: number
    tablet: number
    desktop: number
  }
  slideHeight?: string
  className?: string
}

export default function CarouselSection({
  title,
  viewAllLink,
  products,
  loop = true,
  autoplayInterval = 4000,
  slidesToShow = { mobile: 1, tablet: 2, desktop: 4 },
  slideHeight = 'h-[80vh]',
  className = '',
}: CarouselSectionProps) {
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
  const [emblaRef, emblaApi] = useEmblaCarousel({ loop })
  const [canScrollPrev, setCanScrollPrev] = useState(false)
  const [canScrollNext, setCanScrollNext] = useState(false)
  const [isLoginModalOpen, setIsLoginModalOpen] = useState(false)
  const [pendingProduct, setPendingProduct] = useState<{ productId: string; quantity: number } | null>(null)
  const [isAddingToCart, setIsAddingToCart] = useState(false)
  const [showError, setShowError] = useState(false)

  const { user, isAuthenticated } = useUserStore()
  const { addToCart, error: cartError, setError: setCartError } = useCartStore()

  const scrollPrev = () => {
    emblaApi?.scrollPrev()
  }

  const scrollNext = () => {
    emblaApi?.scrollNext()
  }

  useEffect(() => {
    if (!emblaApi) return

    const updateScrollButtons = () => {
      setCanScrollPrev(emblaApi.canScrollPrev())
      setCanScrollNext(emblaApi.canScrollNext())
    }

    updateScrollButtons()
    emblaApi.on('select', updateScrollButtons)
    emblaApi.on('reInit', updateScrollButtons)

    return () => {
      emblaApi.off('select', updateScrollButtons)
      emblaApi.off('reInit', updateScrollButtons)
    }
  }, [emblaApi])

  useEffect(() => {
    if (!emblaApi || !autoplayInterval) return
    const interval = setInterval(() => {
      emblaApi.scrollNext()
    }, autoplayInterval)
    return () => clearInterval(interval)
  }, [emblaApi, autoplayInterval])

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
          setIsAddingToCart(false)
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

    if (isAddingToCart) {
      return // Предотвращаем повторные нажатия
    }

    // Если авторизован, добавляем сразу
    if (!user._id) return

    try {
      setIsAddingToCart(true)
      const success = await addToCart(user._id, product.productId, 1)

      if (success) {
        // Скроллим к товару по центру экрана
        const productElement = document.querySelector(`[data-product-id="${product._id}"]`)
        if (productElement) {
          productElement.scrollIntoView({ behavior: 'smooth', block: 'center' })
        }
      }
    } catch (error) {
      console.error('Ошибка при добавлении товара в корзину:', error)
    } finally {
      setIsAddingToCart(false)
    }
  }

  // Получаем классы для flex-basis с учетом всех breakpoints
  // Tailwind classes для safelist: flex-[0_0_100%] md:flex-[0_0_100%] md:flex-[0_0_50%] md:flex-[0_0_33.333%] md:flex-[0_0_25%] md:flex-[0_0_20%] lg:flex-[0_0_100%] lg:flex-[0_0_50%] lg:flex-[0_0_33.333%] lg:flex-[0_0_25%] lg:flex-[0_0_20%]
  const getFlexClass = (count: number) => {
    const classes: Record<number, string> = {
      1: 'flex-[0_0_100%]',
      2: 'flex-[0_0_50%]',
      3: 'flex-[0_0_33.333%]',
      4: 'flex-[0_0_25%]',
      5: 'flex-[0_0_20%]',
    }
    return classes[count] || 'flex-[0_0_100%]'
  }

  // Комбинируем классы для всех breakpoints
  const slideClasses = [
    getFlexClass(slidesToShow.mobile),
    `md:${getFlexClass(slidesToShow.tablet)}`,
    `lg:${getFlexClass(slidesToShow.desktop)}`,
  ].join(' ')

  return (
    <section className={`relative py-20 md:py-25 ${className}`}>
      <div className="w-[96vw] mx-auto py-2 flex items-center justify-between">
        <h1 className=" text-2xl md:text-4xl  text-start font-blauer-nue font-bold text-white cursor-default">
          {title}
          {products.length > 0 && (
            <span className="ml-3 align-middle text-lg md:text-2xl font-normal text-white/60">({products.length})</span>
          )}
        </h1>

        {viewAllLink && (
          <Link href={viewAllLink} className="text-sm md:text-base font-blauer-nue">
            Cмотреть все &gt;
          </Link>
        )}
      </div>

      <div className="w-full mx-auto">
        <div className="relative overflow-hidden" ref={emblaRef}>
          <div className="flex touch-pan-y gap-2 md:gap-3 lg:gap-1 px-2 md:px-3 lg:px-1">
            {products.map((product, idx) => {
              const firstPhoto = product.photos && product.photos.length > 0 ? product.photos[0] : null
              const secondPhoto = product.photos && product.photos.length > 1 ? product.photos[1] : null
              if (!firstPhoto) return null

              return (
                <Link
                  key={product._id}
                  href={`/product_item?id=${product._id}`}
                  className={`min-w-0 ${slideClasses} flex flex-col group cursor-pointer`}
                  data-product-id={product._id}
                >
                  <div className={`relative w-full ${slideHeight} overflow-hidden`}>
                    {/* default image */}
                    <Image
                      src={getImageUrl(firstPhoto)}
                      alt={product.name}
                      fill
                      sizes={`(max-width: 768px) 100vw, (max-width: 1024px) ${Math.ceil(100 / slidesToShow.tablet * 1.5)}vw, ${Math.ceil(100 / slidesToShow.desktop * 1.5)}vw`}
                      className="object-cover transition-opacity duration-100"
                      priority={idx === 0}
                      quality={95}
                    />
                    {/* hover image (second) */}
                    {secondPhoto && (
                      <Image
                        src={getImageUrl(secondPhoto)}
                        alt={`${product.name} alt`}
                        fill
                        sizes={`(max-width: 768px) 100vw, (max-width: 1024px) ${Math.ceil(100 / slidesToShow.tablet * 1.5)}vw, ${Math.ceil(100 / slidesToShow.desktop * 1.5)}vw`}
                        className="object-cover opacity-0 group-hover:opacity-100 transition-opacity duration-500"
                        quality={95}
                      />
                    )}

                    {/* Add to cart button on hover */}
                    <div className="absolute top-3 right-3 z-10 opacity-100 md:opacity-0 md:group-hover:opacity-100 transition-all duration-300 transform md:-translate-y-2 md:group-hover:translate-y-0">
                      <button
                        type="button"
                        onClick={(e) => handleAddToCartClick(e, product)}
                        className="px-3 py-2 rounded-md bg-[var(--mint-dark)]/70 hover:bg-[var(--green)]/80 text-white text-xs md:text-sm backdrop-blur-sm border border-white/10 shadow-md font-blauer-nue"
                        aria-label="Добавить в корзину"
                      >
                        в корзину
                      </button>
                    </div>

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
              )
            })}
          </div>

          <button
            onClick={scrollPrev}
            disabled={!canScrollPrev}
            className={`absolute left-4 font-durik top-1/2 text-2xl -translate-y-1/2 w-8 h-8 rounded-full transition-colors flex items-center justify-center z-10 ${canScrollPrev
              ? 'bg-[var(--mint-dark)]/50 text-[var(--color-pink-light)] hover:bg-[var(--green)]/70'
              : 'bg-[var(--mint-dark)]/20 text-[var(--color-pink-light)]/30 cursor-not-allowed'
              }`}
            style={{
              WebkitTouchCallout: 'none',
              WebkitUserSelect: 'none',
              userSelect: 'none',
              touchAction: 'manipulation',
              backfaceVisibility: 'hidden',
              WebkitBackfaceVisibility: 'hidden',
              willChange: 'transform',
              WebkitTapHighlightColor: 'transparent'
            }}
          >
            ‹
          </button>
          <button
            onClick={scrollNext}
            disabled={!canScrollNext}
            className={`absolute right-4 top-1/2 font-durik text-2xl -translate-y-1/2 w-8 h-8 rounded-full transition-colors flex items-center justify-center z-10 ${canScrollNext
              ? 'bg-[var(--mint-dark)]/50 text-[var(--color-pink-light)] hover:bg-[var(--green)]/70'
              : 'bg-[var(--mint-dark)]/20 text-[var(--color-pink-light)]/30 cursor-not-allowed'
              }`}
            style={{
              WebkitTouchCallout: 'none',
              WebkitUserSelect: 'none',
              userSelect: 'none',
              touchAction: 'manipulation',
              backfaceVisibility: 'hidden',
              WebkitBackfaceVisibility: 'hidden',
              willChange: 'transform',
              WebkitTapHighlightColor: 'transparent'
            }}
          >
            ›
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
    </section>
  )
}

