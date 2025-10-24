"use client";

import useEmblaCarousel from 'embla-carousel-react';
import { useCallback, useEffect, useState } from 'react';
import Image from "next/image";

const photos = [
    {
        src: "/images/about_us_img/sectionTwo.jpg",
        alt: "Владельцы Pink Punk"
    },
    {
        src: "/images/about_us_img/sectionTwo8.jpg",
        alt: "Команда Pink Punk"
    },
    {
        src: "/images/about_us_img/sectionTwo1.jpg",
        alt: "Команда Pink Punk"
    },
    {
        src: "/images/about_us_img/sectionTwo2.jpg",
        alt: "Команда Pink Punk"
    },
    {
        src: "/images/about_us_img/sectionTwo3.jpg",
        alt: "Команда Pink Punk"
    },
    {
        src: "/images/about_us_img/sectionTwo4.jpg",
        alt: "Команда Pink Punk"
    },
    {
        src: "/images/about_us_img/sectionTwo5.jpg",
        alt: "Команда Pink Punk"
    },

    {
        src: "/images/about_us_img/sectionTwo7.jpg",
        alt: "Команда Pink Punk"
    }
];

export default function PhotoSlider() {
    const [emblaRef, emblaApi] = useEmblaCarousel({
        loop: true,
        // Основные опции скролла:
        align: 'start', // 'start' | 'center' | 'end' | number
        slidesToScroll: 1, // количество слайдов для прокрутки
        dragFree: false, // свободная прокрутка без привязки к слайдам
        containScroll: 'trimSnaps', // 'trimSnaps' | 'keepSnaps' | false
        skipSnaps: false, // пропускать промежуточные слайды
        inViewThreshold: 0.7, // порог видимости для активации слайда

        // Анимация и поведение:
        duration: 25, // скорость анимации (мс)
        startIndex: 0, // начальный слайд

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

    // Дополнительные методы скролла:
    const scrollNext = useCallback(() => {
        if (emblaApi) emblaApi.scrollNext();
    }, [emblaApi]);

    const scrollPrev = useCallback(() => {
        if (emblaApi) emblaApi.scrollPrev();
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
        <div className="relative aspect-[9/16]   max-h-[80vh] w-[80vw] m-auto">
            <div className="overflow-hidden h-full" ref={emblaRef}>
                <div className="flex h-full gap-1">
                    {photos.map((photo, index) => (
                        <div key={index} className="flex-[0_0_100%] md:flex-[0_0_50%] min-w-0 h-full">
                            <div className="relative w-full h-full">
                                <Image
                                    src={photo.src}
                                    alt={photo.alt}
                                    fill
                                    className="object-cover"
                                    priority={index === 0}
                                />

                            </div>
                        </div>
                    ))}
                </div>
            </div>

            {/* Navigation buttons */}
            <button
                onClick={scrollPrev}
                disabled={!canScrollPrev}
                className={`absolute left-4   font-durik top-1/2 text-2xl -translate-y-1/2 w-8 h-8 rounded-full transition-colors flex items-center justify-center ${canScrollPrev
                    ? 'bg-[var(--mint-dark)]/50 text-[var(--color-pink-light)] hover:bg-[var(--green)]/70'
                    : 'bg-[var(--mint-dark)]/20 text-[var(--color-pink-light)]/30 cursor-not-allowed'
                    }`}
            >
                ‹
            </button>
            <button
                onClick={scrollNext}
                disabled={!canScrollNext}
                className={`absolute right-4 top-1/2 font-durik text-2xl -translate-y-1/2  w-8 h-8 rounded-full transition-colors flex items-center justify-center ${canScrollNext
                    ? 'bg-[var(--mint-dark)]/50 text-[var(--color-pink-light)] hover:bg-[var(--green)]/70'
                    : 'bg-[var(--mint-dark)]/20 text-[var(--color-pink-light)]/30 cursor-not-allowed'
                    }`}
            >
                ›
            </button>

            {/* Dots indicator */}
            <div className="absolute bottom-4 left-1/2 -translate-x-1/2 flex space-x-2">
                {scrollSnaps.map((_, index) => (
                    <button
                        key={index}
                        onClick={() => scrollTo(index)}
                        className={`w-2 h-2 rounded-full transition-colors ${index === selectedIndex ? 'bg-[var(--color-green)]' : 'bg-[var(--green)]/50'
                            }`}
                    />
                ))}
            </div>
        </div>
    );
}
