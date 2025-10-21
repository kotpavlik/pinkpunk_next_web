import React, { memo } from 'react'
import YandexMapAPI from '../map/YandexMapAPI'

const MapSection = memo(function MapSection() {
    return (
        <section className="w-full flex-1 flex md:flex-row flex-col items-end justify-center gap-4 p-4">
            <div className="flex-1">
                <h2 className="text-2xl font-bold">Наш адрес</h2>
                <p className="text-sm text-gray-500">
                    г.Минск ул.Мясникова 76, 1 подъезд,помещение 14,последний этаж
                </p>
                © 2025 All rights reserved.
            </div>

            <div className="w-full md:w-1/2">
                <YandexMapAPI
                    address="Pink Punk"
                    className="rounded-lg overflow-hidden shadow-lg"
                    coordinates={[27.541278, 53.894522]}
                />
            </div>
        </section>
    )
})

export default MapSection
