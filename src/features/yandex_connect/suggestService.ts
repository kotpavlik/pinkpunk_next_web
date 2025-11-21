// Сервис для получения подсказок адресов через Yandex Suggest API

export type YandexSuggestItem = {
    title: { text: string } | string
    subtitle?: { text: string } | string
    address?: { formatted_address?: string }
}

export async function fetchYandexSuggestions(
    query: string,
    signal?: AbortSignal
): Promise<string[]> {
    if (!query || query.trim().length < 2) return []

    try {
        const params = new URLSearchParams({ text: query, lang: 'ru_RU', types: 'geo' })
        const res = await fetch(`/api/yandex/suggest?${params.toString()}`, { signal, cache: 'no-store' })

        if (!res.ok) return []

        const data = await res.json()
        const items: YandexSuggestItem[] = Array.isArray(data?.results) 
            ? data.results 
            : Array.isArray(data?.suggestions) 
                ? data.suggestions 
                : []

        return items
            .map((item) => {
                const title = typeof item.title === 'string' ? item.title : item.title?.text
                const subtitle = typeof item.subtitle === 'string' ? item.subtitle : item.subtitle?.text
                const addr = item.address?.formatted_address
                return [title, subtitle, addr].filter(Boolean).join(', ')
            })
            .filter(Boolean)
    } catch (error) {
        if (error instanceof Error && error.name === 'AbortError') {
            // Запрос был отменен, это нормально
            return []
        }
        return []
    }
}

