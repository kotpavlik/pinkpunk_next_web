'use client'

import { useCallback, useEffect, useState } from 'react'
import type { AxiosError } from 'axios'
import {
    CrmApi,
    type CrmListUser,
    type CrmMergeAccountsResponse,
    type CrmMergeFieldSource,
    type CrmMergePreviewAccount,
    type CrmMergePreviewResponse,
    type CrmMergeProfilePick,
} from '@/api/CrmApi'
import { crmUserDisplayName } from '@/utils/crmUserDisplayName'
import { accountObjectIdFromCrmListRow } from '@/utils/mongoObjectId'

const PROFILE_FIELDS = [
    { pickKey: 'firstNameFrom' as const, valueKey: 'firstName' as const, label: 'Имя (firstName)' },
    { pickKey: 'lastNameFrom' as const, valueKey: 'lastName' as const, label: 'Фамилия (lastName)' },
    { pickKey: 'usernameFrom' as const, valueKey: 'username' as const, label: 'Username' },
    { pickKey: 'personalFirstNameFrom' as const, valueKey: 'personalFirstName' as const, label: 'Личное имя' },
    { pickKey: 'personalLastNameFrom' as const, valueKey: 'personalLastName' as const, label: 'Личная фамилия' },
] satisfies ReadonlyArray<{
    pickKey: keyof CrmMergeProfilePick
    valueKey: keyof CrmMergePreviewAccount
    label: string
}>

function formatCrmMergeError(err: unknown): string {
    if (err && typeof err === 'object' && 'response' in err) {
        const ax = err as AxiosError<{ message?: string | string[]; error?: string }>
        const status = ax.response?.status
        const d = ax.response?.data
        let msg = ''
        if (d && typeof d === 'object') {
            const m = d.message
            if (Array.isArray(m)) msg = m.join(', ')
            else if (typeof m === 'string') msg = m
            if (!msg && typeof d.error === 'string') msg = d.error
        }
        if (status === 409) {
            return msg || 'Нельзя объединить эти аккаунты (конфликт или уже слит).'
        }
        if (status === 403) {
            return msg || 'Слияние запрещено (например, аккаунт владельца).'
        }
        if (status === 400) {
            return msg || 'Некорректные данные для слияния.'
        }
        const tail = msg || ax.message || ''
        return status ? `${status} — ${tail}` : tail || 'Не удалось выполнить слияние'
    }
    return err instanceof Error ? err.message : 'Не удалось выполнить слияние'
}

function previewLabel(side: CrmMergePreviewAccount, fallbackUser: CrmListUser): string {
    const name = [side.firstName, side.lastName].filter(Boolean).join(' ').trim()
    if (name) return name
    if (side.username) return `@${side.username}`
    return crmUserDisplayName(fallbackUser)
}

function displayFieldValue(side: CrmMergePreviewAccount, valueKey: keyof CrmMergePreviewAccount): string {
    const raw = side[valueKey]
    if (typeof raw === 'string' && raw.trim()) return raw.trim()
    if (typeof raw === 'number') return String(raw)
    return '—'
}

function profilePickFromSuggested(
    suggested?: CrmMergePreviewResponse['suggestedDefaults'],
): CrmMergeProfilePick {
    const fallback: CrmMergeFieldSource = 'keep'
    return {
        firstNameFrom: suggested?.firstNameFrom ?? fallback,
        lastNameFrom: suggested?.lastNameFrom ?? fallback,
        usernameFrom: suggested?.usernameFrom ?? fallback,
        personalFirstNameFrom: suggested?.personalFirstNameFrom ?? fallback,
        personalLastNameFrom: suggested?.personalLastNameFrom ?? fallback,
    }
}

