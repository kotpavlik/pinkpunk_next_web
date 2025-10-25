"use client";

import useEmblaCarousel from 'embla-carousel-react';
import { useCallback, useEffect, useState } from 'react';
import Image from "next/image";

const photos = [
    {
        src: "/images/about_us_img/sectionThree.jpg",
        alt: "Владельцы Pink Punk"
    },
    {
        src: "/images/about_us_img/sectionThree6.jpeg",
        alt: "Команда Pink Punk"
    },
    {
        src: "/images/about_us_img/sectionThree1.jpg",
        alt: "Команда Pink Punk"
    },
    {
        src: "/images/about_us_img/sectionThree2.jpg",
        alt: "Команда Pink Punk"
    },
    {
        src: "/images/about_us_img/sectionThree3.jpg",
        alt: "Команда Pink Punk"
    },
    {
        src: "/images/about_us_img/sectionThree4.JPG",
        alt: "Команда Pink Punk"
    },
    {
        src: "/images/about_us_img/sectionThree5.JPG",
        alt: "Команда Pink Punk"
    },
];

export default function PhotoSlider3() {
    const [emblaRef, emblaApi] = useEmblaCarousel({
        loop: true,
        // Основные опции скролла:
        align: 'start', // 'start' | 'center' | 'end' | number
        slidesToScroll: 1, // количество слайдов для прокрутки
        dragFree: false, // свободная прокрутка без привязки к слайдам
        containScroll: 'trimSnaps', // 'trimSnaps' | 'keepSnaps' | false
        skipSnaps: false, // пропускать промежуточные слайды
        inViewThreshold: 0.7, // порог видимости для активации слайда

        // Анимация и поведение - оптимизировано для iOS:
        duration: 20, // быстрее для мобильных устройств
        startIndex: 0, // начальный слайд

        // iOS оптимизации:
        watchDrag: true, // включить отслеживание перетаскивания
        watchResize: true, // отслеживать изменение размера
        watchSlides: true, // отслеживать слайды

        // Автопрокрутка (если нужна):
        // autoplay: true,
        // autoplayDelay: 3000,

        // Направление:
        // direction: 'ltr', // 'ltr' | 'rtl'

        // Ось прокрутки:
        // axis: 'x', // 'x' | 'y'
    });
    const [selectedIndex, setSelectedIndex] = useState(0);
    const [scrollSnaps, setScrollSnaps] = useState<number[]>([]);
    const [canScrollPrev, setCanScrollPrev] = useState(false);
    const [canScrollNext, setCanScrollNext] = useState(false);

    const scrollTo = useCallback(
        (index: number) => emblaApi && emblaApi.scrollTo(index),
        [emblaApi]
    );

    // Дополнительные методы скролла с микро-задержками для iOS:
    const scrollNext = useCallback(() => {
        if (emblaApi) {
            // Микро-задержка для стабильности на iOS
            requestAnimationFrame(() => {
                emblaApi.scrollNext();
            });
        }
    }, [emblaApi]);

    const scrollPrev = useCallback(() => {
        if (emblaApi) {
            // Микро-задержка для стабильности на iOS
            requestAnimationFrame(() => {
                emblaApi.scrollPrev();
            });
        }
    }, [emblaApi]);



    const onSelect = useCallback(() => {
        if (!emblaApi) return;
        setSelectedIndex(emblaApi.selectedScrollSnap());
        setCanScrollPrev(emblaApi.canScrollPrev());
        setCanScrollNext(emblaApi.canScrollNext());
    }, [emblaApi]);

    useEffect(() => {
        if (!emblaApi) return;
        onSelect();
        setScrollSnaps(emblaApi.scrollSnapList());
        emblaApi.on('select', onSelect);
    }, [emblaApi, onSelect]);

    return (
        <div className="relative aspect-[9/16] max-h-[60vh] md:max-h-[80vh] md:w-[80vw] w-full m-auto">
            <div
                className="overflow-hidden h-full"
                ref={emblaRef}
                style={{
                    // iOS Safari fixes
                    WebkitOverflowScrolling: 'touch',
                    transform: 'translate3d(0,0,0)',
                    backfaceVisibility: 'hidden',
                    perspective: '1000px',
                    willChange: 'transform'
                }}
            >
                <div
                    className="flex h-full gap-1"
                    style={{
                        // Hardware acceleration for smooth animations
                        transform: 'translate3d(0,0,0)',
                        backfaceVisibility: 'hidden',
                        WebkitBackfaceVisibility: 'hidden',
                        willChange: 'transform'
                    }}
                >
                    {photos.map((photo, index) => (
                        <div
                            key={index}
                            className="flex-[0_0_100%] md:flex-[0_0_50%] min-w-0 h-full"
                            style={{
                                // Prevent flickering on iOS
                                transform: 'translate3d(0,0,0)',
                                backfaceVisibility: 'hidden',
                                WebkitBackfaceVisibility: 'hidden',
                                willChange: 'transform',
                                // Force GPU layer
                                WebkitTransform: 'translate3d(0,0,0)',
                                // Prevent repaint
                                contain: 'layout style paint'
                            }}
                        >
                            <div
                                className="relative w-full h-full"
                                style={{
                                    // Additional iOS fixes
                                    transform: 'translate3d(0,0,0)',
                                    backfaceVisibility: 'hidden',
                                    WebkitBackfaceVisibility: 'hidden',
                                    // Prevent content jumping
                                    WebkitTransform: 'translate3d(0,0,0)',
                                    // Optimize rendering
                                    contain: 'layout style paint'
                                }}
                            >
                                <Image
                                    src={photo.src}
                                    alt={photo.alt}
                                    fill
                                    sizes="(max-width: 768px) 100vw, 50vw"
                                    className="object-cover"
                                    priority={index === 0}
                                    style={{
                                        // iOS image optimization
                                        transform: 'translate3d(0,0,0)',
                                        backfaceVisibility: 'hidden',
                                        WebkitBackfaceVisibility: 'hidden',
                                        WebkitTransform: 'translate3d(0,0,0)',
                                        // Prevent image flickering
                                        willChange: 'transform',
                                        // Optimize for mobile
                                        imageRendering: 'auto'
                                    }}
                                    // Preload next/prev images for smoother transitions
                                    loading={index <= 1 ? 'eager' : 'lazy'}
                                />
                            </div>
                        </div>
                    ))}
                </div>
            </div>

            {/* Navigation buttons - оптимизированы для iOS */}
            <button
                onClick={scrollPrev}
                disabled={!canScrollPrev}
                className={`absolute left-4 font-durik top-1/2 text-2xl -translate-y-1/2 w-8 h-8 rounded-full transition-colors flex items-center justify-center ${canScrollPrev
                    ? 'bg-[var(--mint-dark)]/50 text-[var(--color-pink-light)] hover:bg-[var(--green)]/70'
                    : 'bg-[var(--mint-dark)]/20 text-[var(--color-pink-light)]/30 cursor-not-allowed'
                    }`}
                style={{
                    // iOS touch optimization
                    WebkitTouchCallout: 'none',
                    WebkitUserSelect: 'none',
                    userSelect: 'none',
                    touchAction: 'manipulation',
                    // Hardware acceleration
                    transform: 'translate3d(0,0,0)',
                    backfaceVisibility: 'hidden',
                    WebkitBackfaceVisibility: 'hidden',
                    // Prevent flickering
                    willChange: 'transform',
                    // iOS specific
                    WebkitTapHighlightColor: 'transparent'
                }}
            >
                ‹
            </button>
            <button
                onClick={scrollNext}
                disabled={!canScrollNext}
                className={`absolute right-4 top-1/2 font-durik text-2xl -translate-y-1/2 w-8 h-8 rounded-full transition-colors flex items-center justify-center ${canScrollNext
                    ? 'bg-[var(--mint-dark)]/50 text-[var(--color-pink-light)] hover:bg-[var(--green)]/70'
                    : 'bg-[var(--mint-dark)]/20 text-[var(--color-pink-light)]/30 cursor-not-allowed'
                    }`}
                style={{
                    // iOS touch optimization
                    WebkitTouchCallout: 'none',
                    WebkitUserSelect: 'none',
                    userSelect: 'none',
                    touchAction: 'manipulation',
                    // Hardware acceleration
                    transform: 'translate3d(0,0,0)',
                    backfaceVisibility: 'hidden',
                    WebkitBackfaceVisibility: 'hidden',
                    // Prevent flickering
                    willChange: 'transform',
                    // iOS specific
                    WebkitTapHighlightColor: 'transparent'
                }}
            >
                ›
            </button>

            {/* Dots indicator - оптимизированы для iOS */}
            <div
                className="absolute bottom-4 left-1/2 -translate-x-1/2 flex space-x-2"
                style={{
                    // iOS touch optimization
                    WebkitTouchCallout: 'none',
                    WebkitUserSelect: 'none',
                    userSelect: 'none',
                    touchAction: 'manipulation'
                }}
            >
                {scrollSnaps.map((_, index) => (
                    <button
                        key={index}
                        onClick={() => {
                            // Микро-задержка для стабильности на iOS
                            requestAnimationFrame(() => {
                                scrollTo(index);
                            });
                        }}
                        className={`w-2 h-2 rounded-full transition-colors ${index === selectedIndex ? 'bg-[var(--color-green)]' : 'bg-[var(--green)]/50'
                            }`}
                        style={{
                            // iOS touch optimization
                            WebkitTouchCallout: 'none',
                            WebkitUserSelect: 'none',
                            userSelect: 'none',
                            touchAction: 'manipulation',
                            // Hardware acceleration
                            transform: 'translate3d(0,0,0)',
                            backfaceVisibility: 'hidden',
                            WebkitBackfaceVisibility: 'hidden',
                            // iOS specific
                            WebkitTapHighlightColor: 'transparent'
                        }}
                    />
                ))}
            </div>
        </div>
    );
}
