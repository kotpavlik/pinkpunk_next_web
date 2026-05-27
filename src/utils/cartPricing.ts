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

function clampDiscountPercent(discountPercent: number): number {
    if (!Number.isFinite(discountPercent)) return 0
    return Math.max(0, Math.min(100, Math.floor(discountPercent)))
}

/** Сумма строки после скидки (floor на уровне строки, как в корзине/чекауте). */
export function computeLineDiscountedSum(lineSum: number, discountPercent: number): number {
    const p = clampDiscountPercent(discountPercent)
    if (p <= 0 || lineSum <= 0) return lineSum
    return lineSum - Math.floor((lineSum * p) / 100)
}

export function computeCartPricingFromSubtotal(subtotal: number, discountPercent: number): CartPricing {
    const safeSubtotal = Math.max(0, Math.floor(subtotal))
    const p = clampDiscountPercent(discountPercent)
    const discountAmount = p > 0 ? Math.floor((safeSubtotal * p) / 100) : 0
    return {
        subtotal: safeSubtotal,
        discountPercent: p,
        discountAmount,
        total: safeSubtotal - discountAmount,
    }
}

type CartPricingLine = { unitPrice?: number; quantity: number }

export function computeCartPricingFromLines(
    lines: CartPricingLine[],
    discountPercent: number,
    subtotalFallback?: number,
): CartPricing | null {
    let subtotal = 0
    let hasPrices = false
    for (const line of lines) {
        const unit = line.unitPrice
        if (unit != null && !Number.isNaN(unit)) {
            subtotal += unit * line.quantity
            hasPrices = true
        }
    }
    if (!hasPrices) {
        if (subtotalFallback == null || Number.isNaN(subtotalFallback)) return null
        subtotal = subtotalFallback
    }
    return computeCartPricingFromSubtotal(subtotal, discountPercent)
}

/** Бэкендовый `pricing` приоритетнее; иначе расчёт по строкам и скидке клиента. */
export function resolveCartPricing(
    pricing: CartPricing | null | undefined,
    lines: CartPricingLine[],
    discountPercent: number,
    subtotalFallback?: number,
): CartPricing | null {
    if (pricing) return pricing
    return computeCartPricingFromLines(lines, discountPercent, subtotalFallback)
}
