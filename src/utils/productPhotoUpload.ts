/** MIME и расширения, совпадающие с бэкендом при загрузке фото товара */
const VALID_MIME_TYPES = new Set([
    'image/jpeg',
    'image/png',
    'image/webp',
    'image/heic',
    'image/heif',
])

const VALID_EXTENSIONS = new Set(['.jpg', '.jpeg', '.png', '.webp', '.heic', '.heif'])

export const PRODUCT_PHOTO_ACCEPT =
    'image/jpeg,image/png,image/webp,image/heic,image/heif,.heic,.heif'

export const PRODUCT_PHOTO_FORMATS_LABEL = 'JPEG, PNG, WebP, HEIC'

export function isAllowedProductPhotoFile(file: File): boolean {
    const mime = file.type.trim().toLowerCase()
    if (mime && VALID_MIME_TYPES.has(mime)) {
        return true
    }
    const dot = file.name.lastIndexOf('.')
    if (dot === -1) {
        return false
    }
    const ext = file.name.slice(dot).toLowerCase()
    return VALID_EXTENSIONS.has(ext)
}
