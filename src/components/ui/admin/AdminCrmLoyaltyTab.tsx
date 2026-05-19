'use client'

import { useCallback, useState } from 'react'
import { ArrowPathIcon } from '@heroicons/react/24/outline'
import { isAxiosError } from 'axios'
import { CrmApi } from '@/api/CrmApi'
import {
    type CrmLoyalty,
    formatExpPoints,
    loyaltySourceLabel,
} from '@/api/LoyaltyApi'
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

type Props = {
    accountId: string
    loyalty: CrmLoyalty | null
    onLoyaltyUpdated: (loyalty: CrmLoyalty) => void
    onError: (message: string | null) => void
}

export default function AdminCrmLoyaltyTab({ accountId, loyalty, onLoyaltyUpdated, onError }: Props) {
    const [refreshing, setRefreshing] = useState(false)
    const [adjustDelta, setAdjustDelta] = useState('')
    const [adjustReason, setAdjustReason] = useState('')
    const [adjustBusy, setAdjustBusy] = useState(false)

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

    if (!loyalty) {
        return (
            <div className="space-y-4">
                <p className="text-white/50 text-sm">Данные лояльности не загружены.</p>
                <button
                    type="button"
                    disabled={refreshing || !accountId}
                    onClick={() => void refreshLoyalty()}
                    className="rounded border border-[var(--mint-bright)] bg-[var(--mint-bright)]/15 px-3 py-1.5 text-sm font-semibold text-[var(--mint-bright)] disabled:opacity-40"
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

    return (
        <div className="space-y-6">
            <div className="grid w-full grid-cols-[minmax(0,1fr)_minmax(0,1fr)_minmax(0,1fr)_auto] items-stretch gap-1.5">
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
                <div className="flex min-h-0 items-stretch justify-self-stretch">
                    <button
                        type="button"
                        disabled={refreshing}
                        onClick={() => void refreshLoyalty()}
                        aria-busy={refreshing}
                        aria-label="Обновить данные лояльности"
                        title="Обновить"
                        className="flex aspect-square h-full w-auto items-center justify-center rounded border border-white/20 hover:border-white/35 disabled:cursor-wait disabled:opacity-70"
                        style={{ color: levelTheme.labelColor }}
                    >
                        <ArrowPathIcon
                            className={`h-3.5 w-3.5 shrink-0 ${refreshing ? 'animate-spin' : ''}`}
                            aria-hidden
                        />
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
                        className="rounded border border-[var(--mint-bright)] bg-transparent px-4 py-2 text-sm font-semibold text-[var(--mint-bright)] transition-colors hover:bg-[var(--mint-bright)]/10 disabled:opacity-40"
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
