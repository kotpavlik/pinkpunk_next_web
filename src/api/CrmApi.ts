import { instance } from './Api'
import type { PinkPunkOrder, ShippingAddress } from './OrderApi'

/** Сводка + полные заказы в списке CRM (GET /admin/crm/users) */
export type CrmUserStats = {
    ordersTotal: number
    ordersPaidOrCompleted: number
    totalSpent: number
    totalUnitsPurchased: number
    lastOrderAt?: string
    /** Полные заказы пользователя (новые → старые), populate items.product; только в ответе CRM */
    orders?: PinkPunkOrder[]
}

export type CrmCartLineItem = {
    quantity: number
    /** Mongo `_id` карточки товара */
    productId: string
    /** Поле `productId` карточки (артикул с витрины), если подтянулось */
    listingProductId?: string
    name: string
    photo: string | null
    size?: string
    /** Цена за единицу на момент ответа (если есть) */
    unitPrice?: number
}

export type CrmCartSummary = {
    totalItems: number
    totalPrice: number
    lastUpdated: string
    /** Позиции в порядке из Mongo (если бэкенд отдаёт в CRM) */
    items?: CrmCartLineItem[]
}

export type CrmOfflinePurchasesSummary = {
    linesCount: number
    totalAmount: number
}

/** Элемент списка клиентов CRM */
export type CrmListUser = {
    _id: string
    userId: number
    username?: string
    firstName?: string
    lastName?: string
    personalFirstName?: string
    personalLastName?: string
    email?: string
    userPhoneNumber?: string
    /** Нормализованный телефон, если бэкенд дозаполнил из заказа */
    userPhoneNormalized?: string
    shippingAddress?: ShippingAddress
    photo_url?: string
    photoUrl?: string
    isAdmin?: boolean
    isPremium?: boolean
    owner?: boolean
    lastActivity?: string
    languageCode?: string
    hasStartedBot?: boolean
    createdAt?: string
    updatedAt?: string
    dateOfBirth?: string
    heightCm?: number
    hipsCircumferenceCm?: number
    armLengthCm?: number
    chestCircumferenceCm?: number
    waistCircumferenceCm?: number
    trousersLengthCm?: number
    adminNotes?: string
    walletAddress?: string
    my_referers?: unknown[]
    stats?: CrmUserStats
    referralsCount?: number
    cart?: CrmCartSummary | null
    offlinePurchasesSummary?: CrmOfflinePurchasesSummary
}

/** Populate товара в офлайн-строке / заказе */
export type CrmProductRef = {
    _id: string
    productId?: string
    name: string
    price: number
    size: string
    photos?: string[]
}

export type CrmOfflineLineCatalog = {
    _id: string
    kind: 'catalog'
    quantity: number
    createdAt: string
    addedByUserId: number
    product: string | CrmProductRef
    unitPrice: number
    productNameSnapshot: string
    sizeSnapshot: string
}

export type CrmOfflineLineCustom = {
    _id: string
    kind: 'custom'
    quantity: number
    createdAt: string
    addedByUserId: number
    customName: string
    customDescription?: string
    customPrice: number
}

export type CrmOfflineLine = CrmOfflineLineCatalog | CrmOfflineLineCustom

/** Профиль в карточке клиента — документ пользователя + офлайн-массив */
export type CrmProfile = Omit<CrmListUser, 'stats' | 'offlinePurchasesSummary'> & {
    crmOfflinePurchases: CrmOfflineLine[]
}

/**
 * Карточка GET /admin/crm/users/:userId.
 * Текущая корзина — поле `cart` здесь (сводка + опционально `items`); в `profile` корзины нет.
 * `orders[].cart` — id корзины на момент заказа, не то же самое.
 */
export type CrmUserCardResponse = {
    profile: CrmProfile
    orders: PinkPunkOrder[]
    referralsCount: number
    cart: CrmCartSummary | null
}

/** PATCH /admin/crm/users/:userId — только разрешённые поля, без owner */
export type CrmUpdateUserDto = {
    personalFirstName?: string
    personalLastName?: string
    firstName?: string
    lastName?: string
    email?: string
    userPhoneNumber?: string
    shippingAddress?: Partial<ShippingAddress>
    username?: string
    walletAddress?: string
    isAdmin?: boolean
    dateOfBirth?: string
    heightCm?: number
    hipsCircumferenceCm?: number
    armLengthCm?: number
    chestCircumferenceCm?: number
    waistCircumferenceCm?: number
    trousersLengthCm?: number
    adminNotes?: string
}

