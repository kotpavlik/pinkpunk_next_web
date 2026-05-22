import * as yup from 'yup'

/** Правила username как в CRM: латиница, цифры, `_`, до 64 символов. */
export const telegramUsernameSchema = yup
    .string()
    .trim()
    .transform((value) => value.replace(/^@+/, ''))
    .max(64, 'Username не должен превышать 64 символов')
    .test(
        'telegram-username-format',
        'Username может содержать только латинские буквы, цифры и _',
        (value) => !value || /^[a-zA-Z0-9_]+$/.test(value),
    )

export function normalizeTelegramUsernameInput(value: string): string {
    return value.trim().replace(/^@+/, '')
}

export async function validateTelegramUsernameField(value: string): Promise<string | undefined> {
    try {
        await telegramUsernameSchema.validate(normalizeTelegramUsernameInput(value))
        return undefined
    } catch (error) {
        if (error instanceof yup.ValidationError) {
            return error.message
        }
        return 'Некорректный username'
    }
}
