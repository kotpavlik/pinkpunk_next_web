/**
 * Приводит ответ логина /auth/refresh к виду для TokenManager.saveTokens.
 * Бэкенд может отдавать snake_case или оборачивать поля во вложенный `data`.
 */
export type AuthTokensPayload = {
    accessToken: string
    refreshToken: string
    /** Секунды жизни access JWT (не миллисекунды). */
    expiresIn: number
}

function asRecord(v: unknown): Record<string, unknown> | null {
    if (v && typeof v === 'object' && !Array.isArray(v)) return v as Record<string, unknown>
    return null
}

function readString(obj: Record<string, unknown>, camel: string, snake: string): string | undefined {
    const a = obj[camel]
    const b = obj[snake]
    if (typeof a === 'string' && a.trim()) return a.trim()
    if (typeof b === 'string' && b.trim()) return b.trim()
    return undefined
}

function readExpiresIn(obj: Record<string, unknown>): number | undefined {
    const raw = obj.expiresIn ?? obj.expires_in
    if (typeof raw === 'number' && Number.isFinite(raw) && raw > 0) return raw
    if (typeof raw === 'string') {
        const n = parseInt(raw.trim(), 10)
        if (!Number.isNaN(n) && n > 0) return n
    }
    return undefined
}

export function normalizeAuthTokensFromResponse(raw: unknown): AuthTokensPayload | null {
    const root = asRecord(raw)
    if (!root) return null

    const nested = asRecord(root.data)
    const src = nested ?? root

    const accessToken = readString(src, 'accessToken', 'access_token')
    const refreshToken = readString(src, 'refreshToken', 'refresh_token')
    const expiresIn = readExpiresIn(src)

    if (!accessToken || !refreshToken || expiresIn === undefined) return null

    return { accessToken, refreshToken, expiresIn }
}