function PreviewColumn({
    title,
    accent,
    side,
    fallbackUser,
}: {
    title: string
    accent: 'keep' | 'merge'
    side: CrmMergePreviewAccount
    fallbackUser: CrmListUser
}) {
    const border =
        accent === 'keep'
            ? 'border-emerald-400/80 shadow-[0_0_20px_rgba(52,211,153,0.35)]'
            : 'border-[var(--pink-punk)]/90 shadow-[0_0_20px_rgba(255,43,156,0.35)]'
    const badge =
        accent === 'keep'
            ? 'bg-emerald-500/20 text-emerald-200 border-emerald-400/50'
            : 'bg-[var(--pink-punk)]/20 text-pink-100 border-[var(--pink-punk)]/50'

    return (
        <div className={`rounded-lg border-2 p-3 ${border}`}>
            <span
                className={`inline-block mb-2 px-2 py-0.5 text-[10px] font-bold uppercase tracking-wide border rounded ${badge}`}
            >
                {title}
            </span>
            <p className="text-sm font-semibold text-white break-words">{previewLabel(side, fallbackUser)}</p>
            <dl className="mt-2 space-y-1 text-[11px] text-white/65">
                <div>
                    <dt className="inline text-white/45">accountId: </dt>
                    <dd className="inline font-mono text-white/80 break-all">{side.accountId}</dd>
                </div>
                {side.userPhoneNumber ? (
                    <div>
                        <dt className="inline text-white/45">Телефон: </dt>
                        <dd className="inline">{side.userPhoneNumber}</dd>
                    </div>
                ) : null}
                {side.telegramUserId != null ? (
                    <div>
                        <dt className="inline text-white/45">Telegram ID: </dt>
                        <dd className="inline tabular-nums">{side.telegramUserId}</dd>
                    </div>
                ) : null}
                <div>
                    <dt className="inline text-white/45">Очки: </dt>
                    <dd className="inline tabular-nums font-medium text-white/90">{side.expPoints ?? 0}</dd>
                </div>
                <div>
                    <dt className="inline text-white/45">Заказы: </dt>
                    <dd className="inline tabular-nums">{side.ordersCount ?? 0}</dd>
                </div>
                <div>
                    <dt className="inline text-white/45">Офлайн: </dt>
                    <dd className="inline tabular-nums">{side.offlinePurchasesCount ?? 0}</dd>
                </div>
            </dl>
            <p className="mt-2 text-[10px] text-white/40">
                {side.hasPhoneRegistration ? 'SMS-регистрация' : ''}
                {side.hasPhoneRegistration && side.hasTelegram ? ' · ' : ''}
                {side.hasTelegram ? 'Telegram' : ''}
                {!side.hasPhoneRegistration && !side.hasTelegram ? '—' : ''}
            </p>
        </div>
    )
}

function SourceToggle({
    source,
    selected,
    accent,
    value,
    onSelect,
    disabled,
}: {
    source: CrmMergeFieldSource
    selected: boolean
    accent: 'keep' | 'merge'
    value: string
    onSelect: () => void
    disabled?: boolean
}) {
    const label = source === 'keep' ? 'Основной' : 'Второст.'
    const active =
        accent === 'keep'
            ? 'border-emerald-400/90 bg-emerald-500/15 text-emerald-100 ring-1 ring-emerald-400/50'
            : 'border-[var(--pink-punk)]/90 bg-[var(--pink-punk)]/15 text-pink-100 ring-1 ring-[var(--pink-punk)]/50'
    const idle = 'border-white/15 bg-white/5 text-white/55 hover:bg-white/10 hover:text-white/80'

    return (
        <button
            type="button"
            disabled={disabled}
            onClick={onSelect}
            className={`flex min-w-0 flex-1 flex-col items-start gap-0.5 rounded-md border px-2 py-1.5 text-left transition-all disabled:opacity-40 ${
                selected ? active : idle
            }`}
        >
            <span className="text-[9px] font-bold uppercase tracking-wide opacity-80">{label}</span>
            <span className="w-full truncate text-xs font-medium">{value}</span>
        </button>
    )
}

