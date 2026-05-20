'use client'

import { useCallback, useState } from 'react'
import { ArrowPathIcon } from '@heroicons/react/24/outline'
import { isAxiosError } from 'axios'
import { CrmApi } from '@/api/CrmApi'
import {
    type CrmLoyalty,
    type CrmSetDiscountBody,
    formatExpPoints,
    loyaltySourceLabel,
    resolveEffectiveDiscountPercent,
} from '@/api/LoyaltyApi'
import {
    fixedDiscountPercentColor,
    fixedDiscountPercentForColor,
    resolveLoyaltyDiscountColor,
} from '@/utils/fixedDiscountPercentColor'
import { getLevelTheme } from '@/utils/loyaltyLevelTheme'

function fmtDt(iso?: string) {
    if (!iso) return '—'
    try {
        return new Date(iso).toLocaleString('ru-RU', {
            day: '2-digit',
            month: '2-digit',
            year: 'numeric',
            hour: '2-digit',
            minute: '2-digit',
        })
    } catch {
        return iso
    }
}

type DiscountFormMode = 'level_linked_total' | 'level_linked_bonus' | 'fixed' | 'clear'

type Props = {
    accountId: string
    loyalty: CrmLoyalty | null
    onLoyaltyUpdated: (loyalty: CrmLoyalty) => void
    onError: (message: string | null) => void
}

function parsePercentInput(raw: string): number | null {
    const n = Number(raw.trim().replace(',', '.'))
    if (Number.isNaN(n) || !Number.isFinite(n)) return null
    return n
}

