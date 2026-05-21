/** Блок `pricing` из ответов Cart API (см. FRONTEND_LOYALTY.md). */
export type CartPricing = {
    subtotal: number
    discountPercent: number
    discountAmount: number
    total: number
}

function asInt(v: unknown): number | null {
    if (typeof v === 'number' && Number.isFinite(v)) return Math.floor(v)
    if (typeof v === 'string' && v.trim() !== '') {
        const n = Number(v)
        if (Number.isFinite(n)) return Math.floor(n)
    }
    return null
}

export function normalizeCartPricing(raw: unknown): CartPricing | null {
    if (!raw || typeof raw !== 'object') return null
    const o = raw as Record<string, unknown>
    const subtotal = asInt(o.subtotal)
    const discountPercent = asInt(o.discountPercent)
    const discountAmount = asInt(o.discountAmount)
    const total = asInt(o.total)
    if (subtotal === null || discountPercent === null || discountAmount === null || total === null) {
        return null
    }
    return { subtotal, discountPercent, discountAmount, total }
}

export function formatByn(amount: number): string {
    return `${Math.floor(Number(amount) || 0).toLocaleString('ru-RU')} BYN`
}

export function hasCartDiscount(pricing: CartPricing | null | undefined): boolean {
    if (!pricing) return false
    return pricing.discountPercent > 0 && pricing.discountAmount > 0
}
