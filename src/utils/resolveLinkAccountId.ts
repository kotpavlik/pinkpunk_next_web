import { isMongoObjectIdString } from '@/utils/mongoObjectId'

/**
 * Mongo `_id` для `linkAccountId` в POST /auth/telegram-login-widget.
 * Передаём только при активной сессии (после SMS / refresh), чтобы не создавать второй аккаунт.
 */
export function resolveLinkAccountIdForTelegramWidget(
    accountId: string | undefined,
    isSessionActive: boolean,
): string | undefined {
    if (!isSessionActive) return undefined
    const id = accountId?.trim()
    if (!id || !isMongoObjectIdString(id)) return undefined
    return id.toLowerCase()
}
