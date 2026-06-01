/** Адрес и координаты офлайн-шоурума на карте в футере (Yandex Maps). */
export const STORE_ADDRESS =
  'г. Минск, ул. Шорная, 20, мультибрендовый шоурум Model'

/**
 * [долгота, широта] — формат Yandex Maps API 3.0.
 * Точка у обратного фасада (двор / шоурум), не у подъездов с ул. Шорная.
 */
export const STORE_COORDINATES: [number, number] = [27.54188, 53.90063]

export const STORE_COORDINATES_LAT = STORE_COORDINATES[1]
export const STORE_COORDINATES_LON = STORE_COORDINATES[0]

export const YANDEX_ROUTE_URL = `https://yandex.by/maps/?rtext=~${STORE_COORDINATES_LAT},${STORE_COORDINATES_LON}&rtt=auto`

/** Режим работы шоурума на карте и в футере */
export const STORE_HOURS_SHOWROOM = 'вт–вс: 10:00–20:00'
export const STORE_HOURS_MONDAY = 'пн: доставка (курьер)'
