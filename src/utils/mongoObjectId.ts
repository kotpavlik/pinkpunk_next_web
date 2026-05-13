/** 24 hex-символа, как строка Mongo ObjectId в JSON. */
const OBJECT_ID_HEX = /^[a-f\d]{24}$/i

export function isMongoObjectIdString(value: unknown): value is string {
    return typeof value === 'string' && OBJECT_ID_HEX.test(value.trim())
}

/** Строка или Extended JSON `{ "$oid": "…" }` из Mongo-драйвера. */
function asObjectIdStringCandidate(value: unknown): string | null {
    if (value == null) return null
    if (typeof value === 'string') {
        const t = value.trim()
        return t.length ? t : null
    }
    if (typeof value === 'object' && '$oid' in (value as object)) {
        const oid = (value as { $oid?: unknown }).$oid
        if (typeof oid === 'string' && oid.trim().length) return oid.trim()
    }
    return null
}

/**
 * Нормализует id для URL/API (нижний регистр hex).
 * @throws если не 24 hex
 */
export function requireMongoObjectIdString(raw: string, label = 'accountId'): string {
    const t = raw.trim()
    if (!isMongoObjectIdString(t)) {
        throw new Error(
            `${label} must be a valid Mongo ObjectId (24 hex characters). Got: ${t ? JSON.stringify(t) : '(empty)'}`
        )
    }
    return t.toLowerCase()
}

/**
 * `accountId` для путей `/admin/crm/users/:accountId` (спека §13).
 * **Сначала `row._id`** — канонический Mongo id строки CRM; не подставлять `telegramUserId`.
 * Далее: опциональный алиас `id`, затем поле `accountId`, если бэкенд дублирует.
 */
export function accountObjectIdFromCrmListRow(row: {
    _id?: unknown
    id?: unknown
    accountId?: unknown
}): string | null {
    const tryOne = (v: unknown): string | null => {
        const s = asObjectIdStringCandidate(v)
        if (s && isMongoObjectIdString(s)) return s.toLowerCase()
        return null
    }

    return tryOne(row._id) ?? tryOne(row.id) ?? tryOne(row.accountId)
}
