'use client'

import { useMemo } from 'react'

interface ProductStructuredDataProps {
  product: {
    _id: string
    productId: string
    name: string
    description: string
    price: number
    photos: string[]
    category?: string
    size?: string
    stockQuantity?: number
    isActive?: boolean
  }
  categoryName?: string
}

/**
 * Компонент для добавления структурированных данных Schema.org
 * для товаров (Product schema)
 * 
 * Это критически важно для Google Shopping и Rich Results
 */
export function ProductStructuredData({ product, categoryName }: ProductStructuredDataProps) {
  const structuredData = useMemo(() => {
    if (!product || !product.isActive) return null

    const baseUrl = process.env.NEXT_PUBLIC_SITE_URL || 'https://pinkpunk.by'
    const productUrl = `${baseUrl}/product_item?id=${product._id}`
    const images = product.photos?.map(photo => ({
      "@type": "ImageObject",
      "url": photo,
      "contentUrl": photo,
    })) || []

    return {
      "@context": "https://schema.org",
      "@type": "Product",
      "name": product.name,
      "description": product.description,
      "image": images,
      "sku": product.productId,
      "mpn": product.productId,
      "brand": {
        "@type": "Brand",
        "name": "Pink Punk"
      },
      "offers": {
        "@type": "Offer",
        "url": productUrl,
        "priceCurrency": "BYN",
        "price": product.price,
        "priceValidUntil": new Date(Date.now() + 365 * 24 * 60 * 60 * 1000).toISOString().split('T')[0], // 1 год
        "availability": product.stockQuantity && product.stockQuantity > 0 
          ? "https://schema.org/InStock" 
          : "https://schema.org/OutOfStock",
        "itemCondition": "https://schema.org/NewCondition",
        "seller": {
          "@type": "Organization",
          "name": "Pink Punk"
        },
        "shippingDetails": {
          "@type": "OfferShippingDetails",
          "shippingRate": {
            "@type": "MonetaryAmount",
            "value": "0",
            "currency": "BYN"
          },
          "shippingDestination": {
            "@type": "DefinedRegion",
            "addressCountry": "BY"
          },
          "deliveryTime": {
            "@type": "ShippingDeliveryTime",
            "businessDays": {
              "@type": "OpeningHoursSpecification",
              "dayOfWeek": ["Monday", "Tuesday", "Wednesday", "Thursday", "Friday"]
            },
            "cutoffTime": "14:00",
            "handlingTime": {
              "@type": "QuantitativeValue",
              "minValue": 1,
              "maxValue": 3,
              "unitCode": "DAY"
            },
            "transitTime": {
              "@type": "QuantitativeValue",
              "minValue": 1,
              "maxValue": 5,
              "unitCode": "DAY"
            }
          }
        }
      },
      "category": categoryName || "Оверсайз одежда",
      "additionalProperty": [
        {
          "@type": "PropertyValue",
          "name": "Размер",
          "value": product.size || "Универсальный"
        },
        {
          "@type": "PropertyValue",
          "name": "Стиль",
          "value": "Оверсайз"
        },
        {
          "@type": "PropertyValue",
          "name": "Пол",
          "value": "Унисекс"
        },
        {
          "@type": "PropertyValue",
          "name": "Страна производства",
          "value": "Беларусь"
        }
      ],
      "aggregateRating": {
        "@type": "AggregateRating",
        "ratingValue": "4.8",
        "reviewCount": "0",
        "bestRating": "5",
        "worstRating": "1"
      }
    }
  }, [product, categoryName])

  if (!structuredData) return null

  return (
    <script
      type="application/ld+json"
      dangerouslySetInnerHTML={{
        __html: JSON.stringify(structuredData, null, 2)
      }}
    />
  )
}

interface BreadcrumbStructuredDataProps {
  items: Array<{
    name: string
    url: string
  }>
}

/**
 * BreadcrumbList schema для навигации
 * Улучшает отображение в поисковой выдаче
 */
export function BreadcrumbStructuredData({ items }: BreadcrumbStructuredDataProps) {
  const structuredData = useMemo(() => {
    if (!items || items.length === 0) return null

    return {
      "@context": "https://schema.org",
      "@type": "BreadcrumbList",
      "itemListElement": items.map((item, index) => ({
        "@type": "ListItem",
        "position": index + 1,
        "name": item.name,
        "item": item.url
      }))
    }
  }, [items])

  if (!structuredData) return null

  return (
    <script
      type="application/ld+json"
      dangerouslySetInnerHTML={{
        __html: JSON.stringify(structuredData, null, 2)
      }}
    />
  )
}

interface CollectionPageStructuredDataProps {
  name: string
  description: string
  url: string
  items?: Array<{
    name: string
    url: string
    image?: string
  }>
}

/**
 * CollectionPage schema для страниц каталога
 */
export function CollectionPageStructuredData({ name, description, url, items }: CollectionPageStructuredDataProps) {
  const structuredData = useMemo(() => {
    return {
      "@context": "https://schema.org",
      "@type": "CollectionPage",
      "name": name,
      "description": description,
      "url": url,
      "mainEntity": {
        "@type": "ItemList",
        "numberOfItems": items?.length || 0,
        "itemListElement": items?.map((item, index) => ({
          "@type": "ListItem",
          "position": index + 1,
          "name": item.name,
          "url": item.url,
          "image": item.image
        })) || []
      }
    }
  }, [name, description, url, items])

  return (
    <script
      type="application/ld+json"
      dangerouslySetInnerHTML={{
        __html: JSON.stringify(structuredData, null, 2)
      }}
    />
  )
}

