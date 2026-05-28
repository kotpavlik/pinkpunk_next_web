export type CrmUserNameFields = {
    personalFirstName?: string | null
    personalLastName?: string | null
    firstName?: string | null
    lastName?: string | null
    username?: string | null
}

export type StorefrontProfileNameFields = CrmUserNameFields

function joinNameParts(...parts: (string | null | undefined)[]): string {
    return parts
        .map((part) => part?.trim())
        .filter((part): part is string => Boolean(part))
        .join(' ')
        .trim()
}

function formatUsername(username: string): string {
    const trimmed = username.trim()
    return trimmed.startsWith('@') ? trimmed : `@${trimmed}`
}

/** personal → first/last → @username → fallback. */
export function resolveProfileDisplayName(user: CrmUserNameFields, fallback: string): string {
    const personal = joinNameParts(user.personalFirstName, user.personalLastName)
    if (personal) return personal

    const fromProfile = joinNameParts(user.firstName, user.lastName)
    if (fromProfile) return fromProfile

    const username = user.username?.trim()
    if (username) return formatUsername(username)

    return fallback
}

/** Заголовок карточки CRM: personal → first/last → @username. */
export function crmUserDisplayName(user: CrmUserNameFields): string {
    return resolveProfileDisplayName(user, '—')
}

/** Имя в личном кабинете: personal → first/last → @username → «Пользователь». */
export function storefrontProfileDisplayName(user: StorefrontProfileNameFields): string {
    return resolveProfileDisplayName(user, 'Пользователь')
}
