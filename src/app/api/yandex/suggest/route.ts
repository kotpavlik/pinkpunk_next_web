import { NextRequest } from "next/server"

export async function GET(req: NextRequest) {
    try {
        const { searchParams } = new URL(req.url)

        const text = searchParams.get("text") || ""
        const lang = searchParams.get("lang") || "ru_RU"
        const types = searchParams.get("types") || "geo"

        if (!text || text.trim().length < 2) {
            return new Response(JSON.stringify({ suggestions: [] }), {
                status: 200,
                headers: { "Content-Type": "application/json" }
            })
        }

        const apiKey = process.env.NEXT_YANDEX_API_GEOSAGEST_KEY

        if (!apiKey) {
            return new Response(JSON.stringify({ error: "NEXT_YANDEX_API_GEOSAGEST_KEY is missing" }), { status: 500 })
        }

        const endpoint = `https://suggest-maps.yandex.ru/v1/suggest?apikey=${encodeURIComponent(apiKey)}&text=${encodeURIComponent(text)}&lang=${encodeURIComponent(lang)}&types=${encodeURIComponent(types)}`

        const host = req.headers.get('host')
        const referer = host ? `https://${host}` : undefined

        const yaRes = await fetch(endpoint, { 
            method: "GET", 
            headers: referer ? { Referer: referer } : undefined 
        })

        if (!yaRes.ok) {
            const body = await yaRes.text().catch(() => "")
            return new Response(JSON.stringify({ suggestions: [], error: "Upstream error", status: yaRes.status, body }), {
                status: yaRes.status,
                headers: { "Content-Type": "application/json" }
            })
        }

        const data = await yaRes.json().catch(() => ({}))

        return new Response(JSON.stringify(data), {
            status: 200,
            headers: { "Content-Type": "application/json", "Cache-Control": "no-store" }
        })
    } catch {
        return new Response(JSON.stringify({ suggestions: [], error: "Unexpected error" }), { status: 500 })
    }
}

