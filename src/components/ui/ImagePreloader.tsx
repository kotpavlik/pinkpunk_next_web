"use client";

import { useEffect } from "react";

const imagesToPreload = [
    "/images/about_us_img/owners.jpeg",
    "/images/about_us_img/owners_2.jpg",
    "/images/about_us_img/owners_3.jpg",
    "/images/about_us_img/owners_4.jpg",
    "/images/about_us_img/sectionTwo.jpg",
    "/images/about_us_img/sectionTwo1.jpg",
    "/images/about_us_img/sectionTwo2.jpg",
    "/images/about_us_img/sectionTwo3.jpg",
    "/images/about_us_img/sectionTwo4.jpg",
    "/images/about_us_img/sectionTwo7.jpg",
    "/images/about_us_img/sectionTwo8.jpg",
];

export default function ImagePreloader() {
    useEffect(() => {
        // Предзагрузка изображений
        const preloadImages = () => {
            imagesToPreload.forEach((src) => {
                const img = new Image();
                img.src = src;
                img.onload = () => {
                    console.log(`✅ Изображение загружено: ${src}`);
                };
                img.onerror = () => {
                    console.warn(`❌ Ошибка загрузки: ${src}`);
                };
            });
        };

        // Запускаем предзагрузку сразу
        preloadImages();

        // Дополнительная предзагрузка через небольшую задержку
        const timeoutId = setTimeout(preloadImages, 100);

        return () => {
            clearTimeout(timeoutId);
        };
    }, []);


    return null; // Компонент не рендерит ничего
}