function ProfileFieldPickers({
    preview,
    profilePick,
    onChange,
    disabled,
}: {
    preview: CrmMergePreviewResponse
    profilePick: CrmMergeProfilePick
    onChange: (next: CrmMergeProfilePick) => void
    disabled?: boolean
}) {
    return (
        <div className="mb-4 space-y-3">
            <div className="flex flex-wrap items-center justify-between gap-2">
                <p className="text-xs font-semibold uppercase tracking-wide text-white/50">
                    Поля профиля — откуда взять
                </p>
            </div>
            <ul className="space-y-2.5">
                {PROFILE_FIELDS.map(({ pickKey, valueKey, label }) => {
                    const selected = profilePick[pickKey] ?? 'keep'
                    const keepVal = displayFieldValue(preview.keep, valueKey)
                    const mergeVal = displayFieldValue(preview.merge, valueKey)
                    return (
                        <li key={pickKey} className="rounded-lg border border-white/10 bg-white/[0.04] p-2.5">
                            <p className="mb-1.5 text-[11px] font-medium text-white/70">{label}</p>
                            <div className="flex gap-2">
                                <SourceToggle
                                    source="keep"
                                    selected={selected === 'keep'}
                                    accent="keep"
                                    value={keepVal}
                                    disabled={disabled}
                                    onSelect={() => onChange({ ...profilePick, [pickKey]: 'keep' })}
                                />
                                <SourceToggle
                                    source="merge"
                                    selected={selected === 'merge'}
                                    accent="merge"
                                    value={mergeVal}
                                    disabled={disabled}
                                    onSelect={() => onChange({ ...profilePick, [pickKey]: 'merge' })}
                                />
                            </div>
                        </li>
                    )
                })}
            </ul>
            <p className="text-[10px] leading-relaxed text-white/40">
                Телефон и Telegram подставляет сервер: телефон — с SMS-аккаунта, Telegram — с аккаунта, где есть
                привязка. Заказы, офлайн и корзина объединяются на основной; очки суммируются.
            </p>
        </div>
    )
}

type Props = {
    keepUser: CrmListUser
    mergeUser: CrmListUser
    onCancel: () => void
    onSuccess: (result: CrmMergeAccountsResponse) => void
}

