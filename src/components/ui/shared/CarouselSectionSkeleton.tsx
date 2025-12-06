'use client'

interface CarouselSectionSkeletonProps {
  title?: string
  viewAllLink?: string
  slidesToShow?: {
    mobile: number
    tablet: number
    desktop: number
  }
  slideHeight?: string
  className?: string
  skeletonCount?: number
}

export default function CarouselSectionSkeleton({
  title,
  viewAllLink,
  slidesToShow = { mobile: 1, tablet: 2, desktop: 4 },
  slideHeight = 'h-[80vh]',
  className = '',
  skeletonCount,
}: CarouselSectionSkeletonProps) {
  // Получаем классы для flex-basis с учетом всех breakpoints
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

  // Количество скелетонов по умолчанию = desktop из slidesToShow
  const count = skeletonCount || slidesToShow.desktop

  return (
    <section className={`relative py-20 md:py-25 ${className}`}>
      {/* Заголовок скелетон */}
      <div className="w-[96vw] mx-auto py-2 flex items-center justify-between">
        {title ? (
          <h1 className="text-2xl md:text-4xl text-start font-blauer-nue font-bold text-white cursor-default">
            {title}
          </h1>
        ) : (
          <div className="h-8 md:h-10 w-40 bg-white/10 animate-pulse rounded" />
        )}

        {viewAllLink && (
          <div className="h-5 md:h-6 w-32 bg-white/10 animate-pulse rounded" />
        )}
      </div>

      {/* Карусель скелетон */}
      <div className="w-full mx-auto">
        <div className="relative overflow-hidden">
          <div className="flex touch-pan-y gap-2 md:gap-3 lg:gap-1 px-2 md:px-3 lg:px-1">
            {[...Array(count)].map((_, idx) => (
              <div
                key={idx}
                className={`min-w-0 ${slideClasses} flex flex-col`}
              >
                <div className={`relative w-full ${slideHeight} overflow-hidden`}>
                  {/* Основной блок изображения с shimmer эффектом */}
                  <div
                    className="absolute inset-0 bg-gradient-to-r from-white/5 via-white/15 to-white/5"
                    style={{
                      backgroundSize: '200% 100%',
                      animation: 'shimmer 2s infinite',
                    }}
                  />

                  {/* Кнопка "в корзину" скелетон */}
                  <div className="absolute top-3 right-3 z-10">
                    <div className="h-8 w-20 bg-white/10 animate-pulse rounded-md" />
                  </div>

                  {/* Блок информации внизу скелетон */}
                  <div
                    className="absolute bottom-0 left-0 right-0 transition-transform duration-300"
                    style={{
                      background: 'var(--background)',
                      borderTop: '1px solid var(--mint-dark)',
                    }}
                  >
                    <div className="p-4 md:pb-2 pb-10">
                      <div className="flex items-center justify-between mb-2">
                        {/* Название скелетон */}
                        <div className="h-5 w-32 bg-white/10 animate-pulse rounded" />
                        {/* Цена скелетон */}
                        <div className="h-6 w-20 bg-white/10 animate-pulse rounded" />
                      </div>

                      {/* Дополнительная информация скелетон (скрыта на мобильных) */}
                      <div className="hidden md:block space-y-2">
                        <div className="h-4 w-40 bg-white/10 animate-pulse rounded" />
                        <div className="h-4 w-full bg-white/10 animate-pulse rounded" />
                        <div className="h-4 w-3/4 bg-white/10 animate-pulse rounded" />
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </div>

          {/* Кнопки навигации (disabled состояние) */}
          <button
            disabled
            className="absolute left-4 top-1/2 text-2xl -translate-y-1/2 w-8 h-8 rounded-full bg-[var(--mint-dark)]/20 text-[var(--color-pink-light)]/30 cursor-not-allowed flex items-center justify-center z-10"
            style={{
              WebkitTouchCallout: 'none',
              WebkitUserSelect: 'none',
              userSelect: 'none',
              touchAction: 'manipulation',
            }}
            aria-label="Предыдущий"
          >
            ‹
          </button>
          <button
            disabled
            className="absolute right-4 top-1/2 text-2xl -translate-y-1/2 w-8 h-8 rounded-full bg-[var(--mint-dark)]/20 text-[var(--color-pink-light)]/30 cursor-not-allowed flex items-center justify-center z-10"
            style={{
              WebkitTouchCallout: 'none',
              WebkitUserSelect: 'none',
              userSelect: 'none',
              touchAction: 'manipulation',
            }}
            aria-label="Следующий"
          >
            ›
          </button>
        </div>
      </div>

      {/* CSS для shimmer анимации */}
      <style jsx global>{`
        @keyframes shimmer {
          0% {
            background-position: -200% 0;
          }
          100% {
            background-position: 200% 0;
          }
        }
      `}</style>
    </section>
  )
}

