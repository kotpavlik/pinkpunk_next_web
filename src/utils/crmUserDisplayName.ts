export type CrmUserNameFields = {
    personalFirstName?: string | null
    personalLastName?: string | null
    username?: string | null
}

export type StorefrontProfileNameFields = CrmUserNameFields & {
    firstName?: string | null
    lastName?: string | null
}

/** Заголовок карточки CRM: личное имя + фамилия, иначе @username. */
export function crmUserDisplayName(user: CrmUserNameFields): string {
    const personal = [user.personalFirstName, user.personalLastName]
        .filter((part) => Boolean(part?.trim()))
        .join(' ')
        .trim()
    if (personal) return personal

    const username = user.username?.trim()
    if (username) return username.startsWith('@') ? username : `@${username}`

    return '—'
}

/** Имя в личном кабинете: personal → @username → имя из Telegram → «Пользователь». */
export function storefrontProfileDisplayName(user: StorefrontProfileNameFields): string {
    const primary = crmUserDisplayName(user)
    if (primary !== '—') return primary

    const fromTelegram = [user.firstName, user.lastName]
        .filter((part) => Boolean(part?.trim()))
        .join(' ')
        .trim()
    if (fromTelegram) return fromTelegram

    return 'Пользователь'
}