export default function AdminCrmLoyaltyTab({ accountId, loyalty, onLoyaltyUpdated, onError }: Props) {
    const [refreshing, setRefreshing] = useState(false)
    const [adjustDelta, setAdjustDelta] = useState('')
    const [adjustReason, setAdjustReason] = useState('')
    const [adjustBusy, setAdjustBusy] = useState(false)
    const [discountMode, setDiscountMode] = useState<DiscountFormMode>('level_linked_bonus')
    const [discountValue, setDiscountValue] = useState('')
    const [discountValueError, setDiscountValueError] = useState<string | null>(null)
    const [discountBusy, setDiscountBusy] = useState(false)

    const discountNeedsValue = discountMode !== 'clear'
    const discountValueEmpty = discountValue.trim().length === 0

    const refreshLoyalty = useCallback(async () => {
        if (!accountId) return
        setRefreshing(true)
        onError(null)
        try {
            const data = await CrmApi.getUserLoyalty(accountId)
            onLoyaltyUpdated(data)
        } catch (e) {
            const msg = isAxiosError(e)
                ? String(e.response?.data?.message ?? e.message)
                : 'Не удалось загрузить loyalty'
            onError(msg)
        } finally {
            setRefreshing(false)
        }
    }, [accountId, onLoyaltyUpdated, onError])

    const handleAdjust = async () => {
        onError(null)
        const deltaRaw = adjustDelta.trim()
        const reason = adjustReason.trim()
        if (!deltaRaw) {
            onError('Укажите delta (целое число, не 0).')
            return
        }
        if (!reason) {
            onError('Укажите reason — комментарий к операции.')
            return
        }
        const delta = parseInt(deltaRaw, 10)
        if (Number.isNaN(delta) || delta === 0) {
            onError('delta должно быть целым числом, не равным 0.')
            return
        }
        if (reason.length > 500) {
            onError('reason — не более 500 символов.')
            return
        }

        setAdjustBusy(true)
        try {
            const updated = await CrmApi.adjustLoyalty(accountId, { delta, reason })
            onLoyaltyUpdated(updated)
            setAdjustDelta('')
            setAdjustReason('')
        } catch (e) {
            const msg = isAxiosError(e)
                ? String(e.response?.data?.message ?? e.message)
                : 'Не удалось изменить очки'
            onError(msg)
        } finally {
            setAdjustBusy(false)
        }
    }

    const handleDiscountApplyClick = () => {
        if (discountNeedsValue && discountValueEmpty) {
            setDiscountValueError('Ты не ввел скидку')
            return
        }
        setDiscountValueError(null)
        void handleDiscountApply()
    }

    const handleDiscountApply = async () => {
        onError(null)
        let body: CrmSetDiscountBody

        if (discountMode === 'clear') {
            body = { mode: 'clear' }
        } else if (discountMode === 'fixed') {
            const fixedPercent = parsePercentInput(discountValue)
            if (fixedPercent === null || fixedPercent < 0 || fixedPercent > 100) {
                onError('Фиксированная скидка: укажите число от 0 до 100.')
                return
            }
            body = { mode: 'fixed', fixedPercent }
        } else if (discountMode === 'level_linked_total') {
            const percent = parsePercentInput(discountValue)
            if (percent === null || percent < 0 || percent > 100) {
                onError('Итоговая скидка: укажите число от 0 до 100.')
                return
            }
            body = { mode: 'level_linked', percent }
        } else {
            const bonusDelta = parseInt(discountValue.trim(), 10)
            if (Number.isNaN(bonusDelta)) {
                onError('Бонус: укажите целое число процентных пунктов (например 2 или -1).')
                return
            }
            body = { mode: 'level_linked', bonusDelta }
        }

        setDiscountBusy(true)
        try {
            const updated = await CrmApi.setUserDiscount(accountId, body)
            onLoyaltyUpdated(updated)
            if (discountMode !== 'clear') {
                setDiscountValue('')
            }
        } catch (e) {
            const msg = isAxiosError(e)
                ? String(e.response?.data?.message ?? e.message)
                : 'Не удалось изменить скидку'
            onError(msg)
        } finally {
            setDiscountBusy(false)
        }
    }

    if (!loyalty) {
        return (
            <div className="space-y-4">
                <p className="text-white/50 text-sm">Данные лояльности не загружены.</p>
                <button
                    type="button"
                    disabled={refreshing || !accountId}
                    onClick={() => void refreshLoyalty()}
                    className="rounded border border-[var(--mint-bright)] bg-[var(--mint-bright)]/15 px-5 py-3 text-base font-semibold text-[var(--mint-bright)] disabled:opacity-40"
                >
                    {refreshing ? 'Загрузка…' : 'Загрузить loyalty'}
                </button>
            </div>
        )
    }

    const isMaxLevel = loyalty.nextLevel == null
    const progress = loyalty.progressPercent ?? 0
    const levelTheme = getLevelTheme(loyalty.level.id)
    const progressClamped = Math.min(100, Math.max(0, progress))
    const effectiveDiscount = resolveEffectiveDiscountPercent(loyalty)
    const discount = loyalty.discount
    const discountColor = resolveLoyaltyDiscountColor(loyalty)
    const fixedPercent = fixedDiscountPercentForColor(loyalty)

    return (
        <div className="space-y-6">
            <div className="grid w-full grid-cols-[repeat(4,minmax(0,1fr))_auto] items-stretch gap-1.5">
                <div className="min-w-0 bg-[#252525] border border-[#333] px-2 py-1.5">
                    <p className="text-white/45 text-[10px] uppercase tracking-wide leading-none mb-0.5">
                        Уровень
                    </p>
                    <p className="text-sm font-bold leading-tight" style={{ color: levelTheme.labelColor }}>
                        {loyalty.level.label}
                        <span className="ml-1 text-[9px] font-normal text-white/40 font-mono">
                            {loyalty.level.id}
                        </span>
                    </p>
                </div>
                <div className="min-w-0 bg-[#252525] border border-[#333] px-2 py-1.5">
                    <p className="text-white/45 text-[10px] uppercase tracking-wide leading-none mb-0.5">
                        Баланс
                    </p>
                    <p className="text-sm font-bold tabular-nums leading-tight text-white">
                        {formatExpPoints(loyalty.expPoints)}
                        <span className="ml-0.5 text-[9px] font-normal text-white/50">pts</span>
                    </p>
                </div>
                <div className="min-w-0 bg-[#252525] border border-[#333] px-2 py-1.5">
                    <p className="text-white/45 text-[10px] uppercase tracking-wide leading-none mb-0.5">
                        {isMaxLevel ? 'Следующий уровень' : `До ${loyalty.nextLevel?.label}`}
                    </p>
                    {isMaxLevel ? (
                        <p
                            className="text-[10px] font-semibold leading-tight"
                            style={{ color: levelTheme.labelColor }}
                        >
                            Максимальный уровень
                        </p>
                    ) : (
                        <>
                            <div
                                className="mb-0.5 h-1 w-full overflow-hidden rounded-full"
                                style={{
                                    backgroundColor: `color-mix(in srgb, ${levelTheme.labelColor} 22%, var(--loyalty-progress-track))`,
                                }}
                            >
                                <div
                                    className="h-full rounded-full transition-[width] duration-300"
                                    style={{
                                        width: `${progressClamped}%`,
                                        backgroundColor: levelTheme.labelColor,
                                        boxShadow: levelTheme.glow,
                                    }}
                                />
                            </div>
                            <p className="text-[10px] leading-tight text-white/60 tabular-nums">
                                <span style={{ color: levelTheme.labelColor }}>
                                    {loyalty.pointsToNextLevel != null
                                        ? formatExpPoints(loyalty.pointsToNextLevel)
                                        : '—'}{' '}
                                    pts
                                </span>
                                {loyalty.progressPercent != null && (
                                    <span className="text-white/45"> · {Math.round(progressClamped)}%</span>
                                )}
                            </p>
                        </>
                    )}
                </div>
                <div className="min-w-0 bg-[#252525] border border-[#333] px-2 py-1.5">
                    <p className="text-white/45 text-[10px] uppercase tracking-wide leading-none mb-0.5">
                        Скидка
                    </p>
                    <p className="text-sm font-bold tabular-nums leading-tight" style={{ color: discountColor }}>
                        {effectiveDiscount}%
                        {discount?.adminDiscountIsFixed && (
                            <span className="ml-1 text-[9px] font-normal text-white/50">фикс</span>
                        )}
                    </p>
                </div>
                <div className="flex min-h-0 items-stretch justify-self-stretch">
                    <button
                        type="button"
                        disabled={refreshing}
                        onClick={() => void refreshLoyalty()}
                        aria-busy={refreshing}
                        aria-label="Обновить данные лояльности"
                        title="Обновить"
                        className="flex aspect-square h-full min-w-[2.75rem] w-auto items-center justify-center rounded border border-white/20 hover:border-white/35 disabled:cursor-wait disabled:opacity-70"
                        style={{ color: levelTheme.labelColor }}
                    >
                        <ArrowPathIcon
                            className={`h-5 w-5 shrink-0 ${refreshing ? 'animate-spin' : ''}`}
                            aria-hidden
                        />
                    </button>
                </div>
            </div>

            <div className="bg-[#252525] border border-[#333] p-4 space-y-3">
                <h3 className="text-white font-semibold text-sm">Персональная скидка</h3>
                <div className="grid grid-cols-2 gap-2 sm:grid-cols-4 text-xs">
                    <div className="rounded border border-[#444] bg-[#1a1a1a] px-2 py-1.5">
                        <p className="text-white/45 text-[10px] uppercase">Итого</p>
                        <p className="font-bold tabular-nums" style={{ color: discountColor }}>
                            {effectiveDiscount}%
                        </p>
                    </div>
                    <div className="rounded border border-[#444] bg-[#1a1a1a] px-2 py-1.5">
                        <p className="text-white/45 text-[10px] uppercase">От уровня</p>
                        <p
                            className="font-semibold tabular-nums"
                            style={{ color: levelTheme.labelColor }}
                        >
                            {discount?.levelDiscountPercent ?? '—'}%
                        </p>
                    </div>
                    <div className="rounded border border-[#444] bg-[#1a1a1a] px-2 py-1.5">
                        <p className="text-white/45 text-[10px] uppercase">Бонус админа</p>
                        <p className="font-semibold tabular-nums text-white">
                            {discount?.adminBonusPercent ?? 0}%
                        </p>
                    </div>
                    <div className="rounded border border-[#444] bg-[#1a1a1a] px-2 py-1.5">
                        <p className="text-white/45 text-[10px] uppercase">Режим</p>
                        <p className="font-semibold text-white leading-tight">
                            {discount?.adminDiscountIsFixed ? (
                                <>
                                    Фикс{' '}
                                    <span
                                        className="tabular-nums"
                                        style={{ color: fixedDiscountPercentColor(fixedPercent) }}
                                    >
                                        {discount.adminFixedDiscountPercent ?? effectiveDiscount}%
                                    </span>
                                </>
                            ) : (
                                'Уровень + бонус'
                            )}
                        </p>
                    </div>
                </div>
                {discount?.adminDiscountIsFixed && (
                    <p className="text-[11px] text-amber-200/80 leading-relaxed">
                        Фиксированная скидка активна — скидка уровня и бонус поверх уровня не применяются.
                    </p>
                )}

                <div className="space-y-2">
                    <p className="text-white/50 text-xs">Изменить скидку</p>
                    <div className="flex flex-wrap gap-2.5">
                        {(
                            [
                                ['level_linked_total', 'Итог % (уровень + бонус)'],
                                ['level_linked_bonus', '+ п.п. к бонусу'],
                                ['fixed', 'Фиксированная %'],
                                ['clear', 'Сбросить админскую'],
                            ] as const
                        ).map(([mode, label]) => (
                            <button
                                key={mode}
                                type="button"
                                onClick={() => {
                                    setDiscountMode(mode)
                                    setDiscountValueError(null)
                                }}
                                className={`rounded border px-4 py-2.5 text-sm font-medium transition-colors ${
                                    discountMode === mode
                                        ? 'border-[var(--mint-bright)] bg-[var(--mint-bright)]/15 text-[var(--mint-bright)]'
                                        : 'border-[#444] text-white/60 hover:border-white/30'
                                }`}
                            >
                                {label}
                            </button>
                        ))}
                    </div>
                    {discountMode !== 'clear' && (
                        <label className="block w-full max-w-xs text-xs text-white/50">
                            {discountMode === 'level_linked_total' && 'Итоговая скидка, %'}
                            {discountMode === 'level_linked_bonus' && 'Изменение бонуса, п.п. (например 2)'}
                            {discountMode === 'fixed' && 'Фиксированная скидка, %'}
                            <div className="relative mt-1 pb-5">
                                <input
                                    type="text"
                                    inputMode="decimal"
                                    value={discountValue}
                                    onChange={e => {
                                        setDiscountValue(e.target.value)
                                        if (discountValueError) setDiscountValueError(null)
                                    }}
                                    onWheel={e => e.currentTarget.blur()}
                                    placeholder={
                                        discountMode === 'level_linked_bonus' ? '2' : '15'
                                    }
                                    className={`w-full rounded border bg-[#1a1a1a] px-2 py-1.5 text-white text-sm ${
                                        discountValueError
                                            ? 'border-red-400/80 focus:border-red-400'
                                            : 'border-[#444]'
                                    }`}
                                    disabled={discountBusy}
                                    aria-invalid={discountValueError != null}
                                    aria-describedby="discount-value-error"
                                />
                                <p
                                    id="discount-value-error"
                                    role="alert"
                                    className={`absolute left-0 top-full mt-1 text-xs leading-snug text-red-300/95 ${
                                        discountValueError ? 'visible' : 'invisible'
                                    }`}
                                >
                                    {discountValueError ?? ''}
                                </p>
                            </div>
                        </label>
                    )}
                    {discountMode === 'clear' && (
                        <p className="text-[11px] text-white/45">
                            Останется только скидка от уровня (если есть).
                        </p>
                    )}
                </div>
                <div className="flex justify-end">
                    <button
                        type="button"
                        disabled={discountBusy}
                        onClick={handleDiscountApplyClick}
                        className={`rounded border border-[var(--mint-bright)] bg-transparent px-6 py-3 text-base font-semibold text-[var(--mint-bright)] transition-colors hover:bg-[var(--mint-bright)]/10 disabled:pointer-events-none disabled:opacity-40 ${
                            discountNeedsValue && discountValueEmpty && !discountBusy
                                ? 'opacity-40 cursor-not-allowed hover:bg-transparent'
                                : ''
                        }`}
                    >
                        {discountBusy ? 'Сохранение…' : 'Применить скидку'}
                    </button>
                </div>
            </div>

            <div className="bg-[#252525] border border-[#333] p-4 space-y-3">
                <h3 className="text-white font-semibold text-sm">Ручное начисление / списание</h3>
                <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
                    <label className="block w-full min-w-0 text-xs text-white/50">
                        delta (+ начислить, − списать)
                        <input
                            type="number"
                            step={1}
                            value={adjustDelta}
                            onChange={e => setAdjustDelta(e.target.value)}
                            onWheel={e => e.currentTarget.blur()}
                            placeholder="500 или -200"
                            className="mt-1 w-full rounded border border-[#444] bg-[#1a1a1a] px-2 py-1.5 text-white text-sm [appearance:textfield] [&::-webkit-inner-spin-button]:appearance-none [&::-webkit-outer-spin-button]:appearance-none"
                            disabled={adjustBusy}
                        />
                    </label>
                    <label className="block w-full min-w-0 text-xs text-white/50">
                        reason (обязательно)
                        <input
                            type="text"
                            value={adjustReason}
                            onChange={e => setAdjustReason(e.target.value)}
                            placeholder="Участие в конкурсе"
                            maxLength={500}
                            className="mt-1 w-full rounded border border-[#444] bg-[#1a1a1a] px-2 py-1.5 text-white text-sm"
                            disabled={adjustBusy}
                        />
                    </label>
                </div>
                <div className="flex justify-end">
                    <button
                        type="button"
                        disabled={adjustBusy}
                        onClick={() => void handleAdjust()}
                        className="rounded border border-[var(--mint-bright)] bg-transparent px-6 py-3 text-base font-semibold text-[var(--mint-bright)] transition-colors hover:bg-[var(--mint-bright)]/10 disabled:opacity-40"
                    >
                        {adjustBusy ? 'Сохранение…' : 'Применить'}
                    </button>
                </div>
            </div>

            <div>
                <h3 className="text-white font-semibold text-sm mb-2">
                    Журнал операций ({loyalty.history.length})
                </h3>
                {loyalty.history.length === 0 ? (
                    <p className="text-white/40 text-sm">Записей пока нет.</p>
                ) : (
                    <div className="overflow-x-auto">
                        <table className="w-full text-xs text-left border-collapse">
                            <thead>
                                <tr className="text-white/45 border-b border-[#444]">
                                    <th className="py-2 pr-2 font-normal">Дата</th>
                                    <th className="py-2 pr-2 font-normal">Δ</th>
                                    <th className="py-2 pr-2 font-normal">Тип</th>
                                    <th className="py-2 pr-2 font-normal">Комментарий</th>
                                    <th className="py-2 pr-2 font-normal">Кто</th>
                                    <th className="py-2 font-normal text-right">Баланс</th>
                                </tr>
                            </thead>
                            <tbody>
                                {loyalty.history.map(row => (
                                    <tr key={row._id} className="border-b border-[#333]/80 align-top">
                                        <td className="py-2 pr-2 text-white/70 whitespace-nowrap">
                                            {fmtDt(row.createdAt)}
                                        </td>
                                        <td
                                            className={`py-2 pr-2 font-semibold tabular-nums whitespace-nowrap ${
                                                row.delta >= 0 ? 'text-emerald-400' : 'text-red-400'
                                            }`}
                                        >
                                            {row.delta >= 0 ? '+' : ''}
                                            {formatExpPoints(row.delta)}
                                        </td>
                                        <td className="py-2 pr-2 text-white/80">
                                            {loyaltySourceLabel(row.source)}
                                        </td>
                                        <td className="py-2 pr-2 text-white/70 max-w-[200px] break-words">
                                            {row.reason?.trim() || '—'}
                                        </td>
                                        <td className="py-2 pr-2 text-white/50 font-mono text-[10px] max-w-[120px] truncate">
                                            {row.createdBy ?? '—'}
                                        </td>
                                        <td className="py-2 text-right text-white/90 tabular-nums">
                                            {formatExpPoints(row.balanceAfter)}
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                )}
            </div>
        </div>
    )
}
