'use client'

import BlurredText from './BlurredText'
import MapSection from './MapSection'
import MarqueeText from './MarqueeText'
import { useScrollBlur } from '@/hooks/useScrollBlur'
import React from 'react'

const Footer = React.memo(function Footer() {
    const { blurStyles } = useScrollBlur()

    return (
        <footer className="w-full h-screen relative overflow-hidden">
            <div className="w-full h-full flex flex-col">

                <section className="w-full h-1/3 flex items-center justify-center">
                    <BlurredText blurStyles={blurStyles} />
                </section>

                <MarqueeText />

                <MapSection />
                <div className="flex md:flex-row flex-col md:items-center mx-4 my-2 mb-4 md:justify-around justify-center text-start text-sm text-gray-500 ">
                    <div className="">политика конфиденциальности</div>
                    <div className=" ">
                        разработка и дизайн: <span className="font-bold font-blauer-nue text-pink-light">pink punk dev</span>
                    </div>
                    <div> © 2025 All rights reserved.</div>
                </div>
            </div>

        </footer>
    )
})

export default Footer