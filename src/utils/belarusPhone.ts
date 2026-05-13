const CC = '375'

/** Из ввода/вставки: только национальные 9 цифр после кода Беларуси. */
export function parseBelarusNationalInput(raw: string): string {
    let d = raw.replace(/\D/g, '')
    if (d.startsWith(CC)) d = d.slice(3)
    if (d.startsWith('80') && d.length >= 11) d = d.slice(2)
    return d.slice(0, 9)
}

/** Отображение: +375 XX XXX XX XX (+375 ▢ с пробелом при отсутствии цифр). */
export function formatBelarusPhoneDisplay(nationalDigits: string): string {
    const n = nationalDigits.slice(0, 9)
    if (n.length === 0) return '+375 '

    const op = n.slice(0, 2)
    let out = '+375 ' + op
    if (n.length <= 2) return out

    out += ' ' + n.slice(2, Math.min(5, n.length))
    if (n.length <= 5) return out

    out += ' ' + n.slice(5, Math.min(7, n.length))
    if (n.length <= 7) return out

    return out + ' ' + n.slice(7, 9)
}

export function belarusPhoneE164(nationalDigits: string): string | null {
    if (nationalDigits.length !== 9) return null
    return `+${CC}${nationalDigits}`
}

export function isBelarusMobileComplete(nationalDigits: string): boolean {
    return nationalDigits.length === 9
}
