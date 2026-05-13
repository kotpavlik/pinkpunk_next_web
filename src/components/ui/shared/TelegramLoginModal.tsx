'use client'

import { useEffect, useState, useCallback, useRef } from 'react'
import type {
    ClipboardEvent as ReactClipboardEvent,
    KeyboardEvent as ReactKeyboardEvent,
} from 'react'
import { createPortal } from 'react-dom'
import TelegramLoginWidget, { TelegramUser } from './TelegramLoginWidget'
import { useUserStore } from '@/zustand/user_store/UserStore'
import { useAppStore } from '@/zustand/app_store/AppStore'
import TelegramLottieJson from '@/components/ui/shared/TelegramLottieJson'
import {
    belarusPhoneE164,
    formatBelarusPhoneDisplay,
    isBelarusMobileComplete,
    parseBelarusNationalInput,
} from '@/utils/belarusPhone'

interface TelegramLoginModalProps {
    isOpen: boolean
    onClose: () => void
    botName?: string
}

const DRAWER_TRANSITION_MS = 320
const SMS_CODE_LEN = 4

export default function TelegramLoginModal({
    isOpen,
    onClose,
    botName = process.env.NEXT_PUBLIC_TELEGRAM_BOT_NAME || 'pinkpunk_brand',
}: TelegramLoginModalProps) {
    const [mounted, setMounted] = useState(false)
    const [drawerEntered, setDrawerEntered] = useState(false)
    const [telegramModalOpen, setTelegramModalOpen] = useState(false)
    const [telegramLoading, setTelegramLoading] = useState(false)
    const [telegramWidgetEnabled, setTelegramWidgetEnabled] = useState(false)
    const [telegramError, setTelegramError] = useState<string | null>(null)
    const [phoneSending, setPhoneSending] = useState(false)
    const [verifyLoading, setVerifyLoading] = useState(false)
    const [error, setError] = useState<string | null>(null)
    /** 9 национальных цифр без +375 (только оператор и абонент). */
    const [phoneNational, setPhoneNational] = useState('')
    const [code, setCode] = useState('')
    const [phase, setPhase] = useState<'phone' | 'code'>('phone')
    const [cooldown, setCooldown] = useState(0)
    const closingRef = useRef(false)
    const closeTimeoutRef = useRef<number | null>(null)
    const codeInputRefs = useRef<Array<HTMLInputElement | null>>([null, null, null, null])

    const {
        authenticateTelegramLoginWidget,
        requestPhoneAuthCode,
        verifyPhoneAuth,
    } = useUserStore()
    const { status } = useAppStore()

    const cleanBotName = botName.startsWith('@') ? botName.slice(1) : botName

    useEffect(() => {
        setMounted(true)
    }, [])

    useEffect(() => {
        if (!isOpen) {
            closingRef.current = false
            if (closeTimeoutRef.current) {
                window.clearTimeout(closeTimeoutRef.current)
                closeTimeoutRef.current = null
            }
            setPhase('phone')
            setPhoneNational('')
            setCode('')
            setCooldown(0)
            setError(null)
            setTelegramLoading(false)
            setPhoneSending(false)
            setVerifyLoading(false)
            setTelegramModalOpen(false)
            setTelegramWidgetEnabled(false)
            setTelegramError(null)
            setDrawerEntered(false)
            return
        }

        let rafMain = 0
        let rafNest = 0
        rafMain = requestAnimationFrame(() => {
            rafNest = requestAnimationFrame(() => setDrawerEntered(true))
        })
        return () => {
            cancelAnimationFrame(rafMain)
            cancelAnimationFrame(rafNest)
        }
    }, [isOpen])

    useEffect(() => {
        if (telegramModalOpen) {
            setTelegramError(null)
            const t = requestAnimationFrame(() => {
                requestAnimationFrame(() => setTelegramWidgetEnabled(true))
            })
            return () => cancelAnimationFrame(t)
        }
        setTelegramWidgetEnabled(false)
    }, [telegramModalOpen])

    useEffect(() => {
        if (cooldown <= 0) return
        const iv = window.setInterval(() => {
            setCooldown((s) => (s <= 1 ? 0 : s - 1))
        }, 1000)
        return () => window.clearInterval(iv)
    }, [cooldown])

    useEffect(() => {
        if (!isOpen) {
            document.body.style.overflow = ''
            return
        }
        document.body.style.overflow = 'hidden'
        return () => {
            document.body.style.overflow = ''
        }
    }, [isOpen])

    useEffect(() => {
        return () => {
            if (closeTimeoutRef.current) {
                window.clearTimeout(closeTimeoutRef.current)
            }
        }
    }, [])

    const requestCloseAnimated = useCallback(() => {
        if (closingRef.current || !isOpen) return
        closingRef.current = true
        setTelegramModalOpen(false)
        setDrawerEntered(false)

        if (closeTimeoutRef.current) {
            window.clearTimeout(closeTimeoutRef.current)
        }
        closeTimeoutRef.current = window.setTimeout(() => {
            closeTimeoutRef.current = null
            closingRef.current = false
            onClose()
        }, DRAWER_TRANSITION_MS)
    }, [isOpen, onClose])

    useEffect(() => {
        const handleEscape = (e: KeyboardEvent) => {
            if (e.key !== 'Escape' || !isOpen) return
            if (telegramModalOpen) {
                setTelegramModalOpen(false)
                e.preventDefault()
                return
            }
            requestCloseAnimated()
        }

        if (isOpen) {
            document.addEventListener('keydown', handleEscape)
        }

        return () => {
            document.removeEventListener('keydown', handleEscape)
        }
    }, [isOpen, telegramModalOpen, requestCloseAnimated])

    const handleRequestCode = useCallback(async () => {
        setError(null)
        if (cooldown > 0) return

        if (phase === 'code') {
            setCode('')
            queueMicrotask(() => codeInputRefs.current[0]?.focus())
        }

        setPhoneSending(true)
        const phoneE164 = belarusPhoneE164(phoneNational)
        if (!phoneE164) {
            setPhoneSending(false)
            return
        }
        const result = await requestPhoneAuthCode(phoneE164)
        setPhoneSending(false)
        if (result.success) {
            setPhase('code')
            setCooldown(result.resendCooldownSeconds)
        } else {
            setError(result.error || 'Не удалось отправить код')
        }
    }, [phoneNational, cooldown, phase, requestPhoneAuthCode])

    const handleVerify = useCallback(async () => {
        setError(null)
        setVerifyLoading(true)
        const phoneE164 = belarusPhoneE164(phoneNational)
        if (!phoneE164) {
            setVerifyLoading(false)
            return
        }
        const result = await verifyPhoneAuth(phoneE164, code)
        setVerifyLoading(false)
        if (result.success) {
            requestCloseAnimated()
        } else {
            setError(result.error || 'Ошибка входа')
        }
    }, [phoneNational, code, verifyPhoneAuth, requestCloseAnimated])

    const busyGlobal = status === 'loading'

    const phoneDisplay = formatBelarusPhoneDisplay(phoneNational)
    const phoneReady = isBelarusMobileComplete(phoneNational)

    const handlePhoneKeyDown = useCallback((e: ReactKeyboardEvent<HTMLInputElement>) => {
        if (e.ctrlKey || e.metaKey || e.altKey) return
        const allowNav = [
            'Backspace',
            'Delete',
            'Tab',
            'ArrowLeft',
            'ArrowRight',
            'ArrowUp',
            'ArrowDown',
            'Home',
            'End',
            'Enter',
        ]
        if (allowNav.includes(e.key)) return
        if (/^\d$/.test(e.key)) return
        e.preventDefault()
    }, [])

    const handleSmsPaste = useCallback((e: ReactClipboardEvent<HTMLDivElement>) => {
        e.preventDefault()
        const pasted = e.clipboardData.getData('text').replace(/\D/g, '').slice(0, SMS_CODE_LEN)
        if (!pasted) return
        setCode(pasted)
        queueMicrotask(() => {
            const idx = Math.min(Math.max(pasted.length - 1, 0), SMS_CODE_LEN - 1)
            codeInputRefs.current[idx]?.focus()
        })
    }, [])

    const handleSmsDigitChange = useCallback((index: number, raw: string) => {
        const digits = raw.replace(/\D/g, '')
        if (digits.length >= SMS_CODE_LEN) {
            const next = digits.slice(0, SMS_CODE_LEN)
            setCode(next)
            queueMicrotask(() => codeInputRefs.current[SMS_CODE_LEN - 1]?.focus())
            return
        }
        if (digits === '') {
            setCode((c) => c.slice(0, index) + c.slice(index + 1))
            return
        }
        const digit = digits.slice(-1)
        setCode((c) => {
            const next = (c.slice(0, index) + digit + c.slice(index + 1)).slice(0, SMS_CODE_LEN)
            queueMicrotask(() => {
                if (digit && index < SMS_CODE_LEN - 1) {
                    codeInputRefs.current[index + 1]?.focus()
                }
            })
            return next
        })
    }, [])

    const handleSmsKeyDown = useCallback((index: number, e: ReactKeyboardEvent<HTMLInputElement>) => {
        if (e.ctrlKey || e.metaKey || e.altKey) return

        const navKeys = new Set([
            'Backspace',
            'Delete',
            'Tab',
            'ArrowLeft',
            'ArrowRight',
            'ArrowUp',
            'ArrowDown',
            'Home',
            'End',
        ])
        if (!navKeys.has(e.key) && e.key.length === 1 && !/^\d$/.test(e.key)) {
            e.preventDefault()
            return
        }

        if (e.key === 'Backspace') {
            e.preventDefault()
            setCode((c) => {
                if (c[index]) {
                    return c.slice(0, index) + c.slice(index + 1)
                }
                if (index > 0) {
                    queueMicrotask(() => codeInputRefs.current[index - 1]?.focus())
                    return c.slice(0, index - 1) + c.slice(index)
                }
                return c
            })
            return
        }
        if (e.key === 'ArrowLeft' && index > 0) {
            e.preventDefault()
            codeInputRefs.current[index - 1]?.focus()
        }
        if (e.key === 'ArrowRight' && index < SMS_CODE_LEN - 1) {
            e.preventDefault()
            codeInputRefs.current[index + 1]?.focus()
        }
    }, [])

    useEffect(() => {
        if (!isOpen || phase !== 'code') return
        const t = window.setTimeout(() => codeInputRefs.current[0]?.focus(), 80)
        return () => window.clearTimeout(t)
    }, [isOpen, phase])

    if (!isOpen) return null

    if (!mounted || typeof document === 'undefined' || !document.body) {
        return null
    }

    const rootLayer = (
        <div className="fixed inset-0" style={{ zIndex: 99999 }}>
            <div
                className={`absolute inset-0 bg-black/55 backdrop-blur-[2px] transition-opacity ease-out`}
                style={{
                    transitionDuration: `${DRAWER_TRANSITION_MS}ms`,
                    opacity: drawerEntered ? 1 : 0,
                    pointerEvents: isOpen ? 'auto' : 'none',
                }}
                onClick={requestCloseAnimated}
                aria-hidden
            />

            <aside
                className={`absolute inset-y-0 right-0 flex w-full flex-col overflow-hidden border-l border-white/[0.08] bg-[#0a0a0b]/[0.97] backdrop-blur-2xl transition-transform ease-out md:w-1/2 md:max-w-none`}
                style={{
                    transitionDuration: `${DRAWER_TRANSITION_MS}ms`,
                    transform: drawerEntered ? 'translateX(0)' : 'translateX(100%)',
                    paddingTop: 'env(safe-area-inset-top)',
                    paddingBottom: 'env(safe-area-inset-bottom)',
                }}
                role="dialog"
                aria-modal="true"
                aria-labelledby="auth-drawer-title"
                onClick={(e) => e.stopPropagation()}
            >
                <div className="flex shrink-0 items-center justify-end border-b border-white/[0.06] px-4 py-3">
                    <button
                        type="button"
                        onClick={requestCloseAnimated}
                        className="flex h-9 w-9 items-center justify-center rounded-full text-white/45 transition hover:bg-white/[0.06] hover:text-white"
                        aria-label="Закрыть"
                    >
                        <svg className="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                        </svg>
                    </button>
                </div>

                <div className="min-h-0 flex-1 overflow-y-auto px-5 pb-6 pt-6 sm:px-8">
                    <header className="mb-8">
                        <h2 id="auth-drawer-title" className="text-base font-extrabold uppercase tracking-[0.18em] text-white sm:text-lg">
                            Вход / регистрация
                        </h2>
                        <p className="mt-3 max-w-md text-xs leading-relaxed text-white/50 sm:text-sm">
                            Получите доступ к эксклюзивным преимуществам учетной записи
                            <br />
                            PINK PUNK™
                        </p>
                    </header>

                    {error && (
                        <div className="mb-4 rounded-lg border border-red-500/25 bg-red-500/10 px-3 py-3">
                            <p className="text-center text-sm text-red-200/90">{error}</p>
                        </div>
                    )}

                    {phase === 'phone' ? (
                        <div className="space-y-4">
                            <label className="block">
                                <span className="mb-1.5 block text-sm text-white/55">Номер телефона</span>
                                <input
                                    type="tel"
                                    inputMode="numeric"
                                    autoComplete="tel"
                                    spellCheck={false}
                                    value={phoneDisplay}
                                    onChange={(e) => setPhoneNational(parseBelarusNationalInput(e.target.value))}
                                    onKeyDown={handlePhoneKeyDown}
                                    onFocus={(e) => {
                                        if (phoneNational.length === 0) {
                                            requestAnimationFrame(() => {
                                                const len = e.target.value.length
                                                e.target.setSelectionRange(len, len)
                                            })
                                        }
                                    }}
                                    placeholder="+375 XX XXX XX XX"
                                    className="w-full rounded-xl border border-white/15 bg-white/[0.06] px-4 py-3 text-white tabular-nums placeholder-white/30 focus:border-[#12c998]/80 focus:outline-none focus:ring-1 focus:ring-[#12c998]/40"
                                    disabled={phoneSending || busyGlobal}
                                />
                            </label>
                            <button
                                type="button"
                                onClick={() => void handleRequestCode()}
                                disabled={phoneSending || busyGlobal || cooldown > 0 || !phoneReady}
                                className={`w-full rounded-xl bg-[#12c998] px-4 py-3 font-semibold text-white transition hover:bg-[#0fa87a] disabled:pointer-events-none disabled:opacity-45 ${
                                    phoneReady && !phoneSending && !busyGlobal && cooldown === 0
                                        ? 'shadow-[0_0_24px_-3px_rgba(18,201,152,0.5)]'
                                        : ''
                                }`}
                            >
                                {phoneSending || busyGlobal
                                    ? 'Отправка…'
                                    : cooldown > 0
                                        ? `Повторить через ${cooldown} с`
                                        : 'Получить код'}
                            </button>
                        </div>
                    ) : (
                        <div className="space-y-4">
                            <p className="text-center text-sm text-white/55">
                                Код отправлен на{' '}
                                <span className="font-medium text-white">{phoneDisplay.trim()}</span>
                            </p>
                            <div className="block">
                                <span className="mb-2 block text-sm text-white/55" id="sms-code-label">
                                    Код из SMS (4 цифры)
                                </span>
                                <div
                                    role="group"
                                    aria-labelledby="sms-code-label"
                                    className="flex justify-center gap-2 sm:gap-3"
                                    onPaste={handleSmsPaste}
                                >
                                    {Array.from({ length: SMS_CODE_LEN }, (_, i) => (
                                        <input
                                            key={i}
                                            ref={(el) => {
                                                codeInputRefs.current[i] = el
                                            }}
                                            type="text"
                                            inputMode="numeric"
                                            autoComplete={i === 0 ? 'one-time-code' : 'off'}
                                            maxLength={1}
                                            value={code[i] ?? ''}
                                            onChange={(e) => handleSmsDigitChange(i, e.target.value)}
                                            onKeyDown={(e) => handleSmsKeyDown(i, e)}
                                            disabled={verifyLoading || busyGlobal}
                                            aria-label={`Цифра ${i + 1} кода из SMS`}
                                            className="h-12 w-11 shrink-0 rounded-xl border border-white/15 bg-white/[0.06] text-center text-xl font-semibold tabular-nums text-white focus:border-[#12c998]/80 focus:outline-none focus:ring-1 focus:ring-[#12c998]/40 sm:h-14 sm:w-12 sm:text-2xl"
                                        />
                                    ))}
                                </div>
                            </div>
                            <button
                                type="button"
                                onClick={() => void handleVerify()}
                                disabled={verifyLoading || busyGlobal || code.length !== 4}
                                className="w-full rounded-xl bg-[#ff2b9c] px-4 py-3 font-semibold text-white transition hover:bg-[#e02488] disabled:pointer-events-none disabled:opacity-45"
                            >
                                {verifyLoading || busyGlobal ? 'Проверка…' : 'Войти'}
                            </button>
                            <button
                                type="button"
                                className="w-full text-sm text-[#12c998]/90 hover:underline"
                                onClick={() => {
                                    setPhase('phone')
                                    setCode('')
                                    setError(null)
                                }}
                            >
                                Изменить номер
                            </button>
                            <button
                                type="button"
                                className="w-full text-sm text-white/45 transition hover:text-white/70 disabled:opacity-35"
                                disabled={phoneSending || busyGlobal || cooldown > 0}
                                onClick={() => void handleRequestCode()}
                            >
                                {cooldown > 0 ? `Отправить код снова через ${cooldown} с` : 'Отправить код снова'}
                            </button>
                        </div>
                    )}

                    <div className="mt-12 border-t border-white/[0.06] pt-6">
                        <p className="text-center text-[11px] leading-snug text-white/35">
                            Продолжая, вы принимаете условия сервиса.
                        </p>
                    </div>

                    {!telegramModalOpen && (
                        <div className="mt-6">
                            <button
                                type="button"
                                onClick={(e) => {
                                    e.stopPropagation()
                                    setTelegramModalOpen(true)
                                }}
                                className="mx-auto grid w-full max-w-md grid-cols-[minmax(0,1fr)_5.5rem] grid-rows-1 overflow-hidden rounded-xl border border-white/15 bg-white/[0.06] text-left font-semibold text-white shadow-none transition hover:border-white/22 hover:bg-white/[0.09] active:opacity-95 sm:grid-cols-[minmax(0,1fr)_6.75rem]"
                                aria-label="Войти с помощью Telegram"
                            >
                                <div className="flex min-h-[5.5rem] min-w-0 flex-col justify-center py-3 pl-4 pr-2 sm:min-h-[6.75rem] sm:pr-3">
                                    <p className="text-sm font-semibold uppercase leading-snug tracking-wide text-white sm:text-base">
                                        Войти с помощью Telegram
                                    </p>
                                </div>
                                <div
                                    className="relative min-h-[5.5rem] overflow-hidden border-l border-white/[0.1] bg-white/[0.04] sm:min-h-[6.75rem]"
                                    aria-hidden
                                >
                                    <div className="pointer-events-none absolute inset-0">
                                        <TelegramLottieJson
                                            loop
                                            style={{ width: '100%', height: '100%' }}
                                        />
                                    </div>
                                </div>
                            </button>
                        </div>
                    )}
                </div>
            </aside>

            {telegramModalOpen && (
                <div
                    className="absolute inset-0 flex items-center justify-center bg-black/75 p-4 backdrop-blur-sm"
                    style={{ zIndex: 100002 }}
                    onClick={() => !telegramLoading && setTelegramModalOpen(false)}
                >
                    <div
                        className="relative w-full max-w-md rounded-2xl border border-white/10 bg-[#121214] p-5 shadow-2xl sm:p-6"
                        role="dialog"
                        aria-labelledby="telegram-auth-title"
                        aria-modal="true"
                        onClick={(e) => e.stopPropagation()}
                    >
                        <button
                            type="button"
                            disabled={telegramLoading}
                            onClick={() => setTelegramModalOpen(false)}
                            className="absolute right-4 top-4 flex h-8 w-8 items-center justify-center rounded-full text-white/45 hover:bg-white/[0.08] hover:text-white disabled:pointer-events-none"
                            aria-label="Закрыть"
                        >
                            <svg className="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                            </svg>
                        </button>

                        <div className="mb-5 mt-8 text-center sm:mt-6">
                            <h3 id="telegram-auth-title" className="text-base font-medium text-white">
                                Telegram
                            </h3>
                            <p className="mt-2 text-xs text-white/45">Подтвердите вход через бота ниже.</p>
                        </div>

                        {telegramError && (
                            <div className="mb-4 rounded-lg border border-red-500/25 bg-red-500/10 px-3 py-2">
                                <p className="text-center text-sm text-red-200/90">{telegramError}</p>
                            </div>
                        )}

                        {telegramLoading && (
                            <p className="mb-4 text-center text-sm text-white/55">Подождите…</p>
                        )}

                        {telegramWidgetEnabled && (
                            <div className="flex min-h-[64px] justify-center sm:min-h-[70px]">
                                <TelegramLoginWidget
                                    botName={cleanBotName}
                                    size="large"
                                    requestAccess={true}
                                    usePic={true}
                                    cornerRadius={20}
                                    lang="ru"
                                    className="flex justify-center"
                                    onAuth={async (telegramUser: TelegramUser) => {
                                        setTelegramLoading(true)
                                        setTelegramError(null)
                                        const result = await authenticateTelegramLoginWidget(telegramUser)
                                        if (result.success) {
                                            requestCloseAnimated()
                                        } else {
                                            setTelegramError(result.error || 'Ошибка авторизации')
                                        }
                                        setTelegramLoading(false)
                                    }}
                                />
                            </div>
                        )}
                    </div>
                </div>
            )}
        </div>
    )

    return createPortal(rootLayer, document.body)
}
