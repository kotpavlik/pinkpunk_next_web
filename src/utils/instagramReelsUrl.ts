const ALLOWED_HOSTS = new Set(['instagram.com', 'www.instagram.com'])

/** Код Reels в path: буквы, цифры, `_`, `-` (как в ссылках Instagram). */
const REEL_SHORTCODE_PATTERN = /^[A-Za-z0-9_-]{2,50}$/

export function instagramReelsUrlError(raw: string): string | null {
    const trimmed = raw.trim()
    if (!trimmed) {
        return 'Вставьте ссылку на Reels из Instagram'
    }

    if (trimmed.length > 500) {
        return 'Ссылка слишком длинная (максимум 500 символов)'
    }

    if (/\s/.test(trimmed)) {
        return 'Ссылка не должна содержать пробелы'
    }

    if (/^(javascript|data|file|vbscript):/i.test(trimmed)) {
        return 'Недопустимый тип ссылки'
    }

    let url: URL
    try {
        url = new URL(trimmed.startsWith('http://') || trimmed.startsWith('https://') ? trimmed : `https://${trimmed}`)
    } catch {
        return 'Некорректный формат ссылки'
    }

    if (url.username || url.password) {
        return 'Недопустимая ссылка'
    }

    if (url.protocol !== 'http:' && url.protocol !== 'https:') {
        return 'Ссылка должна использовать http(s)://'
    }

    const host = url.hostname.toLowerCase().replace(/\.$/, '')
    if (!ALLOWED_HOSTS.has(host)) {
        return 'Разрешены только ссылки с домена instagram.com'
    }

    const segments = url.pathname.split('/').filter(Boolean)
    if (segments.length < 2) {
        return 'Укажите полную ссылку: instagram.com/reel/… или instagram.com/reels/…'
    }

    const kind = segments[0].toLowerCase()
    const code = segments[1]

    if (kind !== 'reel' && kind !== 'reels') {
        return 'Ссылка должна вести на Reels (/reel/ или /reels/), не на профиль или пост'
    }

    if (!REEL_SHORTCODE_PATTERN.test(code)) {
        return 'Некорректный код видео в ссылке'
    }

    if (segments.length > 2) {
        return 'Ссылка содержит лишние сегменты — вставьте прямую ссылку на Reels'
    }

    return null
}

export function isLikelyInstagramReelsUrl(value: string): boolean {
    return instagramReelsUrlError(value) === null
}

/** Канонический https URL для отправки на бэкенд. */
export function normalizeInstagramReelsUrl(raw: string): string | null {
    if (instagramReelsUrlError(raw)) return null

    try {
        const trimmed = raw.trim()
        const url = new URL(
            trimmed.startsWith('http://') || trimmed.startsWith('https://') ? trimmed : `https://${trimmed}`,
        )
        const segments = url.pathname.split('/').filter(Boolean)
        const kind = segments[0].toLowerCase()
        const code = segments[1]
        return `https://www.instagram.com/${kind}/${code}/`
    } catch {
        return null
    }
}
