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

                {/* Бегущая строка изогнутая */}
                <MarqueeText />

                <MapSection />
            </div>
        </footer>
    )
})

export default Footer