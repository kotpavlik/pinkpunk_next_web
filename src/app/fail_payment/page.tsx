'use client'

import { useEffect, useRef, useState } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import Lottie, { type LottieRefCurrentProps } from 'lottie-react'
import CardPayAnimation from '@/../public/animations/cardpay.json'
import { useCartStore } from '@/zustand/cart_store/CartStore'
import { useOrderStore } from '@/zustand/order_store/OrderStore'
import { useProductsStore } from '@/zustand/products_store/ProductsStore'
import { useUserStore } from '@/zustand/user_store/UserStore'

type PaymentFailureState =
    | { status: 'loading' }
    | { status: 'ready'; title: string; description?: string }
    | { status: 'error'; title: string; description?: string }

function useTypewriter(text: string) {
    const [displayedText, setDisplayedText] = useState('')
    const [currentIndex, setCurrentIndex] = useState(0)

    useEffect(() => {
        setDisplayedText('')
        setCurrentIndex(0)
    }, [text])

    useEffect(() => {
        if (currentIndex >= text.length) return

        const currentChar = text[currentIndex]
        const delay = currentChar === ' '
            ? 50 + Math.random() * 30
            : currentChar === '.' || currentChar === ',' || currentChar === '!' || currentChar === '?'
                ? 200 + Math.random() * 150
                : 30 + Math.random() * 70

        const timeout = setTimeout(() => {
            setDisplayedText(prev => prev + currentChar)
            setCurrentIndex(prev => prev + 1)
        }, delay)

        return () => clearTimeout(timeout)
    }, [currentIndex, text])

    return displayedText
}

