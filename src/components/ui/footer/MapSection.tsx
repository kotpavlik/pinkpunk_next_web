import React, { memo } from 'react'
import YandexMapAPI from '../map/YandexMapAPI'
import InfoBlocks, { AlfaPaymentIcons } from './InfoBlocks'


const MapSection = memo(function MapSection() {
    return (
        <section className="flex w-full min-h-0 flex-col items-stretch gap-4 p-2 md:flex-row md:gap-6 md:p-6">
            <div className="flex min-h-0 w-full min-w-0 flex-1 flex-col">
                <InfoBlocks />
            </div>

            <div className="w-full min-w-0 shrink-0 md:w-1/2 md:max-w-[50%]">
                <YandexMapAPI
                    address="Pink Punk"
                    className="h-[280px] w-full rounded-lg overflow-hidden shadow-lg sm:h-[300px] md:h-[min(420px,50vh)] md:min-h-[320px]"
                    coordinates={[27.541278, 53.894522]}
                />
            </div>

            <AlfaPaymentIcons placement="belowMapMobile" />
        </section>
    )
})

export default MapSection