/**
 * Совпадает с правилами normalizePhoneDigits / isPhoneDigitsProbablyValid из спеки SMS API (§16).
 */
export function normalizePhoneDigits(input: string): string {
    const d = input.replace(/\D/g, '')
    return d.length > 15 ? d.slice(-15) : d
}

export function isPhoneDigitsProbablyValid(normalizedDigits: string): boolean {
    return normalizedDigits.length >= 9 && normalizedDigits.length <= 15
}

/** Нормализованные только цифры → строка вида `+375…` для body. */
export function digitsToPlusE164(normalizedDigits: string): string {
    return `+${normalizedDigits}`
}
