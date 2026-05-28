'use client'

import { useEffect, useState } from 'react'
import { createPortal } from 'react-dom'
import { XMarkIcon } from '@heroicons/react/24/outline'
import { useUserStore } from '@/zustand/user_store/UserStore'
import { instagramHandleError, normalizeInstagramHandle, sanitizeInstagramHandleInput } from '@/utils/instagramUsername'

type Props = {
    isOpen: boolean
    onClose: () => void
    initialHandle?: string
    onSaved?: () => void
}

export default function InstagramAccountModal({
    isOpen,
    onClose,
    initialHandle = '',
    onSaved,
}: Props) {
    const { patchInstagramUsername } = useUserStore()
    const [mounted, setMounted] = useState(false)
    const [handle, setHandle] = useState(initialHandle)
    const [error, setError] = useState<string | null>(null)
    const [loading, setLoading] = useState(false)

    useEffect(() => {
        setMounted(true)
    }, [])

    useEffect(() => {
        if (isOpen) {
            setHandle(initialHandle.replace(/^@+/, ''))
            setError(null)
            setLoading(false)
        }
    }, [isOpen, initialHandle])

    if (!mounted || !isOpen) return null

    const handleSubmit = async () => {
        setError(null)
        const normalized = normalizeInstagramHandle(handle)
        const validationError = instagramHandleError(handle)
        if (validationError) {
            setError(validationError)
            return
        }

        setLoading(true)
        const result = await patchInstagramUsername(normalized)
        setLoading(false)

        if (result.success) {
            onSaved?.()
            onClose()
            return
        }
        setError(result.error ?? 'Не удалось сохранить Instagram')
    }

    return createPortal(
        <div
            className="fixed inset-0 z-[10001] flex items-center justify-center bg-black/70 p-4 backdrop-blur-sm"
            onClick={(e) => {
                if (e.target === e.currentTarget && !loading) onClose()
            }}
        >
            <div
                className="relative w-full max-w-md rounded-2xl border border-white/10 bg-[#121214] p-5 shadow-2xl"
                onClick={(e) => e.stopPropagation()}
                role="dialog"
                aria-modal="true"
                aria-labelledby="instagram-modal-title"
            >
                <button
                    type="button"
                    onClick={onClose}
                    disabled={loading}
                    className="absolute right-3 top-3 text-white/50 hover:text-white"
                    aria-label="Закрыть"
                >
                    <XMarkIcon className="h-5 w-5" />
                </button>

                <h2 id="instagram-modal-title" className="text-lg font-bold text-white font-blauer-nue pr-8">
                    Instagram аккаунт
                </h2>
                <p className="mt-2 text-sm text-white/60 leading-relaxed">
                    Укажите ваш username — так мы быстрее найдём Reels с отметкой бренда.
                </p>

                <div className="mt-4 flex items-center rounded-xl border border-white/15 bg-white/[0.06] overflow-hidden focus-within:border-[#E1306C]/60 focus-within:ring-1 focus-within:ring-[#E1306C]/40">
                    <span className="pl-4 text-white/45 text-sm">@</span>
                    <input
                        type="text"
                        value={handle}
                        onChange={(e) => {
                            setHandle(sanitizeInstagramHandleInput(e.target.value))
                            if (error) setError(null)
                        }}
                        placeholder="username"
                        className="flex-1 bg-transparent py-3 pr-4 text-sm text-white placeholder-white/35 focus:outline-none"
                        disabled={loading}
                        autoComplete="off"
                    />
                </div>
                {error ? <p className="mt-2 text-xs text-[var(--pink-punk)]">{error}</p> : null}
                <button
                    type="button"
                    onClick={() => void handleSubmit()}
                    disabled={loading || !handle.trim()}
                    className="mt-4 w-full rounded-xl bg-[#E1306C] py-3 text-sm font-semibold text-white transition hover:bg-[#C13584] disabled:opacity-40"
                >
                    {loading ? 'Сохранение…' : 'Сохранить'}
                </button>
            </div>
        </div>,
        document.body,
    )
}
