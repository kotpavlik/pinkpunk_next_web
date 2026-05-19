'use client'

import { useCallback, useState } from 'react'
import { isAxiosError } from 'axios'
import { CrmApi } from '@/api/CrmApi'
import {
    type CrmLoyalty,
    formatExpPoints,
    loyaltySourceLabel,
} from '@/api/LoyaltyApi'

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

    return (
        <div className="space-y-6">
            <div className="flex flex-wrap items-start justify-between gap-3">
                <div className="bg-[#252525] border border-[#333] p-4 flex-1 min-w-[200px]">
                    <p className="text-white/45 text-xs uppercase tracking-wide mb-1">Уровень</p>
                    <p className="text-[var(--mint-bright)] text-2xl font-bold">{loyalty.level.label}</p>
                    <p className="text-white/50 text-xs mt-1 font-mono">{loyalty.level.id}</p>
                </div>
                <div className="bg-[#252525] border border-[#333] p-4 flex-1 min-w-[200px]">
                    <p className="text-white/45 text-xs uppercase tracking-wide mb-1">Баланс</p>
                    <p className="text-white text-2xl font-bold tabular-nums">
                        {formatExpPoints(loyalty.expPoints)} <span className="text-sm font-normal text-white/50">pts</span>
                    </p>
                </div>
                <button
                    type="button"
                    disabled={refreshing}
                    onClick={() => void refreshLoyalty()}
                    className="rounded border border-white/20 px-3 py-2 text-sm text-white/70 hover:text-white disabled:opacity-40 self-start"
                >
                    {refreshing ? '…' : 'Обновить'}
                </button>
            </div>

            {!isMaxLevel && (
                <div className="bg-[#252525] border border-[#333] p-4 space-y-2">
                    <div className="h-2 rounded-full bg-white/10 overflow-hidden">
                        <div
                            className="h-full bg-[var(--mint-bright)] transition-all"
                            style={{ width: `${Math.min(100, Math.max(0, progress))}%` }}
                        />
                    </div>
                    <p className="text-white/60 text-xs">
                        До {loyalty.nextLevel?.label}:{' '}
                        <span className="text-white tabular-nums">
                            {loyalty.pointsToNextLevel != null
                                ? formatExpPoints(loyalty.pointsToNextLevel)
                                : '—'}{' '}
                            pts
                        </span>
                        {loyalty.progressPercent != null && ` (${Math.round(progress)}%)`}
                    </p>
                </div>
            )}

            {isMaxLevel && (
                <p className="text-[var(--mint-bright)] text-sm">Максимальный уровень (Legend).</p>
            )}

            <div className="bg-[#252525] border border-[#333] p-4 space-y-3">
                <h3 className="text-white font-semibold text-sm">Ручное начисление / списание</h3>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    <label className="block text-xs text-white/50">
                        delta (+ начислить, − списать)
                        <input
                            type="number"
                            step={1}
                            value={adjustDelta}
                            onChange={e => setAdjustDelta(e.target.value)}
                            placeholder="500 или -200"
                            className="mt-1 w-full rounded border border-[#444] bg-[#1a1a1a] px-2 py-1.5 text-white text-sm"
                            disabled={adjustBusy}
                        />
                    </label>
                    <label className="block text-xs text-white/50 sm:col-span-2">
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
                <button
                    type="button"
                    disabled={adjustBusy}
                    onClick={() => void handleAdjust()}
                    className="rounded border border-[var(--pink-punk)] bg-[var(--pink-punk)]/20 px-4 py-2 text-sm font-semibold text-[var(--pink-punk)] disabled:opacity-40"
                >
                    {adjustBusy ? 'Сохранение…' : 'Применить'}
                </button>
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
