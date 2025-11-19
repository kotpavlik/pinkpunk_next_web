'use client'

import React, { useEffect, useRef, useMemo } from 'react'

interface YandexMapAPIProps {
    address?: string
    className?: string
    coordinates?: [number, number] // [долгота, широта]
}

import type { YMapLocationRequest } from 'ymaps3';

declare global {
    interface Window {
        ymaps3: {
            ready: Promise<void>;
            YMap: new (container: HTMLElement, options: { location: YMapLocationRequest }) => {
                addChild: (child: unknown) => void;
                destroy: () => void;
            };
            YMapDefaultSchemeLayer: new (options?: Record<string, unknown>) => unknown;
            YMapDefaultFeaturesLayer: new (options?: Record<string, unknown>) => unknown;
            YMapMarker: new (options: { coordinates: number[], title?: string, subtitle?: string, color?: string }, element?: HTMLElement) => unknown;
        }
    }
}

const YandexMapAPI = React.memo(function YandexMapAPI({
    address = "г.Минск ул.Мясникова 76",
    className = "",
    coordinates = [27.541278, 53.894522]
}: YandexMapAPIProps) {
    const mapRef = useRef<HTMLDivElement>(null)
    const mapInstance = useRef<unknown>(null)

    useEffect(() => {
        const initMap = async () => {
            if (!mapRef.current) return

            const apiKey = process.env.NEXT_PUBLIC_YANDEX_API_KEY || ''

            // Проверяем, не загружен ли уже скрипт
            if (window.ymaps3) {
                initMapWithAPI()
                return
            }

            // Загружаем Яндекс.Карты API
            const script = document.createElement('script')

            script.src = apiKey
                ? `https://api-maps.yandex.ru/v3/?apikey=${apiKey}&lang=ru_RU`
                : `https://api-maps.yandex.ru/v3/?lang=ru_RU`
            script.async = true

            script.onerror = () => {
                // Ошибка загрузки скрипта
            }

            script.onload = () => {
                window.ymaps3.ready.then(() => {
                    initMapWithAPI()
                })
            }

            document.head.appendChild(script)

            return () => {
                if (mapInstance.current && typeof mapInstance.current === 'object' && 'destroy' in mapInstance.current) {
                    (mapInstance.current as { destroy: () => void }).destroy()
                }
                document.head.removeChild(script)
            }
        }

        const initMapWithAPI = async () => {
            try {

                // Проверяем размер контейнера
                if (mapRef.current) {
                    const rect = mapRef.current.getBoundingClientRect()

                    // Ограничиваем максимальный размер для WebGL
                    if (rect.width > 4096 || rect.height > 4096) {
                        mapRef.current.style.maxWidth = '4096px'
                        mapRef.current.style.maxHeight = '4096px'
                    }
                }

                // Ждем готовности API 3.0
                await window.ymaps3.ready

                const { YMap, YMapDefaultSchemeLayer, YMapDefaultFeaturesLayer, YMapMarker } = window.ymaps3

                // Создаем карту
                mapInstance.current = new YMap(mapRef.current!, {
                    location: {
                        center: coordinates,
                        zoom: 17
                    }
                })

                // Используем точные координаты организации

                // Добавляем слои карты с кастомизацией
                if (mapInstance.current && typeof mapInstance.current === 'object' && 'addChild' in mapInstance.current) {
                    const customLayer = new YMapDefaultSchemeLayer({
                        customization: [
                            // Вся карта в черно-белом режиме
                            {
                                elements: 'geometry',
                                stylers: [
                                    { saturation: -1 } // Убираем все цвета
                                ]
                            },
                            // Текст и подписи остаются черными
                            {
                                elements: 'label',
                                stylers: [
                                    { saturation: -1 }
                                ]
                            },
                            // Только здание нашего офиса в розовом тоне
                            {
                                tags: { all: ['building'] },
                                elements: 'geometry.fill',
                                stylers: [
                                    { saturation: -1 } // Сначала делаем все здания серыми
                                ]
                            },
                            // Розовое здание только в радиусе нашего офиса
                            {
                                tags: { all: ['building'] },
                                elements: 'geometry.fill',
                                stylers: [
                                    { hue: '#ff2b9c' }, // Розовый тон
                                    { saturation: 0.8 },
                                    { lightness: 0.3 }
                                ],
                                // Ограничиваем только зонами рядом с нашими координатами
                                zoom: { min: 16, max: 20 }
                            }
                        ]
                    })

                        ; (mapInstance.current as { addChild: (child: unknown) => void }).addChild(customLayer)
                        ; (mapInstance.current as { addChild: (child: unknown) => void }).addChild(new YMapDefaultFeaturesLayer())
                }

                // Создаем кастомный HTML элемент для маркера
                const markerElement = document.createElement('div')
                markerElement.innerHTML = `
                    <div id="custom-marker-root"></div>
                `

                // Создаем кастомную метку с HTML элементом
                const customMarker = new YMapMarker({
                    coordinates: coordinates
                }, markerElement)

                // Рендерим React компонент в маркер
                import('react-dom/client').then(({ createRoot }) => {
                    import('./CustomMapMarker').then(({ default: CustomMapMarker }) => {
                        const root = createRoot(markerElement.querySelector('#custom-marker-root')!)
                        root.render(React.createElement(CustomMapMarker, {
                            title: 'Пинк Панк',
                            subtitle: address,
                            onClick: () => { }
                        }))
                    })
                })

                // Добавляем метку на карту
                if (mapInstance.current && typeof mapInstance.current === 'object' && 'addChild' in mapInstance.current) {
                    (mapInstance.current as { addChild: (child: unknown) => void }).addChild(customMarker)
                }
            } catch {
                // Ошибка создания карты
            }
        }

        initMap()

        return () => {
            if (mapInstance.current && typeof mapInstance.current === 'object' && 'destroy' in mapInstance.current) {
                (mapInstance.current as { destroy: () => void }).destroy()
            }
        }
    }, [coordinates, address])

    // Мемоизируем стили для предотвращения перерендера
    const mapStyles = useMemo(() => ({
        minHeight: '400px',
        height: '400px',
        width: '100%'
    }), [])

    return (
        <div className={`${className} overflow-hidden`}>
            <div
                ref={mapRef}
                style={mapStyles}
            />
        </div>
    )
})

export default YandexMapAPI
