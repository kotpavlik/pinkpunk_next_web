'use client'

import { useEffect, useMemo, useState } from 'react'
import { createPortal } from 'react-dom'
import { AxiosError } from 'axios'
import { XMarkIcon } from '@heroicons/react/24/outline'
import { UserApi } from '@/api/UserApi'
import { instagramReelsUrlError, normalizeInstagramReelsUrl } from '@/utils/instagramReelsUrl'
import { useUserStore } from '@/zustand/user_store/UserStore'
import {
    instagramHandleError,
    normalizeInstagramHandle,
    sanitizeInstagramHandleInput,
} from '@/utils/instagramUsername'

type Props = {
    isOpen: boolean
    onClose: () => void
    initialInstaUsername?: string
    onSuccess?: () => void
}

export default function InstagramReelsModal({
    isOpen,
    onClose,
    initialInstaUsername = '',
    onSuccess,
}: Props) {
    const { user, patchInstagramUsername } = useUserStore()
    const [mounted, setMounted] = useState(false)
    const [handle, setHandle] = useState('')
    const [url, setUrl] = useState('')
    const [error, setError] = useState<string | null>(null)
    const [loading, setLoading] = useState(false)
    const [sent, setSent] = useState(false)

    const savedHandle = useMemo(() => {
        const fromInstagram = user.instagram?.username?.trim()
        const fromLegacy = user.instagramUsername?.trim()
        const fromProp = initialInstaUsername?.trim()
        return normalizeInstagramHandle(fromInstagram || fromLegacy || fromProp || '')
    }, [initialInstaUsername, user.instagram?.username, user.instagramUsername])

    useEffect(() => {
        setMounted(true)
    }, [])

    useEffect(() => {
        if (!isOpen) {
            setHandle('')
            setUrl('')
            setError(null)
            setLoading(false)
            setSent(false)
            return
        }
        setHandle(savedHandle)
    }, [isOpen, savedHandle])

    if (!mounted || !isOpen) return null

    const handleSubmit = async () => {
        setError(null)
        const normalizedHandle = normalizeInstagramHandle(handle)
        const handleValidationError = instagramHandleError(handle)
        if (handleValidationError) {
            setError(handleValidationError)
            return
        }

        const trimmedUrl = url.trim()
        const urlValidationError = instagramReelsUrlError(trimmedUrl)
        if (urlValidationError) {
            setError(urlValidationError)
            return
        }

        const normalizedUrl = normalizeInstagramReelsUrl(trimmedUrl)
        if (!normalizedUrl) {
            setError('Не удалось распознать ссылку на Reels')
            return
        }

        setLoading(true)
        try {
            if (normalizedHandle !== savedHandle) {
                const saveResult = await patchInstagramUsername(normalizedHandle)
                if (!saveResult.success) {
                    setError(saveResult.error ?? 'Не удалось сохранить Instagram username')
                    return
                }
            }

            await UserApi.submitInstagramReel({
                username: normalizedHandle,
                url: normalizedUrl,
            })
            setSent(true)
            onSuccess?.()
        } catch (e: unknown) {
            const axiosError = e as AxiosError<{ message?: string; error?: string }>
            const msg =
                axiosError.response?.data?.message ??
                axiosError.response?.data?.error ??
                (e instanceof Error && e.message ? e.message : 'Не удалось отправить ссылку. Попробуйте позже.')
            setError(typeof msg === 'string' ? msg : 'Не удалось отправить ссылку. Попробуйте позже.')
        } finally {
            setLoading(false)
        }
    }

    const canSubmit = Boolean(normalizeInstagramHandle(handle)) && Boolean(url.trim())

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
                aria-labelledby="reels-modal-title"
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

                <h2 id="reels-modal-title" className="text-lg font-bold text-white font-blauer-nue pr-8">
                    Я снял видео
                </h2>
                <p className="mt-2 text-sm text-white/60 leading-relaxed">
                    Укажите ваш Instagram и ссылку на Reels с отметкой @pinkpunk_brand. Без username отправить
                    нельзя.
                </p>

                {sent ? (
                    <p className="mt-4 rounded-xl border border-[var(--mint-bright)]/30 bg-[var(--mint-bright)]/10 px-4 py-3 text-sm text-[var(--mint-bright)]">
                        Ссылка отправлена. Мы проверим видео и начислим баллы после одобрения.
                    </p>
                ) : (
                    <>
                        <label className="mt-4 block text-xs font-medium text-white/55">Instagram username</label>
                        <div className="mt-1.5 flex items-center overflow-hidden rounded-xl border border-white/15 bg-white/[0.06] focus-within:border-[#E1306C]/60 focus-within:ring-1 focus-within:ring-[#E1306C]/40">
                            <span className="pl-4 text-sm text-white/45">@</span>
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
                        {savedHandle ? (
                            <p className="mt-1 text-[11px] text-white/45">
                                Подставлен из профиля — можно изменить перед отправкой.
                            </p>
                        ) : (
                            <p className="mt-1 text-[11px] text-white/45">
                                Латиница, цифры, . и _ — без пробелов. До 30 символов.
                            </p>
                        )}

                        <label className="mt-4 block text-xs font-medium text-white/55">Ссылка на Reels</label>
                        <input
                            type="url"
                            value={url}
                            onChange={(e) => {
                                setUrl(e.target.value.replace(/\s/g, ''))
                                if (error) setError(null)
                            }}
                            placeholder="https://www.instagram.com/reel/…"
                            className="mt-1.5 w-full rounded-xl border border-white/15 bg-white/[0.06] px-4 py-3 text-sm text-white placeholder-white/35 focus:border-[#E1306C]/60 focus:outline-none focus:ring-1 focus:ring-[#E1306C]/40"
                            disabled={loading}
                        />
                        <p className="mt-1 text-[11px] text-white/45">
                            Только instagram.com/reel/… или /reels/… — прямая ссылка на видео.
                        </p>
                        {error ? <p className="mt-2 text-xs text-[var(--pink-punk)]">{error}</p> : null}
                        <button
                            type="button"
                            onClick={() => void handleSubmit()}
                            disabled={loading || !canSubmit}
                            className="mt-4 w-full rounded-xl bg-[#E1306C] py-3 text-sm font-semibold text-white transition hover:bg-[#C13584] disabled:opacity-40"
                        >
                            {loading ? 'Отправка…' : 'Отправить на проверку'}
                        </button>
                    </>
                )}
            </div>
        </div>,
        document.body,
    )
}
