import React, { memo } from 'react'
import YandexMapAPI from '../map/YandexMapAPI'
import InfoBlocks, { AlfaPaymentIcons, CompanyRequisitesBlock } from './InfoBlocks'

const PINK_PUNK_COORDINATES: [number, number] = [27.541278, 53.894522]

const MapSection = memo(function MapSection() {
    return (
        <section className="grid w-full min-h-0 grid-cols-1 items-stretch gap-4 p-2 md:grid-cols-[minmax(0,0.9fr)_minmax(0,1.35fr)_minmax(0,1fr)] md:gap-5 md:p-6">
            <div className="hidden min-h-0 w-full min-w-0 md:flex">
                <CompanyRequisitesBlock />
            </div>

            <div className="flex min-h-0 w-full min-w-0 flex-col">
                <InfoBlocks />
            </div>

            <div className="w-full min-w-0 md:h-full">
                <YandexMapAPI
                    address="Pink Punk"
                    className="h-[260px] w-full rounded-lg overflow-hidden shadow-lg sm:h-[280px] md:h-full md:min-h-[260px]"
                    coordinates={PINK_PUNK_COORDINATES}
                />
            </div>

            <AlfaPaymentIcons placement="belowMapMobile" />
            <div className="md:hidden">
                <CompanyRequisitesBlock />
            </div>
        </section>
    )
})

export default MapSection