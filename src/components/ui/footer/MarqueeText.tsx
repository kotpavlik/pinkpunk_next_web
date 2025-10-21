'use client'

import React, { useEffect, useRef } from 'react'

export default function MarqueeText() {
    const textPathRef = useRef<SVGTextPathElement>(null)

    useEffect(() => {
        let offset = 0
        const animate = () => {
            offset -= 0.05 // Скорость движения
            if (offset < -100) {
                offset = 0
            }
            if (textPathRef.current) {
                textPathRef.current.setAttribute('startOffset', `${offset}%`)
            }
            requestAnimationFrame(animate)
        }
        const animationId = requestAnimationFrame(animate)

        return () => cancelAnimationFrame(animationId)
    }, [])

    return (
        <div className="absolute md:block hidden left-0 right-0 overflow-hidden z-50 pointer-events-none w-full" style={{
            top: 'calc(13.33vh + 10vh)',
            transform: 'rotate(-10deg)',
            height: '35vh'
        }}>


            <svg className="w-full h-full relative z-10" viewBox="0 0 2000 100" preserveAspectRatio="none">
                <defs>
                    <path
                        id="curve"
                        d="M 0 50 Q 250 25, 500 50 T 1000 50 T 1500 50 T 2000 50 T 2500 50 T 3000 50 T 3500 50 T 4000 50"
                        fill="var(--background)"
                    />
                    {/* Верхняя граница */}
                    <path
                        id="curveTop"
                        d="M 0 30 Q 250 5, 500 30 T 1000 30 T 1500 30 T 2000 30 T 2500 30 T 3000 30 T 3500 30 T 4000 30"
                        fill="transparent"
                    />
                    {/* Нижняя граница */}
                    <path
                        id="curveBottom"
                        d="M 0 70 Q 250 45, 500 70 T 1000 70 T 1500 70 T 2000 70 T 2500 70 T 3000 70 T 3500 70 T 4000 70"
                        fill="transparent"
                    />
                </defs>



                {/* Нижняя линия */}
                <path
                    d="M 0 50 Q 250 25, 500 50 T 1000 50 T 1500 50 T 2000 50 T 2500 50 T 3000 50 T 3500 50 T 4000 50"
                    stroke="white"
                    strokeWidth="1"
                    fill="transparent"
                    opacity="1"
                />

                {/* Текст */}
                <text className=" font-durik uppercase" fill="white" fillOpacity="1" fontSize="40">
                    <textPath ref={textPathRef} href="#curve" startOffset="0%">
                        Ты и я — больше, чем просто друзья
                        Потому что я — твой а ты — моя проще ответить нельзя
                        Думаешь это мечты? Почему тогда я дарю тебе цветы и кольцо с камнем?
                        Дай мне ответ: выйдешь ты за меня или нет? Она говорит: «Да»
                        Мне было так одиноко на этом празднике жизни музыка играла моей дамой была стена
                        Твой белый танец как током меня ударил и мы с тех пор вместе и навсегда
                    </textPath>
                </text>
            </svg>
        </div>
    )
}