export default function AdminCrmMergeModal({ keepUser, mergeUser, onCancel, onSuccess }: Props) {
    const keepAccountId = accountObjectIdFromCrmListRow(keepUser) ?? ''
    const mergeAccountId = accountObjectIdFromCrmListRow(mergeUser) ?? ''

    const [preview, setPreview] = useState<CrmMergePreviewResponse | null>(null)
    const [profilePick, setProfilePick] = useState<CrmMergeProfilePick>(() => profilePickFromSuggested())
    const [previewLoading, setPreviewLoading] = useState(true)
    const [previewError, setPreviewError] = useState<string | null>(null)
    const [merging, setMerging] = useState(false)
    const [mergeError, setMergeError] = useState<string | null>(null)
    const [mergeResult, setMergeResult] = useState<CrmMergeAccountsResponse | null>(null)

    const loadPreview = useCallback(async () => {
        if (!keepAccountId || !mergeAccountId) {
            setPreviewError('Нет валидного accountId для слияния')
            setPreviewLoading(false)
            return
        }
        try {
            setPreviewLoading(true)
            setPreviewError(null)
            const data = await CrmApi.getMergePreview(keepAccountId, mergeAccountId)
            setPreview(data)
            setProfilePick(profilePickFromSuggested(data.suggestedDefaults))
        } catch (e) {
            setPreview(null)
            setPreviewError(formatCrmMergeError(e))
        } finally {
            setPreviewLoading(false)
        }
    }, [keepAccountId, mergeAccountId])

    useEffect(() => {
        void loadPreview()
    }, [loadPreview])

    const applySuggestedDefaults = () => {
        if (preview) {
            setProfilePick(profilePickFromSuggested(preview.suggestedDefaults))
        }
    }

    const handleMerge = async (withProfilePick: boolean) => {
        if (!keepAccountId || !mergeAccountId || previewLoading || previewError) return
        try {
            setMerging(true)
            setMergeError(null)
            const res = await CrmApi.mergeAccounts(keepAccountId, {
                mergeAccountId,
                confirm: true,
                ...(withProfilePick ? { profilePick } : {}),
            })
            setMergeResult(res)
            onSuccess(res)
        } catch (e) {
            setMergeError(formatCrmMergeError(e))
        } finally {
            setMerging(false)
        }
    }

    const success = mergeResult != null
    const summary = mergeResult?.summary

    return (
        <div
            className="fixed inset-0 z-[115] flex items-end sm:items-center justify-center bg-black/60 backdrop-blur-md p-4 sm:p-6"
            role="dialog"
            aria-modal="true"
            aria-labelledby="crm-merge-title"
            onClick={(e) => {
                if (e.target === e.currentTarget && !merging) {
                    onCancel()
                }
            }}
        >
            <div className="relative w-full max-w-2xl max-h-[min(92dvh,800px)] overflow-y-auto bg-white/5 backdrop-blur-md border border-white/10 rounded-lg p-5 sm:p-6 shadow-2xl">
                <h3 id="crm-merge-title" className="text-white font-semibold text-lg font-durik mb-1">
                    {success ? 'Аккаунты объединены' : 'Слияние аккаунтов'}
                </h3>
                <p className="text-xs text-white/50 mb-4">
                    Основной остаётся в CRM; второстепенный архивируется. Очки суммируются; бонусы скидки сбрасываются.
                </p>

                {success && summary ? (
                    <div className="space-y-3">
                        <p className="text-sm text-white/80">
                            Объединение завершено. Основной:{' '}
                            <span className="font-mono text-emerald-300/95 text-xs break-all">
                                {mergeResult.keepAccountId}
                            </span>
                        </p>
                        <ul className="text-xs text-emerald-100/90 bg-emerald-950/35 border border-emerald-500/30 rounded p-3 space-y-1 list-disc list-inside">
                            {summary.ordersReassigned != null && (
                                <li>Заказов перенесено: {summary.ordersReassigned}</li>
                            )}
                            {summary.offlinePurchasesTotal != null && (
                                <li>Офлайн-строк: {summary.offlinePurchasesTotal}</li>
                            )}
                            {summary.cartsMerged != null && <li>Корзин объединено: {summary.cartsMerged}</li>}
                            {summary.expPointsTotal != null && (
                                <li>Очков после слияния: {summary.expPointsTotal}</li>
                            )}
                        </ul>
                        <button
                            type="button"
                            onClick={onCancel}
                            className="w-full sm:w-auto sm:ml-auto sm:block px-4 py-2.5 rounded-md bg-[var(--mint-bright)] text-black text-sm font-semibold hover:opacity-90"
                        >
                            Закрыть
                        </button>
                    </div>
                ) : (
                    <>
                        {previewLoading ? (
                            <p className="text-sm text-white/60 py-6 text-center">Загрузка превью…</p>
                        ) : previewError ? (
                            <p className="text-sm text-red-300/90 bg-red-950/40 border border-red-500/30 p-3 rounded mb-4">
                                {previewError}
                            </p>
                        ) : preview ? (
                            <>
                                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 mb-4">
                                    <PreviewColumn
                                        title="Основной (остаётся)"
                                        accent="keep"
                                        side={preview.keep}
                                        fallbackUser={keepUser}
                                    />
                                    <PreviewColumn
                                        title="Второстепенный (будет слит)"
                                        accent="merge"
                                        side={preview.merge}
                                        fallbackUser={mergeUser}
                                    />
                                </div>
                                <ProfileFieldPickers
                                    preview={preview}
                                    profilePick={profilePick}
                                    onChange={setProfilePick}
                                    disabled={merging}
                                />
                                {preview.suggestedDefaults && (
                                    <button
                                        type="button"
                                        disabled={merging}
                                        onClick={applySuggestedDefaults}
                                        className="mb-4 text-xs text-[var(--mint-bright)] hover:underline disabled:opacity-50"
                                    >
                                        Сбросить к рекомендации сервера
                                    </button>
                                )}
                            </>
                        ) : null}

                        {mergeError && <p className="text-sm text-red-300/90 mb-3">{mergeError}</p>}

                        <div className="flex flex-col gap-2 sm:flex-row sm:flex-wrap sm:justify-end">
                            <button
                                type="button"
                                disabled={merging}
                                onClick={onCancel}
                                className="px-4 py-2.5 rounded-md border border-white/20 text-white/80 text-sm hover:bg-white/10 disabled:opacity-50 sm:mr-auto"
                            >
                                Отмена
                            </button>
                            <button
                                type="button"
                                disabled={merging || previewLoading || !!previewError || !preview}
                                onClick={() => void handleMerge(false)}
                                className="px-4 py-2.5 rounded-md border border-white/25 text-white/85 text-sm hover:bg-white/10 disabled:opacity-50"
                                title="Имя и username — по правилам бэкенда без вашего выбора"
                            >
                                {merging ? '…' : 'Автовыбор полей'}
                            </button>
                            <button
                                type="button"
                                disabled={merging || previewLoading || !!previewError || !preview}
                                onClick={() => void handleMerge(true)}
                                className="px-4 py-2.5 rounded-md bg-[var(--mint-bright)] text-black text-sm font-semibold hover:opacity-90 disabled:opacity-50"
                            >
                                {merging ? 'Слияние…' : 'Слить с выбранными полями'}
                            </button>
                        </div>
                    </>
                )}
            </div>
        </div>
    )
}
