'use client'

import { useCallback, useEffect, useState, type KeyboardEvent } from 'react'
import { createPortal } from 'react-dom'
import { XMarkIcon } from '@heroicons/react/24/outline'
import * as yup from 'yup'
import type { UserType } from '@/zustand/user_store/UserStore'
import { useUserStore } from '@/zustand/user_store/UserStore'
import Loader from '@/components/ui/shared/Loader'
import {
    belarusPhoneE164,
    formatBelarusPhoneDisplay,
    isBelarusMobileComplete,
    parseBelarusNationalInput,
    phoneNationalFromStored,
    shouldPreventBelarusPhoneKeyDown,
    validateBelarusPhoneNational,
} from '@/utils/belarusPhone'
import {
    personalNameFieldsSchema,
    validatePersonalNameField,
} from '@/utils/personalNameValidation'
import {
    normalizeTelegramUsernameInput,
    telegramUsernameSchema,
    validateTelegramUsernameField,
} from '@/utils/telegramUsernameValidation'

const profileIdentitySchema = personalNameFieldsSchema.shape({
    username: telegramUsernameSchema,
})

type Props = {
    isOpen: boolean
    onClose: () => void
    user: UserType
}

type FormErrors = {
    personalFirstName?: string
    personalLastName?: string
    username?: string
    userPhoneNumber?: string
    form?: string
}

function resolveInitialFirstName(user: UserType): string {
    return user.personalFirstName?.trim() || user.firstName?.trim() || ''
}

function resolveInitialLastName(user: UserType): string {
    return user.personalLastName?.trim() || user.lastName?.trim() || ''
}

