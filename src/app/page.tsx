'use client'
import { useCallback, useEffect, useState } from "react"
import dynamic from "next/dynamic"
import CarouselSection from "@/components/ui/shared/CarouselSection"
import CarouselSectionSkeleton from "@/components/ui/shared/CarouselSectionSkeleton"
import { useProductsStore } from "@/zustand/products_store/ProductsStore"

const HERO_VIDEO_SRC = '/videos/pp_video.mp4'
const HERO_VIDEO_POSTER = '/images/for_start_video/first_webp_for_video.webp'

const CountdownWidgetVIP = dynamic(() => import("@/components/ui/shared/CountdownWidgetVIP"), {
  ssr: false,
  loading: () => null,
})
const CountdownWidgetAll = dynamic(() => import("@/components/ui/shared/CountdownWidgetAll"), {
  ssr: false,
  loading: () => null,
})

const SEASONAL_WIDGETS_END_DATE = new Date('2025-12-31T23:59:59')

export default function Home() {
  const [isVisible, setVisible] = useState(false)
  const [scrollProgress, setScrollProgress] = useState(0)
  const [shouldShowSeasonalWidgets, setShouldShowSeasonalWidgets] = useState(false)
  const [videoReady, setVideoReady] = useState(false)
  const { products, getProducts } = useProductsStore()

  const markVideoReady = useCallback(() => {
    setVideoReady(true)
  }, [])

  useEffect(() => {
    const timerId = setTimeout(() => setVisible(true), 300)
    return () => clearTimeout(timerId)
  }, [])

  useEffect(() => {
    getProducts(false) // Получаем только активные товары
  }, [getProducts])

  useEffect(() => {
    setShouldShowSeasonalWidgets(new Date() <= SEASONAL_WIDGETS_END_DATE)
  }, [])

  useEffect(() => {
    const handleScroll = () => {
      const scrollY = window.scrollY
      const windowHeight = window.innerHeight
      // Прогресс от 0 до 1, когда скроллим от 0 до высоты экрана
      const progress = Math.min(scrollY / windowHeight, 1)
      setScrollProgress(progress)
    }

    window.addEventListener('scroll', handleScroll)
    return () => window.removeEventListener('scroll', handleScroll)
  }, [])

  // Вычисляем высоту блока от 50svh до 100vh в зависимости от скролла
  const blockHeight = 50 + (scrollProgress * 10) // от 50% до 100%

  // Фильтруем товары с фотографиями
  const filteredProducts = products.filter(
    product => product.photos && product.photos.length > 0 && product.isActive
  )


  return (
    <div className="relative cursor-default">
      {/* Main Section */}
      <section className="relative h-screen w-full">
        <div className="absolute inset-0 w-full h-full overflow-hidden">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={HERO_VIDEO_POSTER}
            alt=""
            aria-hidden
            fetchPriority="high"
            decoding="async"
            className={`absolute inset-0 h-full w-full object-cover blur-sm scale-105 transition-opacity duration-700 ease-out pointer-events-none ${videoReady ? 'opacity-0' : 'opacity-100'
              }`}
          />
          <video
            className={`absolute inset-0 h-full w-full object-cover pointer-events-none transition-opacity duration-700 ease-out ${videoReady ? 'opacity-100' : 'opacity-0'
              }`}
            src={HERO_VIDEO_SRC}
            poster={HERO_VIDEO_POSTER}
            autoPlay
            muted
            loop
            playsInline
            preload="auto"
            aria-hidden
            onCanPlayThrough={markVideoReady}
            onPlaying={markVideoReady}
          />
        </div>
        <div className="absolute inset-0 w-full h-full bg-black/50 z-10">
        </div>

        {shouldShowSeasonalWidgets && (
          <div className="absolute top-20 left-0 right-0 z-30 px-4">
            <div className="max-w-7xl mx-auto grid grid-cols-1 md:grid-cols-2 gap-2 md:gap-4">
              <CountdownWidgetVIP />
              <CountdownWidgetAll />
            </div>
          </div>
        )}

        <div className="absolute inset-0 w-full h-full flex items-end justify-center overflow-hidden z-20" >
          <div className="text-2xl w-[300px] font-blauer-nue font-bold text-center "
            style={{
              background: 'rgba(255, 255, 255, 0.1)',
              backdropFilter: 'blur(10px) saturate(250%)',
              WebkitBackdropFilter: 'blur(10px) saturate(250%)',
              padding: '25px 25px 0 25px',
              borderRadius: '25px 25px 0 0',
              height: `${blockHeight}svh`,
              transform: isVisible ? 'translateY(50%)' : 'translateY(100%)',
              transition: 'transform 1s ease-in-out, height 0.3s ease-out',
            }}>
            АУТЕНТИЧНОСТЬ РОЖДАЕТСЯ ЗДЕСЬ
          </div>
        </div>
      </section>

      {/* Скелетон только пока нет товаров для карусели; не по глобальному status — иначе любой loading размонтирует карусель и модалку входа */}
      {filteredProducts.length === 0 ? (
        <CarouselSectionSkeleton
          title="КАТАЛОГ"
          viewAllLink="/catalog"
          slidesToShow={{ mobile: 1, tablet: 3, desktop: 4 }}
          slideHeight="h-[80vh]"
        />
      ) : (
        <CarouselSection
          title="КАТАЛОГ"
          viewAllLink="/catalog"
          products={filteredProducts}
          loop={true}
          autoplayInterval={4000}
          slidesToShow={{ mobile: 1, tablet: 3, desktop: 4 }}
          slideHeight="h-[80vh]"
        />
      )}
    </div>
  )
}
