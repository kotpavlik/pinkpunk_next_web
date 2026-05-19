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
import { listenForWebOtpSms, normalizeSmsOtpCode } from '@/utils/smsOtpAutofill'
import {
    userNeedsPersonalName,
    validatePersonalNameField,
    personalNameFieldsSchema,
} from '@/utils/personalNameValidation'
import * as yup from 'yup'

interface TelegramLoginModalProps {
    isOpen: boolean
    onClose: () => void
    botName?: string
}

const DRAWER_TRANSITION_MS = 320
const SMS_CODE_LEN = 4
type AuthPhase = 'phone' | 'code' | 'intro'

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
    const [phase, setPhase] = useState<AuthPhase>('phone')
    const [personalFirstName, setPersonalFirstName] = useState('')
    const [personalLastName, setPersonalLastName] = useState('')
    const [nameErrors, setNameErrors] = useState<{
        personalFirstName?: string
        personalLastName?: string
    }>({})
    const [nameSaving, setNameSaving] = useState(false)
    const [cooldown, setCooldown] = useState(0)
    const closingRef = useRef(false)
    const closeTimeoutRef = useRef<number | null>(null)
    /** Одно поле для автоподстановки кода из SMS (iOS / Android). */
    const otpCaptureRef = useRef<HTMLInputElement | null>(null)

    const {
        authenticateTelegramLoginWidget,
        requestPhoneAuthCode,
        verifyPhoneAuth,
        updateContactInfo,
        user,
        isAuthenticated,
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
            setPersonalFirstName('')
            setPersonalLastName('')
            setNameErrors({})
            setNameSaving(false)
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

    const introPhaseLocked = phase === 'intro'

    const requestCloseAnimated = useCallback((force = false) => {
        if (!force && introPhaseLocked) return
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
    }, [isOpen, onClose, introPhaseLocked])

    useEffect(() => {
        const handleEscape = (e: KeyboardEvent) => {
            if (e.key !== 'Escape' || !isOpen) return
            if (introPhaseLocked) {
                e.preventDefault()
                return
            }
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
    }, [isOpen, telegramModalOpen, requestCloseAnimated, introPhaseLocked])

    const handleRequestCode = useCallback(async () => {
        setError(null)
        if (cooldown > 0) return

        if (phase === 'code') {
            setCode('')
            queueMicrotask(() => otpCaptureRef.current?.focus())
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
            const profile = useUserStore.getState().user
            if (userNeedsPersonalName(profile)) {
                setPhase('intro')
                setPersonalFirstName(profile.personalFirstName?.trim() ?? '')
                setPersonalLastName(profile.personalLastName?.trim() ?? '')
                setNameErrors({})
                setError(null)
            } else {
                requestCloseAnimated()
            }
        } else {
            setError(result.error || 'Ошибка входа')
        }
    }, [phoneNational, code, verifyPhoneAuth, requestCloseAnimated])

    const handlePersonalFirstNameChange = useCallback(async (value: string) => {
        setPersonalFirstName(value)
        const err = await validatePersonalNameField('personalFirstName', value)
        setNameErrors((prev) => ({ ...prev, personalFirstName: err }))
    }, [])

    const handlePersonalLastNameChange = useCallback(async (value: string) => {
        setPersonalLastName(value)
        const err = await validatePersonalNameField('personalLastName', value)
        setNameErrors((prev) => ({ ...prev, personalLastName: err }))
    }, [])

    const handleSavePersonalName = useCallback(async () => {
        setError(null)
        const first = personalFirstName.trim()
        const last = personalLastName.trim()

        try {
            await personalNameFieldsSchema.validate(
                { personalFirstName: first, personalLastName: last },
                { abortEarly: false },
            )
            setNameErrors({})
        } catch (err) {
            if (err instanceof yup.ValidationError) {
                const next: { personalFirstName?: string; personalLastName?: string } = {}
                for (const inner of err.inner) {
                    if (inner.path === 'personalFirstName' || inner.path === 'personalLastName') {
                        next[inner.path] = inner.message
                    }
                }
                setNameErrors(next)
            }
            return
        }

        setNameSaving(true)
        const result = await updateContactInfo({
            personalFirstName: first,
            personalLastName: last,
        })
        setNameSaving(false)

        if (result.success) {
            requestCloseAnimated(true)
        } else {
            setError(result.error || 'Не удалось сохранить имя')
        }
    }, [personalFirstName, personalLastName, updateContactInfo, requestCloseAnimated])

    const busyGlobal = status === 'loading'

    const sessionActive = isAuthenticated()
    const canLinkTelegram =
        sessionActive && Boolean(user._id?.trim()) && (user.telegramUserId == null || user.telegramUserId === undefined)

    const phoneDisplay = formatBelarusPhoneDisplay(phoneNational)
    const phoneReady = isBelarusMobileComplete(phoneNational)

    const handlePhoneKeyDown = useCallback((e: ReactKeyboardEvent<HTMLInputElement>) => {
        if (e.ctrlKey || e.metaKey || e.altKey) return

        if (e.key === 'Enter') {
            e.preventDefault()
            if (phoneReady && !phoneSending && !busyGlobal && cooldown === 0) {
                void handleRequestCode()
            }
            return
        }

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
        ]
        if (allowNav.includes(e.key)) return
        if (/^\d$/.test(e.key)) return
        e.preventDefault()
    }, [phoneReady, phoneSending, busyGlobal, cooldown, handleRequestCode])

    const applySmsCode = useCallback((raw: string) => {
        setCode(normalizeSmsOtpCode(raw, SMS_CODE_LEN))
    }, [])

    const handleOtpCaptureChange = useCallback(
        (e: React.ChangeEvent<HTMLInputElement>) => {
            applySmsCode(e.target.value)
        },
        [applySmsCode],
    )

    const handleOtpCapturePaste = useCallback(
        (e: ReactClipboardEvent<HTMLInputElement>) => {
            e.preventDefault()
            applySmsCode(e.clipboardData.getData('text'))
        },
        [applySmsCode],
    )

    const handleOtpCaptureKeyDown = useCallback(
        (e: ReactKeyboardEvent<HTMLInputElement>) => {
            if (e.key === 'Enter') {
                e.preventDefault()
                if (!verifyLoading && !busyGlobal && code.length === SMS_CODE_LEN) {
                    void handleVerify()
                }
            }
        },
        [code.length, verifyLoading, busyGlobal, handleVerify],
    )

    useEffect(() => {
        if (!isOpen || phase !== 'code') return
        const t = window.setTimeout(() => otpCaptureRef.current?.focus(), 80)
        return () => window.clearTimeout(t)
    }, [isOpen, phase])

    /** WebOTP: Android Chrome, если SMS содержит `@домен #код` (см. документацию бэкенда). */
    useEffect(() => {
        if (!isOpen || phase !== 'code') return
        const ac = new AbortController()
        listenForWebOtpSms((raw) => applySmsCode(raw), ac.signal)
        return () => ac.abort()
    }, [isOpen, phase, applySmsCode])

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
                onClick={() => {
                    if (!introPhaseLocked) requestCloseAnimated()
                }}
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
                {!introPhaseLocked && (
                    <div className="flex shrink-0 items-center justify-end border-b border-white/[0.06] px-4 py-3">
                        <button
                            type="button"
                            onClick={() => requestCloseAnimated()}
                            className="flex h-9 w-9 items-center justify-center rounded-full text-white/45 transition hover:bg-white/[0.06] hover:text-white"
                            aria-label="Закрыть"
                        >
                            <svg className="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                            </svg>
                        </button>
                    </div>
                )}

                <div className="min-h-0 flex-1 overflow-y-auto px-5 pb-6 pt-6 sm:px-8">
                    <header className="mb-8">
                        {phase === 'intro' ? (
                            <>
                                <h2
                                    id="auth-drawer-title"
                                    className="text-base font-extrabold leading-snug text-white sm:text-lg"
                                >
                                    Познакомимся? Имя и фамилия нужны, чтобы мы не гадали, кто этот
                                    стильный человек!
                                </h2>
                            </>
                        ) : (
                            <>
                                <h2
                                    id="auth-drawer-title"
                                    className="text-base font-extrabold uppercase tracking-[0.18em] text-white sm:text-lg"
                                >
                                    Вход / регистрация
                                </h2>
                                <p className="mt-3 max-w-md text-xs leading-relaxed text-white/50 sm:text-sm">
                                    Получите доступ к эксклюзивным преимуществам учетной записи
                                    <br />
                                    PINK PUNK™
                                </p>
                            </>
                        )}
                    </header>

                    {error && (
                        <div className="mb-4 rounded-lg border border-red-500/25 bg-red-500/10 px-3 py-3">
                            <p className="text-center text-sm text-red-200/90">{error}</p>
                        </div>
                    )}

                    {phase === 'phone' && (
                        <form
                            className="space-y-4"
                            onSubmit={(e) => {
                                e.preventDefault()
                                if (phoneSending || busyGlobal || cooldown > 0 || !phoneReady) return
                                void handleRequestCode()
                            }}
                        >
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
                                type="submit"
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
                        </form>
                    )}

                    {phase === 'code' && (
                        <form
                            className="space-y-4"
                            onSubmit={(e) => {
                                e.preventDefault()
                                if (verifyLoading || busyGlobal || code.length !== SMS_CODE_LEN) return
                                void handleVerify()
                            }}
                        >
                            <p className="text-center text-sm text-white/55">
                                Код отправлен на{' '}
                                <span className="font-medium text-white">{phoneDisplay.trim()}</span>
                            </p>
                            <div className="block">
                                <span className="mb-2 block text-sm text-white/55" id="sms-code-label">
                                    Код из SMS (4 цифры)
                                </span>
                                <p className="mb-3 text-center text-xs text-white/40">
                                    Нажмите на поле — телефон может предложить код из сообщения
                                </p>
                                <div
                                    role="group"
                                    aria-labelledby="sms-code-label"
                                    className="relative mx-auto flex w-fit justify-center gap-2 sm:gap-3"
                                    onClick={() => otpCaptureRef.current?.focus()}
                                >
                                    <input
                                        ref={otpCaptureRef}
                                        type="text"
                                        inputMode="numeric"
                                        autoComplete="one-time-code"
                                        name="one-time-code"
                                        enterKeyHint="done"
                                        autoCapitalize="off"
                                        autoCorrect="off"
                                        spellCheck={false}
                                        maxLength={SMS_CODE_LEN}
                                        value={code}
                                        disabled={verifyLoading || busyGlobal}
                                        onChange={handleOtpCaptureChange}
                                        onKeyDown={handleOtpCaptureKeyDown}
                                        onPaste={handleOtpCapturePaste}
                                        className="absolute inset-0 z-10 h-full w-full cursor-text opacity-[0.02] caret-transparent"
                                        aria-label="Код из SMS"
                                    />
                                    {Array.from({ length: SMS_CODE_LEN }, (_, i) => (
                                        <div
                                            key={i}
                                            aria-hidden
                                            className={`pointer-events-none flex h-12 w-11 shrink-0 items-center justify-center rounded-xl border bg-white/[0.06] text-center text-xl font-semibold tabular-nums text-white sm:h-14 sm:w-12 sm:text-2xl ${
                                                code[i] ? 'border-[#12c998]/50' : 'border-white/15'
                                            }`}
                                        >
                                            {code[i] ?? ''}
                                        </div>
                                    ))}
                                </div>
                            </div>
                            <button
                                type="submit"
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
                        </form>
                    )}

                    {phase === 'intro' && (
                        <form
                            className="space-y-4"
                            onSubmit={(e) => {
                                e.preventDefault()
                                if (nameSaving || busyGlobal) return
                                void handleSavePersonalName()
                            }}
                        >
                            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                                <label className="block">
                                    <span className="mb-1.5 block text-sm text-white/55">Имя</span>
                                    <input
                                        type="text"
                                        autoComplete="given-name"
                                        value={personalFirstName}
                                        onChange={(e) => void handlePersonalFirstNameChange(e.target.value)}
                                        disabled={nameSaving || busyGlobal}
                                        className={`w-full rounded-xl border bg-white/[0.06] px-4 py-3 text-white placeholder-white/30 focus:border-[#12c998]/80 focus:outline-none focus:ring-1 focus:ring-[#12c998]/40 ${
                                            nameErrors.personalFirstName
                                                ? 'border-[#ff2b9c]/80'
                                                : 'border-white/15'
                                        }`}
                                        placeholder="Имя"
                                    />
                                    {nameErrors.personalFirstName && (
                                        <p className="mt-1.5 text-xs text-[#ff8ec4]">
                                            {nameErrors.personalFirstName}
                                        </p>
                                    )}
                                </label>
                                <label className="block">
                                    <span className="mb-1.5 block text-sm text-white/55">Фамилия</span>
                                    <input
                                        type="text"
                                        autoComplete="family-name"
                                        value={personalLastName}
                                        onChange={(e) => void handlePersonalLastNameChange(e.target.value)}
                                        disabled={nameSaving || busyGlobal}
                                        className={`w-full rounded-xl border bg-white/[0.06] px-4 py-3 text-white placeholder-white/30 focus:border-[#12c998]/80 focus:outline-none focus:ring-1 focus:ring-[#12c998]/40 ${
                                            nameErrors.personalLastName
                                                ? 'border-[#ff2b9c]/80'
                                                : 'border-white/15'
                                        }`}
                                        placeholder="Фамилия"
                                    />
                                    {nameErrors.personalLastName && (
                                        <p className="mt-1.5 text-xs text-[#ff8ec4]">
                                            {nameErrors.personalLastName}
                                        </p>
                                    )}
                                </label>
                            </div>
                            <button
                                type="submit"
                                disabled={
                                    nameSaving ||
                                    busyGlobal ||
                                    !personalFirstName.trim() ||
                                    !personalLastName.trim() ||
                                    Boolean(nameErrors.personalFirstName) ||
                                    Boolean(nameErrors.personalLastName)
                                }
                                className="w-full rounded-xl bg-[#ff2b9c] px-4 py-3 font-semibold text-white transition hover:bg-[#e02488] disabled:pointer-events-none disabled:opacity-45"
                            >
                                {nameSaving || busyGlobal ? 'Сохранение…' : 'Продолжить'}
                            </button>
                        </form>
                    )}

                    {phase !== 'intro' && (
                        <div className="mt-12 border-t border-white/[0.06] pt-6">
                            <p className="text-center text-[11px] leading-snug text-white/35">
                                Продолжая, вы принимаете условия сервиса.
                            </p>
                        </div>
                    )}

                    {!telegramModalOpen && phase !== 'intro' && (
                        <div className="mt-6">
                            <button
                                type="button"
                                onClick={(e) => {
                                    e.stopPropagation()
                                    setTelegramModalOpen(true)
                                }}
                                className="mx-auto grid w-full max-w-md grid-cols-[minmax(0,1fr)_5.5rem] grid-rows-1 overflow-hidden rounded-xl border border-white/15 bg-white/[0.06] text-left font-semibold text-white shadow-none transition hover:border-white/22 hover:bg-white/[0.09] active:opacity-95 sm:grid-cols-[minmax(0,1fr)_6.75rem]"
                                aria-label={
                                    canLinkTelegram
                                        ? 'Привязать Telegram к аккаунту'
                                        : 'Войти с помощью Telegram'
                                }
                            >
                                <div className="flex min-h-[5.5rem] min-w-0 flex-col justify-center py-3 pl-4 pr-2 sm:min-h-[6.75rem] sm:pr-3">
                                    <p className="text-sm font-semibold uppercase leading-snug tracking-wide text-white sm:text-base">
                                        {canLinkTelegram
                                            ? 'Привязать Telegram'
                                            : 'Войти с помощью Telegram'}
                                    </p>
                                    {canLinkTelegram && (
                                        <p className="mt-1 text-[11px] font-normal normal-case leading-snug text-white/45">
                                            Один аккаунт с номером телефона
                                        </p>
                                    )}
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
                            <p className="mt-2 text-xs text-white/45">
                                {canLinkTelegram
                                    ? 'Telegram будет привязан к текущему аккаунту с телефоном.'
                                    : 'Подтвердите вход через бота ниже.'}
                            </p>
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
