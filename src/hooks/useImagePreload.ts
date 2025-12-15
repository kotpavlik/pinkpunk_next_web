import { useEffect, useState } from 'react'

/**
 * Хук для предзагрузки изображений в фоне
 * Незаметно загружает все изображения заранее для моментального отображения
 */
export const useImagePreload = (urls: string[]) => {
    const [loadedImages, setLoadedImages] = useState<Set<string>>(new Set())
    const [hasError, setHasError] = useState<Set<string>>(new Set())

    useEffect(() => {
        if (!urls || urls.length === 0) return

        const loadImage = (url: string): Promise<void> => {
            return new Promise((resolve) => {
                const img = new window.Image()
                
                img.onload = () => {
                    setLoadedImages(prev => new Set([...prev, url]))
                    resolve()
                }
                
                img.onerror = () => {
                    console.warn(`Ошибка загрузки изображения: ${url}`)
                    setHasError(prev => new Set([...prev, url]))
                    resolve() // Всё равно resolve, чтобы не блокировать остальные
                }
                
                img.src = url
            })
        }

        // Загружаем все изображения параллельно
        Promise.all(urls.map(url => loadImage(url)))
            .catch(err => console.error('Ошибка предзагрузки изображений:', err))

    }, [urls])

    return {
        isLoaded: (url: string) => loadedImages.has(url),
        hasError: (url: string) => hasError.has(url),
        allLoaded: urls.length > 0 && urls.every(url => loadedImages.has(url) || hasError.has(url)),
    }
}

