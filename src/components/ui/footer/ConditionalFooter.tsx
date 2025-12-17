'use client'

import { usePathname } from 'next/navigation'
import Footer from './Footer'

export default function ConditionalFooter() {
    const pathname = usePathname()

    // Скрываем футер на странице политики конфиденциальности
    if (pathname === '/privacy-policy') {
        return null
    }

    return <Footer />
}

