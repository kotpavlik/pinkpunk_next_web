'use client'
import { useCallback, useEffect, useRef, useState } from "react"
import dynamic from "next/dynamic"
import Link from "next/link"
import { useRouter } from "next/navigation"
import CarouselSection from "@/components/ui/shared/CarouselSection"
import CarouselSectionSkeleton from "@/components/ui/shared/CarouselSectionSkeleton"
import TelegramLoginModal from "@/components/ui/shared/LazyTelegramLoginModal"
import {
  LoyaltyLeaderboardHeroRoot,
  LoyaltyLeaderboardDesktopPanel,
  LoyaltyLeaderboardMobileButton,
} from "@/components/ui/shared/LoyaltyLeaderboardSection"
import { useTypewriter } from "@/hooks/useTypewriter"
import { useProductsStore } from "@/zustand/products_store/ProductsStore"
import { useUserStore } from "@/zustand/user_store/UserStore"

const HERO_VIDEO_SRC = '/videos/pp_video.mp4'
const HERO_VIDEO_POSTER = '/images/for_start_video/first_webp_for_video.webp'

const HERO_TYPEWRITER_TEXT =
  'Проходи уровни и забирай награды, забери себе самую жирную скидку и играй в Pink Punk Play 🐇'

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
  const router = useRouter()
  const { user } = useUserStore()
  const [shouldShowSeasonalWidgets, setShouldShowSeasonalWidgets] = useState(false)
  const [videoReady, setVideoReady] = useState(false)
  const [hasMounted, setHasMounted] = useState(false)
  const [isMobile, setIsMobile] = useState(false)
  const [isLoginModalOpen, setIsLoginModalOpen] = useState(false)
  const [showCatalogCarousel, setShowCatalogCarousel] = useState(false)
  const videoRef = useRef<HTMLVideoElement>(null)
  const { products, getProducts } = useProductsStore()
  const typewriterEnabled = hasMounted && !isMobile
  const displayedText = useTypewriter(HERO_TYPEWRITER_TEXT, typewriterEnabled)
  const heroSubtext = !hasMounted ? '' : isMobile ? HERO_TYPEWRITER_TEXT : displayedText

  const markVideoReady = useCallback(() => {
    setVideoReady(true)
  }, [])

  useEffect(() => {
    setHasMounted(true)
    const mq = window.matchMedia('(max-width: 639px)')
    const syncMobile = () => setIsMobile(mq.matches)
    syncMobile()
    mq.addEventListener('change', syncMobile)
    return () => mq.removeEventListener('change', syncMobile)
  }, [])

  useEffect(() => {
    const video = videoRef.current
    if (!video) return

    const handleReady = () => markVideoReady()

    video.addEventListener('canplaythrough', handleReady)
    video.addEventListener('playing', handleReady)
    if (video.readyState >= HTMLMediaElement.HAVE_FUTURE_DATA) {
      handleReady()
    }

    return () => {
      video.removeEventListener('canplaythrough', handleReady)
      video.removeEventListener('playing', handleReady)
    }
  }, [markVideoReady])

  useEffect(() => {
    getProducts(false)
  }, [getProducts])

  useEffect(() => {
    setShouldShowSeasonalWidgets(new Date() <= SEASONAL_WIDGETS_END_DATE)
  }, [])

  const filteredProducts = products.filter(
    product => product.photos && product.photos.length > 0 && product.isActive
  )

  useEffect(() => {
    if (filteredProducts.length > 0) {
      setShowCatalogCarousel(true)
    }
  }, [filteredProducts.length])

  const handleLoginClick = () => {
    if (user._id) {
      router.push('/user_profile')
      return
    }
    setIsLoginModalOpen(true)
  }

  return (
    <div className="relative cursor-default">
      <section className="relative h-screen w-full overflow-hidden">
        <div className="absolute inset-0 w-full h-full">
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
            ref={videoRef}
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
          />
          <div className="absolute inset-0 bg-black/50" />
        </div>

        <div className="pointer-events-none absolute inset-0 overflow-hidden" aria-hidden>
          <div
            className="absolute top-[20%] left-[10%] h-[min(24rem,70vw)] w-[min(24rem,70vw)]"
            style={{
              background:
                'radial-gradient(circle, color-mix(in srgb, var(--pink-punk) 16%, transparent) 0%, transparent 72%)',
            }}
          />
          <div
            className="absolute bottom-[20%] right-[10%] h-[min(24rem,70vw)] w-[min(24rem,70vw)]"
            style={{
              background:
                'radial-gradient(circle, color-mix(in srgb, var(--mint-bright) 16%, transparent) 0%, transparent 72%)',
            }}
          />
        </div>

        {shouldShowSeasonalWidgets && (
          <div className="absolute top-20 left-0 right-0 z-30 px-4">
            <div className="max-w-7xl mx-auto grid grid-cols-1 md:grid-cols-2 gap-2 md:gap-4">
              <CountdownWidgetVIP />
              <CountdownWidgetAll />
            </div>
          </div>
        )}

        <LoyaltyLeaderboardHeroRoot>
        <div className="absolute inset-0 z-20 flex items-center px-4 sm:px-6 md:px-8 lg:px-12 py-8 sm:py-12 md:py-16">
          <div className="mx-auto flex w-full max-w-7xl flex-col gap-8 md:flex-row md:items-center md:justify-between md:gap-6 lg:gap-10">
            <div className="flex min-w-0 max-w-2xl flex-1 flex-col gap-4 sm:gap-6 md:gap-8">
              <h1 className="text-4xl sm:text-5xl md:text-6xl lg:text-7xl font-durik font-black text-[var(--mint-dark)] leading-tight">
                <p>АУТЕНТИЧНОСТЬ</p>
                <p>РОЖДАЕТСЯ</p>
                <p>ЗДЕСЬ</p>
              </h1>

              <div className="relative max-w-md sm:max-w-lg">
                <p
                  className="invisible pointer-events-none select-none text-sm leading-normal sm:text-base md:text-lg"
                  aria-hidden
                >
                  {HERO_TYPEWRITER_TEXT}
                  <span className="ml-1 hidden sm:inline-block w-0.5">|</span>
                </p>
                <p className="absolute inset-0 text-sm leading-normal text-foreground/70 sm:text-base md:text-lg">
                  {heroSubtext}
                  {typewriterEnabled ? (
                    <span className="ml-1 inline-block h-4 w-0.5 animate-blink bg-foreground/70 sm:h-5 md:h-6">|</span>
                  ) : null}
                </p>
              </div>

              <div className="flex flex-col sm:flex-row flex-wrap gap-3 sm:gap-4 self-start w-full sm:w-auto">
                <Link
                  href="/loyalty_rules"
                  className="w-full sm:w-auto px-6 sm:px-8 py-3 sm:py-4 border-2 border-foreground/30 hover:border-mint-bright text-foreground hover:text-mint-bright font-cabinet-grotesk font-semibold rounded-lg transition-all duration-300 text-center text-sm sm:text-base"
                >
                  Читать правила
                </Link>
                <button
                  type="button"
                  onClick={handleLoginClick}
                  className="w-full sm:w-auto px-6 sm:px-8 py-3 sm:py-4 border-2 border-foreground/30 hover:border-pink-original text-foreground hover:text-pink-original font-cabinet-grotesk font-semibold rounded-lg transition-all duration-300 text-center text-sm sm:text-base"
                >
                  {hasMounted && user._id ? 'Профиль' : 'Войти'}
                </button>
                <LoyaltyLeaderboardMobileButton />
              </div>
            </div>

            <LoyaltyLeaderboardDesktopPanel className="self-center" />
          </div>
        </div>
        </LoyaltyLeaderboardHeroRoot>
      </section>

      <TelegramLoginModal
        isOpen={isLoginModalOpen}
        onClose={() => setIsLoginModalOpen(false)}
      />

      {!hasMounted || !showCatalogCarousel ? (
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
