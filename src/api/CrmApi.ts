import { instance } from './Api'
import type { PinkPunkOrder, ShippingAddress } from './OrderApi'
import { accountObjectIdFromCrmListRow, requireMongoObjectIdString } from '@/utils/mongoObjectId'
import {
    type CrmLoyalty,
    type CrmSetDiscountBody,
    type LoyaltyGiftLevelId,
    type LoyaltyStatus,
    isUsableLoyaltyStatus,
    normalizeCrmLoyalty,
    parseCrmLoyaltyApiResponse,
    parseLoyaltyApiResponse,
} from './LoyaltyApi'

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

/** Элемент списка клиентов CRM. В URL карточки только Mongo `row._id` (§13), не telegramUserId. */
export type CrmListUser = {
    /** Mongo ObjectId аккаунта — тот же `accountId` для `/admin/crm/users/:_id`. */
    _id: string
    /** Дубликат accountId, если бэкенд явно шлёт; для URL всегда брать `_id` первым (см. `accountObjectIdFromCrmListRow`). */
    accountId?: string
    id?: string
    /** Telegram id, если аккаунт с ботом; у чисто телефонного может отсутствовать. */
    telegramUserId?: number | null
    /**
     * Legacy: в старых ответах Telegram id мог приходить как `userId`.
     * @deprecated предпочтительно `telegramUserId`
     */
    userId?: number
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
    /** Сводка loyalty, если бэкенд отдаёт в списке CRM */
    loyalty?: LoyaltyStatus | null
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
 * Карточка GET /admin/crm/users/:accountId (Mongo ObjectId аккаунта).
 * Текущая корзина — поле `cart` здесь (сводка + опционально `items`); в `profile` корзины нет.
 * `orders[].cart` — id корзины на момент заказа, не то же самое.
 */
export type CrmUserCardResponse = {
    profile: CrmProfile
    orders: PinkPunkOrder[]
    referralsCount: number
    cart: CrmCartSummary | null
    loyalty?: CrmLoyalty | null
}

/** PATCH /admin/crm/users/:accountId — только разрешённые поля, без owner */
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

/**
 * Карточка CRM: бэкенд обязан отдавать `profile`, а `orders` иногда опускают при `[]`.
 * Раньше требование `'orders' in body` ломало парсинг и вкладку «Заказы».
 */
function normalizeCrmUserCardPayload(raw: unknown): CrmUserCardResponse | null {
    if (!raw || typeof raw !== 'object') return null
    const o = raw as Record<string, unknown>
    if (o.profile == null || typeof o.profile !== 'object') return null

    const p = o.profile as Record<string, unknown>
    const profile: CrmProfile = {
        ...(p as unknown as CrmProfile),
        crmOfflinePurchases: Array.isArray(p.crmOfflinePurchases)
            ? (p.crmOfflinePurchases as CrmOfflineLine[])
            : [],
    }

    const orders = Array.isArray(o.orders) ? (o.orders as PinkPunkOrder[]) : []

    const referralsCount = typeof o.referralsCount === 'number' ? o.referralsCount : 0

    let cart: CrmCartSummary | null = null
    if (o.cart === null) cart = null
    else if (o.cart && typeof o.cart === 'object') cart = o.cart as CrmCartSummary

    let loyalty: CrmLoyalty | null = null
    if (o.loyalty === null) loyalty = null
    else if (o.loyalty && typeof o.loyalty === 'object') {
        loyalty = normalizeCrmLoyalty(o.loyalty)
    }

    return { profile, orders, referralsCount, cart, loyalty }
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

export type DeleteUserCascadeStats = {
    ordersDeleted: number
    ordersAnonymized: number
    cartsDeleted: number
}

export type DeleteUserResponse = {
    success: true
    cascade?: DeleteUserCascadeStats
}

/** Сторона в merge-preview / profilePick */
export type CrmMergeFieldSource = 'keep' | 'merge'

export type CrmMergePreviewAccount = {
    accountId: string
    firstName?: string
    lastName?: string
    username?: string
    personalFirstName?: string
    personalLastName?: string
    userPhoneNumber?: string
    telegramUserId?: number | null
    expPoints?: number
    ordersCount?: number
    offlinePurchasesCount?: number
    hasPhoneRegistration?: boolean
    hasTelegram?: boolean
}

export type CrmMergePreviewResponse = {
    keep: CrmMergePreviewAccount
    merge: CrmMergePreviewAccount
    suggestedDefaults?: {
        firstNameFrom?: CrmMergeFieldSource
        lastNameFrom?: CrmMergeFieldSource
        usernameFrom?: CrmMergeFieldSource
        personalFirstNameFrom?: CrmMergeFieldSource
        personalLastNameFrom?: CrmMergeFieldSource
    }
}

export type CrmMergeProfilePick = {
    firstNameFrom?: CrmMergeFieldSource
    lastNameFrom?: CrmMergeFieldSource
    usernameFrom?: CrmMergeFieldSource
    personalFirstNameFrom?: CrmMergeFieldSource
    personalLastNameFrom?: CrmMergeFieldSource
}

export type CrmMergeAccountsBody = {
    mergeAccountId: string
    confirm: true
    profilePick?: CrmMergeProfilePick
}

export type CrmMergeAccountsSummary = {
    ordersReassigned?: number
    ledgerEntriesReassigned?: number
    cartsMerged?: number
    expPointsTotal?: number
    offlinePurchasesTotal?: number
}

export type CrmMergeAccountsResponse = {
    success: boolean
    keepAccountId: string
    mergeAccountId: string
    summary?: CrmMergeAccountsSummary
    loyalty?: CrmLoyalty | null
}

const LOYALTY_FETCH_CONCURRENCY = 10

/**
 * undefined — в списке нет пригодных данных loyalty, нужна подгрузка.
 * null из API (`loyalty: null`) не считаем «известным» статусом.
 */
function extractLoyaltyFromListRow(o: Record<string, unknown>): LoyaltyStatus | null | undefined {
    if (o.loyalty !== undefined) {
        if (o.loyalty === null) return undefined
        const parsed = parseLoyaltyApiResponse(o.loyalty)
        return parsed ?? undefined
    }
    const level = o.level ?? o.loyaltyLevel
    if (o.expPoints !== undefined && level) {
        const parsed = parseLoyaltyApiResponse({
            expPoints: o.expPoints,
            level,
            nextLevel: o.nextLevel ?? null,
            pointsToNextLevel: o.pointsToNextLevel ?? null,
            progressPercent: o.progressPercent ?? null,
        })
        return parsed ?? undefined
    }
    return undefined
}

function listRowNeedsLoyaltyFetch(u: CrmListUser): boolean {
    if (!accountObjectIdFromCrmListRow(u)) return false
    return !isUsableLoyaltyStatus(u.loyalty)
}

function mapCrmListUser(row: unknown): CrmListUser {
    const u = row as CrmListUser
    if (!row || typeof row !== 'object' || typeof u._id !== 'string') {
        return u
    }
    const o = row as Record<string, unknown>
    const loyalty = extractLoyaltyFromListRow(o)
    if (loyalty !== undefined) {
        return { ...u, loyalty }
    }
    return u
}

async function fetchUserLoyaltyFromCard(accountId: string): Promise<LoyaltyStatus | null> {
    const id = requireMongoObjectIdString(accountId, 'accountId')
    const { data: raw } = await instance.get<unknown>(
        crmPath(`/admin/crm/users/${encodeURIComponent(id)}`),
    )
    let card = normalizeCrmUserCardPayload(raw)
    if (!card && raw && typeof raw === 'object' && 'data' in raw) {
        card = normalizeCrmUserCardPayload((raw as { data: unknown }).data)
    }
    if (!card?.loyalty) return null
    const { history: _history, ...status } = card.loyalty
    return status
}

async function fetchUserLoyaltyStatus(accountId: string): Promise<LoyaltyStatus | null> {
    const id = requireMongoObjectIdString(accountId, 'accountId')

    try {
        const { data } = await instance.get<unknown>(
            crmPath(`/admin/crm/users/${encodeURIComponent(id)}/loyalty`),
        )
        const status = parseLoyaltyApiResponse(data)
        if (status) return status
    } catch {
        try {
            return await fetchUserLoyaltyFromCard(accountId)
        } catch {
            return null
        }
    }

    try {
        return await fetchUserLoyaltyFromCard(accountId)
    } catch {
        return null
    }
}

export async function enrichCrmUsersWithLoyalty(users: CrmListUser[]): Promise<CrmListUser[]> {
    const pending = users.filter(listRowNeedsLoyaltyFetch)
    if (pending.length === 0) return users

    const byAccountId = new Map<string, LoyaltyStatus | null>()

    for (let i = 0; i < pending.length; i += LOYALTY_FETCH_CONCURRENCY) {
        const batch = pending.slice(i, i + LOYALTY_FETCH_CONCURRENCY)
        await Promise.all(
            batch.map(async row => {
                const accountId = accountObjectIdFromCrmListRow(row)
                if (!accountId) return
                const loyalty = await fetchUserLoyaltyStatus(accountId)
                byAccountId.set(accountId, loyalty)
            }),
        )
    }

    return users.map(u => {
        if (!listRowNeedsLoyaltyFetch(u)) return u
        const accountId = accountObjectIdFromCrmListRow(u)
        if (!accountId) return u
        return { ...u, loyalty: byAccountId.get(accountId) ?? null }
    })
}

function listRowNeedsLoyaltyGiftsFetch(u: CrmListUser): boolean {
    const accountId = accountObjectIdFromCrmListRow(u)
    if (!accountId) return false
    return u.loyalty?.gifts === undefined
}

/** Подгрузка gifts для поиска по claimCode (GET …/loyalty на аккаунты без gifts). */
export async function enrichCrmUsersWithLoyaltyGifts(users: CrmListUser[]): Promise<CrmListUser[]> {
    const pending = users.filter(listRowNeedsLoyaltyGiftsFetch)
    if (pending.length === 0) return users

    const byAccountId = new Map<string, LoyaltyStatus | null>()

    for (let i = 0; i < pending.length; i += LOYALTY_FETCH_CONCURRENCY) {
        const batch = pending.slice(i, i + LOYALTY_FETCH_CONCURRENCY)
        await Promise.all(
            batch.map(async row => {
                const accountId = accountObjectIdFromCrmListRow(row)
                if (!accountId) return
                const loyalty = await fetchUserLoyaltyStatus(accountId)
                byAccountId.set(accountId, loyalty)
            }),
        )
    }

    return users.map(u => {
        if (!listRowNeedsLoyaltyGiftsFetch(u)) return u
        const accountId = accountObjectIdFromCrmListRow(u)
        if (!accountId) return u
        const loyalty = byAccountId.get(accountId)
        if (loyalty === undefined) return u
        return { ...u, loyalty }
    })
}

export const CrmApi = {
    async getUsers(): Promise<CrmListUser[]> {
        const path = crmPath('/admin/crm/users')
        const { data } = await instance.get<unknown>(path)
        return unwrapList<unknown>(data).map(mapCrmListUser)
    },

    /** Список CRM + loyalty по каждому аккаунту (для рамок и уровней в гриде). */
    async getUsersWithLoyalty(): Promise<CrmListUser[]> {
        const users = await CrmApi.getUsers()
        return enrichCrmUsersWithLoyalty(users)
    },

    enrichUsersWithLoyalty: enrichCrmUsersWithLoyalty,

    enrichUsersWithLoyaltyGifts: enrichCrmUsersWithLoyaltyGifts,

    async getUserCard(accountId: string): Promise<CrmUserCardResponse> {
        const id = requireMongoObjectIdString(accountId, 'accountId')
        const path = crmPath(`/admin/crm/users/${encodeURIComponent(id)}`)
        const { data: raw } = await instance.get<unknown>(path)

        let card = normalizeCrmUserCardPayload(raw)
        if (!card && raw && typeof raw === 'object' && 'data' in raw) {
            card = normalizeCrmUserCardPayload((raw as { data: unknown }).data)
        }
        if (card) {
            return card
        }

        throw new Error('Неожиданный формат ответа карточки CRM (ожидается объект с profile)')
    },

    async patchUser(accountId: string, body: CrmUpdateUserDto): Promise<void> {
        const id = requireMongoObjectIdString(accountId, 'accountId')
        await instance.patch<unknown>(crmPath(`/admin/crm/users/${encodeURIComponent(id)}`), body)
    },

    async addOfflinePurchase(
        accountId: string,
        body: CrmAddOfflineCatalogBody | CrmAddOfflineCustomBody,
    ) {
        const id = requireMongoObjectIdString(accountId, 'accountId')
        const { data } = await instance.post<CrmOfflinePurchasesMutationResponse>(
            crmPath(`/admin/crm/users/${encodeURIComponent(id)}/offline-purchases`),
            body
        )
        return data
    },

    async deleteOfflineLine(accountId: string, lineId: string): Promise<CrmOfflinePurchasesMutationResponse> {
        const id = requireMongoObjectIdString(accountId, 'accountId')
        const { data } = await instance.delete<CrmOfflinePurchasesMutationResponse>(
            crmPath(`/admin/crm/users/${encodeURIComponent(id)}/offline-purchases/${encodeURIComponent(lineId)}`)
        )
        return data
    },

    async getUserLoyalty(accountId: string): Promise<CrmLoyalty> {
        const id = requireMongoObjectIdString(accountId, 'accountId')
        const { data } = await instance.get<unknown>(
            crmPath(`/admin/crm/users/${encodeURIComponent(id)}/loyalty`),
        )
        const loyalty = parseCrmLoyaltyApiResponse(data)
        if (!loyalty) {
            throw new Error('Неожиданный формат ответа loyalty')
        }
        return loyalty
    },

    async adjustLoyalty(
        accountId: string,
        body: { delta: number; reason: string },
    ): Promise<CrmLoyalty> {
        const id = requireMongoObjectIdString(accountId, 'accountId')
        const { data } = await instance.post<unknown>(
            crmPath(`/admin/crm/users/${encodeURIComponent(id)}/loyalty/adjust`),
            body,
        )
        const status = parseLoyaltyApiResponse(data)
        if (!status) {
            throw new Error('Неожиданный формат ответа adjust loyalty')
        }
        try {
            return await CrmApi.getUserLoyalty(accountId)
        } catch {
            return { ...status, history: [] }
        }
    },

    /** PATCH /admin/crm/users/:accountId/loyalty/gifts/:levelId — issued → requested (отмена ошибочного confirm). */
    async revokeLoyaltyGiftReceived(
        accountId: string,
        levelId: LoyaltyGiftLevelId,
    ): Promise<CrmLoyalty> {
        const id = requireMongoObjectIdString(accountId, 'accountId')
        const { data } = await instance.patch<unknown>(
            crmPath(
                `/admin/crm/users/${encodeURIComponent(id)}/loyalty/gifts/${encodeURIComponent(levelId)}`,
            ),
            { action: 'revoke_received' },
        )
        const status = parseCrmLoyaltyApiResponse(data)
        if (!status) {
            throw new Error('Неожиданный формат ответа revoke gift')
        }
        try {
            return await CrmApi.getUserLoyalty(accountId)
        } catch {
            return status
        }
    },

    /** POST /admin/crm/users/:accountId/discount — персональная скидка (бонус, фикс, сброс). */
    async setUserDiscount(accountId: string, body: CrmSetDiscountBody): Promise<CrmLoyalty> {
        const id = requireMongoObjectIdString(accountId, 'accountId')
        const { data } = await instance.post<unknown>(
            crmPath(`/admin/crm/users/${encodeURIComponent(id)}/discount`),
            body,
        )
        const status = parseLoyaltyApiResponse(data)
        if (!status) {
            throw new Error('Неожиданный формат ответа discount')
        }
        try {
            return await CrmApi.getUserLoyalty(accountId)
        } catch {
            return { ...status, history: [] }
        }
    },

    /**
     * DELETE /admin/users/:id
     * @param cascade — `orders,cart`: заказы по политике статусов + удаление корзин; `none` — только pp_users
     */
    /** GET /admin/crm/users/merge-preview */
    async getMergePreview(keepAccountId: string, mergeAccountId: string): Promise<CrmMergePreviewResponse> {
        const keepId = requireMongoObjectIdString(keepAccountId, 'keepAccountId')
        const mergeId = requireMongoObjectIdString(mergeAccountId, 'mergeAccountId')
        const { data } = await instance.get<CrmMergePreviewResponse>(
            crmPath('/admin/crm/users/merge-preview'),
            { params: { keepAccountId: keepId, mergeAccountId: mergeId } },
        )
        return data
    },

    /** POST /admin/crm/users/:keepAccountId/merge */
    async mergeAccounts(
        keepAccountId: string,
        body: CrmMergeAccountsBody,
    ): Promise<CrmMergeAccountsResponse> {
        const keepId = requireMongoObjectIdString(keepAccountId, 'keepAccountId')
        requireMongoObjectIdString(body.mergeAccountId, 'mergeAccountId')
        const { data } = await instance.post<CrmMergeAccountsResponse>(
            crmPath(`/admin/crm/users/${encodeURIComponent(keepId)}/merge`),
            body,
        )
        return data
    },

    async deleteUser(
        accountId: string,
        cascade: 'full' | 'none' = 'full',
    ): Promise<DeleteUserResponse> {
        const id = requireMongoObjectIdString(accountId, 'accountId')
        const path = crmPath(`/admin/users/${encodeURIComponent(id)}`)

        if (cascade === 'none') {
            const { data } = await instance.delete<DeleteUserResponse>(path)
            return data
        }

        const { data } = await instance.delete<DeleteUserResponse>(path, {
            params: { cascade: 'orders,cart' },
            data: { deleteOrders: true, clearCart: true },
        })
        return data
    },
}
