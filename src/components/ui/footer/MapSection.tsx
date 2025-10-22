import React, { memo } from 'react'
import YandexMapAPI from '../map/YandexMapAPI'
import InfoBlocks from './InfoBlocks'

const MapSection = memo(function MapSection() {
    return (
        <section className="w-full flex-1 flex md:flex-row flex-col items-end justify-center gap-4 md:p-6 p-2">
            <InfoBlocks />

            <div className="w-full md:w-1/2">
                <YandexMapAPI
                    address="Pink Punk"
                    className="rounded-lg overflow-hidden shadow-lg h-[300px] md:h-full"
                    coordinates={[27.541278, 53.894522]}
                />
            </div>
        </section>
    )
})

export default MapSection