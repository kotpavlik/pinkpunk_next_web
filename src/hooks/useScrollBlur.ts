import { useState, useEffect, useRef, useMemo } from 'react'

export function useScrollBlur() {
    const [blurIntensity, setBlurIntensity] = useState(0) // Новое состояние для интенсивности блюра
    const lastScrollY = useRef(0)
    const ticking = useRef(false)

    // Оптимизированный обработчик скролла
    const handleScroll = useMemo(() => {
        return () => {
            if (!ticking.current) {
                requestAnimationFrame(() => {
                    const currentScrollY = window.scrollY
                    const scrollDelta = currentScrollY - lastScrollY.current
                    
                    // Определяем направление и интенсивность скролла
                    if (scrollDelta < 0) {
                        // Скролл вверх - увеличиваем блюр (более плавно)
                        setBlurIntensity(prev => Math.min(prev + Math.abs(scrollDelta) / 5, 100))
                    } else if (scrollDelta > 0) {
                        // Скролл вниз - уменьшаем блюр (более плавно)
                        setBlurIntensity(prev => Math.max(prev - scrollDelta / 5, 0))
                    }
                    
                    lastScrollY.current = currentScrollY
                    ticking.current = false
                })
                ticking.current = true
            }
        }
    }, [])

    useEffect(() => {
        window.addEventListener('scroll', handleScroll, { passive: true })
        return () => window.removeEventListener('scroll', handleScroll)
    }, [handleScroll])

            // Мемоизируем стили блюра для предотвращения перерендера
            const blurStyles = useMemo(() => {
                // Блюр от 0% до 100% в зависимости от накопленной интенсивности
                const blurAmount = (blurIntensity / 100) * 20 // От 0px до 20px
                const opacity = 0.1 + (blurIntensity / 100) * 0.8 // От 0.1 до 0.9
                
                return {
                    backdropFilter: `blur(${blurAmount}px)`,
                    WebkitBackdropFilter: `blur(${blurAmount}px)`,
                    opacity
                }
            }, [blurIntensity])

    return { blurStyles }
}