export type CrmAddOfflineCatalogBody = {
    kind: 'catalog'
    productId: string
    quantity?: number
    unitPriceOverride?: number
}

export type CrmAddOfflineCustomBody = {
    kind: 'custom'
    customName: string
    customDescription?: string
    customPrice: number
    quantity?: number
}

/** Ответ POST/DELETE офлайн-покупки; `productStock` только для каталожных операций */
export type CrmOfflinePurchasesMutationResponse = {
    success: boolean
    crmOfflinePurchases: CrmOfflineLine[]
    productStock?: {
        productId: string
        stockQuantity: number
    }
}

/** Тело ошибки 409 при нехватке остатка */
export type CrmInsufficientStockErrorBody = {
    statusCode?: number
    message?: string
    code?: 'INSUFFICIENT_STOCK'
    requestedQty?: number
    availableQty?: number
    productId?: string
    productName?: string
}

function unwrapList<T>(data: unknown): T[] {
    if (Array.isArray(data)) return data as T[]
    if (data && typeof data === 'object') {
        const o = data as Record<string, unknown>
        const keys = ['data', 'users', 'items', 'results', 'rows'] as const
        for (const k of keys) {
            const v = o[k]
            if (Array.isArray(v)) return v as T[]
        }
    }
    return []
}

/** Если бэкенд вешает CRM под префиксом (например Nest globalPrefix `v1`), задайте `NEXT_PUBLIC_CRM_PREFIX=v1` */
function crmPath(suffix: string): string {
    const raw = process.env.NEXT_PUBLIC_CRM_PREFIX?.trim() ?? ''
    const seg = raw.replace(/^\/+|\/+$/g, '')
    const path = suffix.startsWith('/') ? suffix : `/${suffix}`
    if (!seg) return path
    return `/${seg}${path}`
}

export const CrmApi = {
    async getUsers(): Promise<CrmListUser[]> {
        const path = crmPath('/admin/crm/users')
        const { data } = await instance.get<unknown>(path)
        console.log('[CRM] GET', path, '— сырой ответ:', data)
        const list = unwrapList<CrmListUser>(data)
        console.log('[CRM] Пользователей после unwrap:', list.length)
        if (list.length > 0) {
            console.log('[CRM] Первый пользователь (пример):', list[0])
        }
        return list
    },

    async getUserCard(telegramUserId: number): Promise<CrmUserCardResponse> {
        const path = crmPath(`/admin/crm/users/${telegramUserId}`)
        const { data: raw } = await instance.get<unknown>(path)
        console.log('[CRM] GET', path, '— сырой ответ:', raw)
        if (raw && typeof raw === 'object' && 'profile' in raw && 'orders' in raw) {
            const card = raw as CrmUserCardResponse
            console.log('[CRM] Карточка: заказов', card.orders?.length ?? 0, 'рефералов', card.referralsCount)
            return card
        }
        if (raw && typeof raw === 'object' && 'data' in raw) {
            const inner = (raw as { data: unknown }).data
            if (inner && typeof inner === 'object' && 'profile' in inner) {
                const card = inner as CrmUserCardResponse
                console.log('[CRM] Карточка (в обёртке data): заказов', card.orders?.length ?? 0)
                return card
            }
        }
        throw new Error('Неожиданный формат ответа карточки CRM')
    },

    /** Ответ тела не используем — актуальное состояние берётся через getUserCard после сохранения. */
    async patchUser(telegramUserId: number, body: CrmUpdateUserDto): Promise<void> {
        await instance.patch<unknown>(crmPath(`/admin/crm/users/${telegramUserId}`), body)
    },

    async addOfflinePurchase(telegramUserId: number, body: CrmAddOfflineCatalogBody | CrmAddOfflineCustomBody) {
        const { data } = await instance.post<CrmOfflinePurchasesMutationResponse>(
            crmPath(`/admin/crm/users/${telegramUserId}/offline-purchases`),
            body
        )
        return data
    },

    async deleteOfflineLine(telegramUserId: number, lineId: string): Promise<CrmOfflinePurchasesMutationResponse> {
        const { data } = await instance.delete<CrmOfflinePurchasesMutationResponse>(
            crmPath(`/admin/crm/users/${telegramUserId}/offline-purchases/${lineId}`)
        )
        return data
    },
}
