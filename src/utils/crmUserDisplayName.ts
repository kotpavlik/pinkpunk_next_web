export type CrmUserNameFields = {
    personalFirstName?: string | null
    personalLastName?: string | null
    username?: string | null
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
