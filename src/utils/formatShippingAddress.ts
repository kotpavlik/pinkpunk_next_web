export type StructuredShippingAddress = {
    street?: string
    house?: string
    apartment?: string
    city?: string
    postalCode?: string
    country?: string
}

export function formatShippingAddress(address: StructuredShippingAddress): string {
    return [
        address.city,
        address.street,
        address.house ? `д. ${address.house}` : undefined,
        address.apartment ? `кв. ${address.apartment}` : undefined,
    ]
        .filter(Boolean)
        .join(', ')
}
