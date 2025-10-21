'use client'

import React, { memo } from 'react'

interface BlurredTextProps {
    blurStyles: React.CSSProperties
}

const BlurredText = memo(function BlurredText({ blurStyles }: BlurredTextProps) {
    // Извлекаем значение блюра из стилей
    const blurValue = blurStyles.backdropFilter
        ? (blurStyles.backdropFilter as string).match(/blur\(([^)]+)\)/)?.[1] || '0px'
        : '0px'

    return (
        <div className="text-center relative">
            <h1
                className="text-6xl md:text-9xl font-[900] font-durik  text-[#ff2b9c] transition-all duration-500 ease-out"
                style={{
                    filter: `blur(${blurValue})`,
                    WebkitFilter: `blur(${blurValue})`
                }}
            >
                ПИНК ПАНК
            </h1>

        </div>
    )
})

export default BlurredText
