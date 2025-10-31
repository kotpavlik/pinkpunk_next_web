'use client'
import { useEffect, useState } from "react"
import CarouselSection from "@/components/ui/shared/CarouselSection"
import { useProductsStore } from "@/zustand/products_store/ProductsStore"

export default function Home() {
  const [isVisible, setVisible] = useState(false)
  const [scrollProgress, setScrollProgress] = useState(0)
  const { products, getProducts } = useProductsStore()

  useEffect(() => {
    const timerId = setTimeout(() => setVisible(true), 300)
    return () => clearTimeout(timerId)
  }, [])

  useEffect(() => {
    getProducts(false) // Получаем только активные товары
  }, [getProducts])

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
    <div className="relative">
      {/* Main Section */}
      <section className="relative h-screen w-full">
        <video
          className="absolute inset-0 w-full h-full object-cover pointer-events-none"
          src="/videos/pp_video.mp4"
          autoPlay
          muted
          loop
          playsInline
          preload="auto"
          aria-hidden="true"
        />
        <div className="absolute inset-0 w-full h-full bg-black/50 z-10">
        </div>
        <div className="absolute inset-0 w-full h-full flex items-end justify-center overflow-hidden z-20" >
          <div className="text-2xl w-[300px] font-blauer-nue font-bold text-center "
            style={{
              background: 'rgba(255, 255, 255, 0.1)',
              backdropFilter: 'blur(10px) saturate(250%)',
              WebkitBackdropFilter: 'blur(10px) saturate(250%)',
              padding: '25px 25px 0 25px',
              borderRadius: '25px 25px 0 0',
              height: `${blockHeight}svh`,
              transform: isVisible ? 'translateY(0)' : 'translateY(100%)',
              transition: 'transform 1s ease-in-out, height 0.3s ease-out',
            }}>
            БЕЛАРУСКАЯ АУТЕНТИЧНОСТЬ РОЖДАЕТСЯ ЗДЕСЬ
          </div>
        </div>
      </section>

      {filteredProducts.length > 0 && (
        <CarouselSection
          title="ГОРЬКИЙ ШОКОЛАД"
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