'use client'

import { useEffect, useState, useRef } from 'react'
import { getLevelTheme, getLadderItem } from '@/utils/loyaltyLevelTheme'

type Props = {
    levelId: string
    apiLabel: string
    onDismiss: () => void
    onCelebrate?: (levelId: string) => void
}

export default function LoyaltyLevelUpToast({ levelId, apiLabel, onDismiss, onCelebrate }: Props) {
    const [visible, setVisible] = useState(false)
    const theme = getLevelTheme(levelId)
    const item = getLadderItem(levelId)

    const onDismissRef = useRef(onDismiss)
    onDismissRef.current = onDismiss

    const onCelebrateRef = useRef(onCelebrate)
    onCelebrateRef.current = onCelebrate

    useEffect(() => {
        onCelebrateRef.current?.(levelId)
        const enter = requestAnimationFrame(() => setVisible(true))
        const autoClose = window.setTimeout(() => {
            setVisible(false)
            window.setTimeout(() => onDismissRef.current(), 320)
        }, 6000)
        return () => {
            cancelAnimationFrame(enter)
            window.clearTimeout(autoClose)
        }
    }, [levelId])

    return (
        <>
            <div
                role="alert"
                className={`fixed top-24 right-4 z-[10002] w-[min(100vw-2rem,340px)] transform transition-all duration-300 ease-out ${visible ? 'translate-x-0 opacity-100' : 'translate-x-full opacity-0'
                    }`}
            >
                <div
                    className="rounded-xl border border-white/15 bg-[#1a1a1a]/95 backdrop-blur-xl shadow-2xl overflow-hidden pl-1"
                    style={{ borderLeftWidth: 4, borderLeftColor: theme.labelColor }}
                >
                    <div className="p-4 pl-3">
                        <p className="text-lg font-semibold" style={{ color: theme.labelColor }}>
                            {item.id === 'insider' ? '💎' : item.id === 'legend' ? '👑' : '✨'} Поздравляем!
                        </p>
                        <p className="text-white font-durik text-base mt-1">Ты достиг уровня {apiLabel}</p>
                        <p className="text-white/60 text-xs mt-2 leading-relaxed">{theme.perk}</p>
                        <button
                            type="button"
                            onClick={() => {
                                setVisible(false)
                                window.setTimeout(onDismiss, 300)
                            }}
                            className="mt-3 text-xs text-white/50 hover:text-white underline"
                        >
                            Закрыть
                        </button>
                    </div>
                </div>
            </div>
        </>
    )
}
