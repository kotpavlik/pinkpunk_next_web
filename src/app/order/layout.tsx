import Script from 'next/script'

/** Тест: abby.rbsuat.com · Бой: ecom.alfabank.by — задать в .env.local */
const MULTIFRAME_SCRIPT_SRC =
    process.env.NEXT_PUBLIC_ALFA_MULTIFRAME_SCRIPT_URL ??
    'https://abby.rbsuat.com/payment/modules/multiframe/main.js'

export default function OrderLayout({ children }: { children: React.ReactNode }) {
    return (
        <>
            <Script
                id="alfa-multiframe-main"
                src={MULTIFRAME_SCRIPT_SRC}
                strategy="afterInteractive"
            />
            {children}
        </>
    )
}
