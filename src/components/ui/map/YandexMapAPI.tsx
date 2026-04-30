'use client'

import React, { useEffect, useRef, useMemo, useState } from 'react'

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
    const [shouldLoadMap, setShouldLoadMap] = useState(false)
    const [isMapReady, setIsMapReady] = useState(false)
    const [hasMapError, setHasMapError] = useState(false)

    useEffect(() => {
        const currentMapNode = mapRef.current
        if (!currentMapNode) return

        if (!('IntersectionObserver' in window)) {
            setShouldLoadMap(true)
            return
        }

        const observer = new IntersectionObserver(
            ([entry]) => {
                if (entry.isIntersecting) {
                    setShouldLoadMap(true)
                    observer.disconnect()
                }
            },
            {
                rootMargin: '300px 0px',
                threshold: 0.01,
            }
        )

        observer.observe(currentMapNode)

        return () => observer.disconnect()
    }, [])

    useEffect(() => {
        if (!shouldLoadMap || hasMapError) return

        const scriptId = 'yandex-maps-api-v3'
        const apiKey = process.env.NEXT_PUBLIC_YANDEX_API_KEY || ''
        let isCancelled = false
        setIsMapReady(false)

        const initMapWithAPI = async () => {
            try {
                if (!mapRef.current || mapInstance.current) return

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
                setIsMapReady(true)
            } catch {
                if (!isCancelled) {
                    setHasMapError(true)
                }
            }
        }

        const handleScriptLoad = () => {
            if (isCancelled || !window.ymaps3) return
            window.ymaps3.ready.then(() => {
                if (!isCancelled) {
                    void initMapWithAPI()
                }
            }).catch(() => {
                if (!isCancelled) {
                    setHasMapError(true)
                }
            })
        }

        const handleScriptError = () => {
            if (!isCancelled) {
                setHasMapError(true)
            }
        }

        if (window.ymaps3) {
            handleScriptLoad()
        } else {
            let script = document.getElementById(scriptId) as HTMLScriptElement | null

            if (!script) {
                script = document.createElement('script')
                script.id = scriptId
                script.src = apiKey
                    ? `https://api-maps.yandex.ru/v3/?apikey=${apiKey}&lang=ru_RU`
                    : `https://api-maps.yandex.ru/v3/?lang=ru_RU`
                script.async = true
                document.head.appendChild(script)
            }

            script.addEventListener('load', handleScriptLoad)
            script.addEventListener('error', handleScriptError)
        }

        return () => {
            isCancelled = true
            const script = document.getElementById(scriptId)
            script?.removeEventListener('load', handleScriptLoad)
            script?.removeEventListener('error', handleScriptError)

            if (mapInstance.current && typeof mapInstance.current === 'object' && 'destroy' in mapInstance.current) {
                (mapInstance.current as { destroy: () => void }).destroy()
                mapInstance.current = null
            }
        }
    }, [coordinates, address, shouldLoadMap, hasMapError])

    const wrapperClassName = className || 'h-[400px] w-full'

    // Мемоизируем стили для предотвращения перерендера
    const mapStyles = useMemo(() => ({
        minHeight: 'inherit',
        height: '100%',
        width: '100%'
    }), [])

    return (
        <div className={`relative ${wrapperClassName} overflow-hidden bg-white/[0.03]`}>
            <div
                ref={mapRef}
                style={mapStyles}
            />
            {!shouldLoadMap && (
                <div className="absolute inset-0 flex h-full w-full items-center justify-center text-center font-cabinet-grotesk text-sm text-gray-500">
                    Карта загрузится при прокрутке
                </div>
            )}
            {shouldLoadMap && !isMapReady && !hasMapError && (
                <div className="absolute inset-0 flex h-full w-full items-center justify-center text-center font-cabinet-grotesk text-sm text-gray-500">
                    Загружаем карту...
                </div>
            )}
            {hasMapError && (
                <div className="absolute inset-0 flex h-full w-full items-center justify-center text-center font-cabinet-grotesk text-sm text-gray-500">
                    Не удалось загрузить карту
                </div>
            )}
        </div>
    )
})

export default YandexMapAPI
