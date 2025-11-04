'use client'

import { useEffect, useMemo } from 'react'
import { useCartStore } from '@/zustand/cart_store/CartStore'
import { useUserStore } from '@/zustand/user_store/UserStore'
import Image from 'next/image'
import Loader from '@/components/ui/shared/Loader'

export default function Cart() {
    const { user } = useUserStore()
    const {
        items: cartItems,
        stats,
        error,
        getCart,
        updateCartItem,
        removeFromCart,
        clearCart,
        setError,
        isLoading,
    } = useCartStore()

    useEffect(() => {
        if (user?._id) {
            getCart(user._id)
        }
    }, [user?._id, getCart])

    const totalPrice = useMemo(() => {
        return stats?.totalPrice || cartItems.reduce((t, it) => t + it.product.price * it.quantity, 0)
    }, [stats?.totalPrice, cartItems])

    const totalItems = useMemo(() => {
        return stats?.totalItems || cartItems.reduce((t, it) => t + it.quantity, 0)
    }, [stats?.totalItems, cartItems])

    if (isLoading) {
        return <Loader fullScreen showText />
    }

    return (
        <div className="relative mx-auto min-h-screen px-4 py-24 md:max-w-[80vw]">
            <section className="bg-white/5 backdrop-blur-sm border border-white/10 rounded-2xl shadow-[0_10px_30px_rgba(0,0,0,.35)] p-6">
                <div className="flex items-center justify-between mb-6">
                    <h1 className="text-2xl md:text-3xl font-blauer-nue font-bold text-white">
                        Корзина {totalItems > 0 && <span className="text-white/60 text-lg">({totalItems})</span>}
                    </h1>
                    {cartItems.length > 0 && (
                        <button
                            onClick={() => user?._id && clearCart(user._id)}
                            className="px-4 py-2 rounded-lg bg-[var(--pink-punk)] hover:bg-[var(--pink-light)] text-white font-blauer-nue border border-white/10 transition-colors"
                        >
                            Очистить
                        </button>
                    )}
                </div>

                {error && (
                    <div className="mb-4 p-3 rounded-lg border border-red-500/50 bg-red-500/15 text-red-200">
                        <div className="flex items-center justify-between">
                            <p className="font-medium">{error}</p>
                            <button className="text-red-300 hover:text-red-100" onClick={() => setError(null)}>✕</button>
                        </div>
                    </div>
                )}

                {cartItems.length === 0 ? (
                    <div className="text-center py-16 text-white/80">Ваша корзина пуста</div>
                ) : (
                    <div className="grid gap-4 mb-6">
                        {cartItems.map(({ _id, product, quantity }) => (
                            <div key={_id} className="relative bg-white/5 backdrop-blur-sm border border-white/10 rounded-xl p-3 flex items-center gap-3">
                                <button
                                    onClick={() => user?._id && removeFromCart(user._id, product._id)}
                                    className="absolute top-0 right-0 w-8 h-8 flex items-center justify-center bg-[var(--pink-punk)] hover:bg-[var(--pink-light)] text-white rounded-bl-lg rounded-tr-lg"
                                    title="Удалить"
                                >
                                    ✕
                                </button>
                                <div className="relative w-16 h-16 rounded-lg overflow-hidden border border-white/10 bg-white/5 flex-shrink-0">
                                    {product.photos?.[0] ? (
                                        <Image src={product.photos[0]} alt={product.name} fill className="object-cover" />
                                    ) : (
                                        <div className="w-full h-full flex items-center justify-center text-white/40">📦</div>
                                    )}
                                </div>
                                <div className="flex-1 min-w-0">
                                    <div className="flex items-center justify-between gap-3">
                                        <h3 className="text-white font-semibold truncate">{product.name}</h3>
                                        <span className="text-[var(--mint-bright)] font-bold bg-white/10 border border-white/10 rounded-lg px-3 py-1 text-sm">{product.price} BYN</span>
                                    </div>
                                    <div className="mt-3 flex items-center justify-between gap-3">
                                        <div className="bg-white/5 border border-white/10 rounded-lg flex items-center">
                                            <button
                                                className="w-8 h-8 text-white hover:bg-[var(--pink-punk)] rounded-l-lg transition-colors"
                                                disabled={quantity === 1}
                                                onClick={() => user?._id && updateCartItem(user._id, product._id, quantity - 1)}
                                            >
                                                −
                                            </button>
                                            <span className="px-3 py-2 text-white min-w-[3rem] text-center">{quantity}</span>
                                            <button
                                                className="w-8 h-8 text-white hover:bg-[var(--pink-punk)] rounded-r-lg transition-colors"
                                                onClick={() => user?._id && updateCartItem(user._id, product._id, quantity + 1)}
                                            >
                                                +
                                            </button>
                                        </div>
                                        <div className="text-[var(--mint-bright)] font-bold">{(product.price * quantity).toFixed(2)} BYN</div>
                                    </div>
                                </div>
                            </div>
                        ))}
                    </div>
                )}

                <div className="border-t border-white/10 pt-4 flex items-center justify-between">
                    <span className="text-white/90 text-lg font-blauer-nue">Итого</span>
                    <span className="text-2xl font-bold text-[var(--mint-bright)]">{totalPrice.toFixed(2)} BYN</span>
                </div>

                <div className="mt-4 flex gap-3">
                    <button className="flex-1 px-4 py-3 bg-white/10 hover:bg-white/15 text-white/90 rounded-lg border border-white/10 font-blauer-nue transition-colors">
                        Каталог
                    </button>
                    <button
                        disabled={cartItems.length === 0}
                        className="flex-1 px-4 py-3 bg-[var(--pink-punk)] hover:bg-[var(--pink-light)] text-white rounded-lg border border-white/10 font-blauer-nue transition-colors disabled:bg-white/10 disabled:text-white/40 disabled:cursor-not-allowed"
                    >
                        Оформить заказ
                    </button>
                </div>
            </section>
        </div>
    )
}