export default function FailPaymentPage() {
    const router = useRouter()
    const { user } = useUserStore()
    const { getCart } = useCartStore()
    const { getProducts } = useProductsStore()
    const { updatePaymentStatus } = useOrderStore()
    const [paymentFailure, setPaymentFailure] = useState<PaymentFailureState>({ status: 'loading' })
    const [isContactModalOpen, setIsContactModalOpen] = useState(false)
    const hasCheckedPaymentRef = useRef(false)
    const cardAnimationRef = useRef<LottieRefCurrentProps>(null)

    useEffect(() => {
        cardAnimationRef.current?.setSpeed(0.6)
    }, [])

    useEffect(() => {
        if (hasCheckedPaymentRef.current) return

        const params = new URLSearchParams(window.location.search)
        const ct = params.get('ct')
        const orderId = params.get('orderId')

        console.log('[PaymentReturn:fail_payment] return params:', { ct, orderId })

        hasCheckedPaymentRef.current = true

        if (!ct || !orderId) {
            console.log('[PaymentReturn:fail_payment] skipped: missing ct or orderId')
            setPaymentFailure({
                status: 'error',
                title: 'Не удалось проверить оплату',
                description: 'Не хватает данных для проверки статуса платежа.',
            })
            return
        }

        const confirmFailure = async () => {
            try {
                console.log('[PaymentReturn:fail_payment] checking payment status:', { orderId, ct })
                const result = await updatePaymentStatus(orderId, ct)
                console.log('[PaymentReturn:fail_payment] payment status response:', result)

                setPaymentFailure({
                    status: 'ready',
                    title: result.actionCodeMessage || 'Оплата не прошла',
                    description: result.actionCodeDescription || result.message,
                })

                if (user._id) {
                    await getCart(user._id)
                    console.log('[PaymentReturn:fail_payment] cart refreshed after failed payment')
                }
                await getProducts()
                console.log('[PaymentReturn:fail_payment] products refreshed after failed payment')
            } catch (error) {
                console.error('[PaymentReturn:fail_payment] payment status check failed:', error)
                setPaymentFailure({
                    status: 'error',
                    title: 'Не удалось проверить оплату',
                    description: 'Попробуйте вернуться в корзину или свяжитесь с менеджером.',
                })
            } finally {
                console.log('[PaymentReturn:fail_payment] cleaning return query params')
                router.replace('/fail_payment')
            }
        }

        void confirmFailure()
    }, [getCart, getProducts, router, updatePaymentStatus, user._id])

    const titleLines = paymentFailure.status === 'loading'
        ? ['ПРОВЕРЯЕМ', 'СТАТУС', 'ОПЛАТЫ']
        : ['ОПЛАТА', 'НЕ', 'ПРОШЛА']
    const description = paymentFailure.status === 'loading'
        ? 'Подождите немного, мы проверяем ответ платежного сервиса и обновляем информацию по заказу.'
        : paymentFailure.description || 'Заказ не был оплачен. Товары возвращены в корзину, если они ещё доступны.'
    const displayedText = useTypewriter(description)

    return (
        <div className="relative min-h-screen w-full overflow-hidden">
            <div className="relative z-10 mb-20 flex min-h-screen flex-col pt-10 md:h-screen md:pt-20">
                <div className="absolute inset-0 flex h-full w-full items-center justify-center">
                    <div className="aspect-square w-[min(78vw,52dvh,22rem)] sm:w-[min(82vw,58dvh,34rem)] md:w-[min(70vw,64dvh,44rem)] lg:w-[min(58vw,68dvh,52rem)]">
                        <Lottie
                            lottieRef={cardAnimationRef}
                            animationData={CardPayAnimation}
                            loop
                            autoplay
                            style={{
                                width: '100%',
                                height: '100%',
                                display: 'block',
                            }}
                            rendererSettings={{
                                preserveAspectRatio: 'xMidYMid meet',
                            }}
                        />
                    </div>
                    <div className="absolute inset-0 z-10 h-full w-full bg-black/45" />
                </div>

                <div className="pointer-events-none absolute inset-0 overflow-hidden">
                    <div className="absolute left-1/4 top-1/4 h-96 w-96 animate-pulse rounded-full bg-pink-original/10 blur-3xl" />
                    <div
                        className="absolute bottom-1/4 right-1/4 h-96 w-96 animate-pulse rounded-full bg-mint-bright/10 blur-3xl"
                        style={{ animationDelay: '1s' }}
                    />
                </div>

                <div className="relative h-screen w-screen">
                    <div className="absolute inset-0 z-20 flex flex-col justify-between px-4 py-8 sm:px-6 sm:py-12 md:px-8 md:py-16 lg:px-12">
                        <div className="flex max-w-2xl flex-col gap-4 sm:gap-6 md:gap-8">
                            <div>
                                <h1 className="text-4xl font-black leading-tight text-[var(--mint-dark)] font-durik sm:text-5xl md:text-6xl lg:text-7xl">
                                    {titleLines.map(line => (
                                        <p key={line}>{line}</p>
                                    ))}
                                </h1>
                                {paymentFailure.status !== 'loading' && (
                                    <p className="mt-4 max-w-md font-cabinet-grotesk text-base font-semibold text-[var(--pink-punk)] sm:text-lg">
                                        {paymentFailure.title}
                                    </p>
                                )}
                            </div>

                            <p className="max-w-md text-sm text-foreground/70 sm:max-w-lg sm:text-base md:text-lg">
                                {displayedText}
                                <span className="ml-1 inline-block h-4 w-0.5 animate-blink bg-foreground/70 sm:h-5 md:h-6">|</span>
                            </p>
                        </div>

                        <div className="flex flex-col items-center justify-center gap-3 pb-4 sm:flex-row sm:gap-4 sm:pb-0">
                            <button
                                type="button"
                                onClick={() => setIsContactModalOpen(true)}
                                className="w-full rounded-lg border-2 border-foreground/30 px-6 py-3 text-center font-cabinet-grotesk text-sm font-semibold text-foreground transition-all duration-300 hover:border-pink-original hover:text-pink-original sm:w-auto sm:px-8 sm:py-4 sm:text-base"
                            >
                                Связаться с менеджером
                            </button>
                            <Link
                                href="/catalog"
                                className="w-full rounded-lg border-2 border-foreground/30 px-6 py-3 text-center font-cabinet-grotesk text-sm font-semibold text-foreground transition-all duration-300 hover:border-mint-bright hover:text-mint-bright sm:w-auto sm:px-8 sm:py-4 sm:text-base"
                            >
                                Перейти в каталог
                            </Link>
                            <button
                                type="button"
                                onClick={() => router.back()}
                                className="w-full px-6 py-3 font-cabinet-grotesk text-sm font-medium text-foreground/70 transition-colors duration-300 hover:text-foreground sm:w-auto sm:px-8 sm:py-4 sm:text-base"
                            >
                                Назад
                            </button>
                        </div>
                    </div>
                </div>
            </div>
            {isContactModalOpen && (
                <div
                    className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 px-4 backdrop-blur-md"
                    onClick={(event) => {
                        if (event.target === event.currentTarget) {
                            setIsContactModalOpen(false)
                        }
                    }}
                >
                    <div className="relative w-full max-w-md rounded-2xl border border-foreground/20 bg-black/80 p-6 shadow-2xl md:p-8">
                        <button
                            type="button"
                            onClick={() => setIsContactModalOpen(false)}
                            className="absolute right-4 top-4 text-foreground/70 transition-colors hover:text-foreground"
                            aria-label="Закрыть"
                        >
                            <svg className="h-6 w-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                            </svg>
                        </button>

                        <div className="mb-6">
                            <h2 className="font-durik text-3xl font-black uppercase leading-tight text-[var(--mint-dark)] md:text-4xl">
                                Связаться
                            </h2>
                            <p className="mt-3 font-cabinet-grotesk text-sm text-foreground/70 md:text-base">
                                Выберите удобный способ связи. Менеджер поможет с оплатой и заказом.
                            </p>
                        </div>

                        <div className="space-y-3">
                            <a
                                href="tel:+375333572566"
                                className="block rounded-lg border-2 border-foreground/30 px-5 py-4 font-cabinet-grotesk font-semibold text-foreground transition-all duration-300 hover:border-pink-original hover:text-pink-original"
                            >
                                Позвонить: +375 (33) 357-25-66
                            </a>
                            <a
                                href="https://t.me/pinkpunk_brand"
                                target="_blank"
                                rel="noopener noreferrer"
                                className="block rounded-lg border-2 border-foreground/30 px-5 py-4 font-cabinet-grotesk font-semibold text-foreground transition-all duration-300 hover:border-mint-bright hover:text-mint-bright"
                            >
                                Написать в Telegram
                            </a>
                        </div>
                    </div>
                </div>
            )}
        </div>
    )
}
