import { animate } from 'framer-motion'

export const LOYALTY_RULES_HEADER_OFFSET = 96

export const LOYALTY_RULES_EASE = [0.22, 1, 0.36, 1] as const

export const LOYALTY_RULES_REVEAL = {
    hidden: { opacity: 0, y: 28 },
    visible: { opacity: 1, y: 0 },
}

export function prefersReducedMotion(): boolean {
    if (typeof window === 'undefined') return false
    return window.matchMedia('(prefers-reduced-motion: reduce)').matches
}

export function getSectionScrollTop(element: HTMLElement): number {
    return element.getBoundingClientRect().top + window.scrollY - LOYALTY_RULES_HEADER_OFFSET
}

let activeScrollAnimation: ReturnType<typeof animate> | null = null

export function animateScrollToSection(id: string, onComplete?: () => void) {
    const target = document.getElementById(id)
    if (!target) return

    const targetY = Math.max(0, getSectionScrollTop(target))

    activeScrollAnimation?.stop()

    if (prefersReducedMotion()) {
        window.scrollTo({ top: targetY, behavior: 'auto' })
        onComplete?.()
        return
    }

    activeScrollAnimation = animate(window.scrollY, targetY, {
        duration: 0.85,
        ease: LOYALTY_RULES_EASE,
        onUpdate: (latest) => window.scrollTo(0, latest),
        onComplete: () => {
            activeScrollAnimation = null
            onComplete?.()
        },
    })
}
