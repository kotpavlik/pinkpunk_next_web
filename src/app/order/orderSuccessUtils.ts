/** Данные последнего успешно созданного заказа (передача на /order/success). */
export type OrderSuccessPayload = {
    orderNumber: string
    status: string
    totalAmount: number
    payOnlineWithCard?: boolean
}

export const ORDER_SUCCESS_STORAGE_KEY = 'pinkpunk_last_order_success'

type OrderStatusKey =
    | 'pending_confirmation'
    | 'confirmed'
    | 'paid'
    | 'completed'
    | 'cancelled'

export function getOrderStatusText(status: string): string {
    const statusMap: Record<OrderStatusKey, string> = {
        pending_confirmation: 'ожидает подтверждения',
        confirmed: 'подтвержден',
        paid: 'оплачен',
        completed: 'выполнен',
        cancelled: 'отменен',
    }
    return statusMap[status as OrderStatusKey] || status
}

export function readOrderSuccessFromStorage(): OrderSuccessPayload | null {
    if (typeof window === 'undefined') return null
    try {
        const raw = sessionStorage.getItem(ORDER_SUCCESS_STORAGE_KEY)
        if (!raw) return null
        const data = JSON.parse(raw) as OrderSuccessPayload
        if (!data?.orderNumber || typeof data.totalAmount !== 'number' || !data.status) {
            return null
        }
        return data
    } catch {
        return null
    }
}

export function writeOrderSuccessToStorage(payload: OrderSuccessPayload): void {
    if (typeof window === 'undefined') return
    sessionStorage.setItem(ORDER_SUCCESS_STORAGE_KEY, JSON.stringify(payload))
}