export default function ProfileIdentityEditModal({ isOpen, onClose, user }: Props) {
    const updateContactInfo = useUserStore((state) => state.updateContactInfo)
    const [mounted, setMounted] = useState(false)
    const [personalFirstName, setPersonalFirstName] = useState('')
    const [personalLastName, setPersonalLastName] = useState('')
    const [username, setUsername] = useState('')
    const [phoneNational, setPhoneNational] = useState('')
    const [errors, setErrors] = useState<FormErrors>({})
    const [saving, setSaving] = useState(false)

    useEffect(() => {
        setMounted(true)
    }, [])

    useEffect(() => {
        if (!isOpen) return
        setPersonalFirstName(resolveInitialFirstName(user))
        setPersonalLastName(resolveInitialLastName(user))
        setUsername(user.username?.trim() ?? '')
        setPhoneNational(phoneNationalFromStored(user.userPhoneNumber))
        setErrors({})
    }, [isOpen, user])

    const handlePersonalFirstNameChange = useCallback(async (value: string) => {
        setPersonalFirstName(value)
        const err = await validatePersonalNameField('personalFirstName', value)
        setErrors((prev) => ({ ...prev, personalFirstName: err }))
    }, [])

    const handlePersonalLastNameChange = useCallback(async (value: string) => {
        setPersonalLastName(value)
        const err = await validatePersonalNameField('personalLastName', value)
        setErrors((prev) => ({ ...prev, personalLastName: err }))
    }, [])

    const handleUsernameChange = useCallback(async (value: string) => {
        setUsername(value)
        const err = await validateTelegramUsernameField(value)
        setErrors((prev) => ({ ...prev, username: err }))
    }, [])

    const handlePhoneChange = useCallback((value: string) => {
        const nextNational = parseBelarusNationalInput(value)
        setPhoneNational(nextNational)
        setErrors((prev) => ({ ...prev, userPhoneNumber: validateBelarusPhoneNational(nextNational) }))
    }, [])

    const handlePhoneKeyDown = useCallback((e: KeyboardEvent<HTMLInputElement>) => {
        if (shouldPreventBelarusPhoneKeyDown(e.key, e)) {
            e.preventDefault()
        }
    }, [])

    const handleSubmit = useCallback(async () => {
        const first = personalFirstName.trim()
        const last = personalLastName.trim()
        const normalizedUsername = normalizeTelegramUsernameInput(username)
        const phoneError = validateBelarusPhoneNational(phoneNational)
        const phoneE164 = belarusPhoneE164(phoneNational)
        const nextErrors: FormErrors = {}

        if (phoneError) {
            nextErrors.userPhoneNumber = phoneError
        }

        try {
            await profileIdentitySchema.validate(
                {
                    personalFirstName: first,
                    personalLastName: last,
                    username: normalizedUsername,
                },
                { abortEarly: false },
            )
        } catch (err) {
            if (err instanceof yup.ValidationError) {
                for (const inner of err.inner) {
                    if (
                        inner.path === 'personalFirstName' ||
                        inner.path === 'personalLastName' ||
                        inner.path === 'username'
                    ) {
                        nextErrors[inner.path as keyof FormErrors] = inner.message
                    }
                }
            }
        }

        if (Object.keys(nextErrors).length > 0 || !phoneE164) {
            setErrors(nextErrors)
            return
        }

        setErrors({})
        setSaving(true)
        const result = await updateContactInfo({
            personalFirstName: first,
            personalLastName: last,
            username: normalizedUsername,
            userPhoneNumber: phoneE164,
        })
        setSaving(false)

        if (result.success) {
            onClose()
            return
        }

        setErrors((prev) => ({ ...prev, form: result.error ?? 'Не удалось сохранить' }))
    }, [onClose, personalFirstName, personalLastName, phoneNational, updateContactInfo, username])

    const phoneDisplay = formatBelarusPhoneDisplay(phoneNational)
    const phoneReady = isBelarusMobileComplete(phoneNational)

    if (!mounted || !isOpen) {
        return null
    }

    const modalContent = (
        <div
            className="fixed inset-0 z-[10003] flex items-center justify-center bg-black/60 backdrop-blur-md px-4"
            onClick={(e) => {
                if (e.target === e.currentTarget && !saving) {
                    onClose()
                }
            }}
        >
            <div
                className="relative w-full max-w-md overflow-hidden rounded-3xl border border-white/20 bg-[#0a0a0b]/95 shadow-2xl backdrop-blur-2xl"
                onClick={(e) => e.stopPropagation()}
                role="dialog"
                aria-modal="true"
                aria-labelledby="profile-identity-edit-title"
            >
                {saving && (
                    <div className="absolute inset-0 z-10 flex items-center justify-center rounded-3xl bg-black/60 backdrop-blur-sm">
                        <Loader fullScreen showText />
                    </div>
                )}

                <button
                    type="button"
                    onClick={onClose}
                    disabled={saving}
                    className="absolute right-4 top-4 z-20 text-white/70 transition-colors hover:text-white disabled:opacity-40"
                    aria-label="Закрыть"
                >
                    <XMarkIcon className="h-6 w-6" />
                </button>

                <div className="p-6 pt-8">
                    <h2
                        id="profile-identity-edit-title"
                        className="mb-1 font-durik text-2xl font-bold text-[var(--pink-punk)]"
                    >
                        Профиль
                    </h2>
                    <p className="mb-6 text-sm text-white/55">
                        Имя, фамилия, номер телефона и Telegram username
                    </p>

                    <form
                        className="space-y-4"
                        onSubmit={(e) => {
                            e.preventDefault()
                            if (saving) return
                            void handleSubmit()
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
                                    disabled={saving}
                                    className={`w-full rounded-xl border bg-white/[0.06] px-4 py-3 text-white placeholder-white/30 focus:border-[#12c998]/80 focus:outline-none focus:ring-1 focus:ring-[#12c998]/40 ${errors.personalFirstName ? 'border-[#ff2b9c]/80' : 'border-white/15'
                                        }`}
                                    placeholder="Имя"
                                />
                                {errors.personalFirstName && (
                                    <p className="mt-1.5 text-xs text-[#ff8ec4]">{errors.personalFirstName}</p>
                                )}
                            </label>
                            <label className="block">
                                <span className="mb-1.5 block text-sm text-white/55">Фамилия</span>
                                <input
                                    type="text"
                                    autoComplete="family-name"
                                    value={personalLastName}
                                    onChange={(e) => void handlePersonalLastNameChange(e.target.value)}
                                    disabled={saving}
                                    className={`w-full rounded-xl border bg-white/[0.06] px-4 py-3 text-white placeholder-white/30 focus:border-[#12c998]/80 focus:outline-none focus:ring-1 focus:ring-[#12c998]/40 ${errors.personalLastName ? 'border-[#ff2b9c]/80' : 'border-white/15'
                                        }`}
                                    placeholder="Фамилия"
                                />
                                {errors.personalLastName && (
                                    <p className="mt-1.5 text-xs text-[#ff8ec4]">{errors.personalLastName}</p>
                                )}
                            </label>
                        </div>

                        <label className="block">
                            <span className="mb-1.5 block text-sm text-white/55">Номер телефона</span>
                            <input
                                type="tel"
                                inputMode="numeric"
                                autoComplete="tel"
                                spellCheck={false}
                                value={phoneDisplay}
                                onChange={(e) => handlePhoneChange(e.target.value)}
                                onKeyDown={handlePhoneKeyDown}
                                onFocus={(e) => {
                                    if (phoneNational.length === 0) {
                                        requestAnimationFrame(() => {
                                            const len = e.target.value.length
                                            e.target.setSelectionRange(len, len)
                                        })
                                    }
                                }}
                                disabled={saving}
                                placeholder="+375 XX XXX XX XX"
                                className={`w-full rounded-xl border bg-white/[0.06] px-4 py-3 text-white tabular-nums placeholder-white/30 focus:border-[#12c998]/80 focus:outline-none focus:ring-1 focus:ring-[#12c998]/40 ${errors.userPhoneNumber ? 'border-[#ff2b9c]/80' : 'border-white/15'
                                    }`}
                            />
                            {errors.userPhoneNumber && (
                                <p className="mt-1.5 text-xs text-[#ff8ec4]">{errors.userPhoneNumber}</p>
                            )}
                        </label>

                        <label className="block">
                            <span className="mb-1.5 block text-sm text-white/55">Telegram username</span>
                            <div className="relative">
                                <span className="pointer-events-none absolute left-4 top-1/2 -translate-y-1/2 text-white/45">
                                    @
                                </span>
                                <input
                                    type="text"
                                    autoComplete="username"
                                    value={username}
                                    onChange={(e) => void handleUsernameChange(e.target.value)}
                                    disabled={saving}
                                    className={`w-full rounded-xl border bg-white/[0.06] py-3 pl-8 pr-4 text-white placeholder-white/30 focus:border-[#12c998]/80 focus:outline-none focus:ring-1 focus:ring-[#12c998]/40 ${errors.username ? 'border-[#ff2b9c]/80' : 'border-white/15'
                                        }`}
                                    placeholder="username"
                                />
                            </div>
                            {errors.username && (
                                <p className="mt-1.5 text-xs text-[#ff8ec4]">{errors.username}</p>
                            )}
                        </label>

                        {errors.form && (
                            <p className="text-sm text-[#ff8ec4]">{errors.form}</p>
                        )}

                        <button
                            type="submit"
                            disabled={
                                saving ||
                                !personalFirstName.trim() ||
                                !personalLastName.trim() ||
                                !phoneReady ||
                                Boolean(errors.personalFirstName) ||
                                Boolean(errors.personalLastName) ||
                                Boolean(errors.username) ||
                                Boolean(errors.userPhoneNumber)
                            }
                            className="w-full rounded-xl bg-[#ff2b9c] px-4 py-3 font-semibold text-white transition hover:bg-[#e02488] disabled:pointer-events-none disabled:opacity-45"
                        >
                            {saving ? 'Сохранение…' : 'Сохранить'}
                        </button>
                    </form>
                </div>
            </div>
        </div>
    )

    return createPortal(modalContent, document.body)
}
