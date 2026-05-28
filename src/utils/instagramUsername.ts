/** Instagram username: латиница, цифры, `.`, `_`; 1–30 символов; без пробелов. */
export const INSTAGRAM_USERNAME_MAX_LENGTH = 30
export const INSTAGRAM_USERNAME_MIN_LENGTH = 1

const LATIN_USERNAME_CHARS = /^[a-z0-9._]+$/

/** Убирает @ и приводит к lowercase; пробелы не удаляет — их ловит валидация. */
export function normalizeInstagramHandle(raw: string): string {
    return raw.trim().replace(/^@+/, '').toLowerCase()
}

/** Оставляет только допустимые символы при вводе (латиница, цифры, `.`, `_`). */
export function sanitizeInstagramHandleInput(raw: string): string {
    return raw.replace(/^@+/, '').replace(/[^a-zA-Z0-9._]/g, '').slice(0, INSTAGRAM_USERNAME_MAX_LENGTH)
}

export function instagramHandleError(raw: string): string | null {
    const trimmed = raw.trim()
    const withoutAt = trimmed.replace(/^@+/, '')

    if (!withoutAt) {
        return 'Укажите username Instagram'
    }

    if (/\s/.test(trimmed)) {
        return 'Username не может содержать пробелы'
    }

    if (/[^\x00-\x7F]/.test(withoutAt)) {
        return 'Только латиница, цифры, точка (.) и подчёркивание (_)'
    }

    if (!/^[a-zA-Z0-9._]+$/.test(withoutAt)) {
        return 'Допустимы только латиница, цифры, . и _'
    }

    const normalized = normalizeInstagramHandle(trimmed)

    if (normalized.length < INSTAGRAM_USERNAME_MIN_LENGTH) {
        return 'Username слишком короткий'
    }

    if (normalized.length > INSTAGRAM_USERNAME_MAX_LENGTH) {
        return `Username — не более ${INSTAGRAM_USERNAME_MAX_LENGTH} символов`
    }

    if (!LATIN_USERNAME_CHARS.test(normalized)) {
        return 'Допустимы только латиница, цифры, . и _'
    }

    if (normalized.startsWith('.') || normalized.endsWith('.')) {
        return 'Username не может начинаться или заканчиваться точкой'
    }

    if (normalized.includes('..')) {
        return 'Username не может содержать две точки подряд'
    }

    return null
}

export function isValidInstagramHandle(handle: string): boolean {
    return instagramHandleError(handle) === null
}
