/** Отображаемое название товара — всегда UPPERCASE */
export function formatProductName(name: string | null | undefined): string {
    if (!name) return ''
    return name.trim().toUpperCase()
}
