'use client'

import { useCallback, useEffect, useMemo, useState, type KeyboardEvent, type MouseEvent } from 'react'
import { createPortal } from 'react-dom'
import type { AxiosError } from 'axios'
import { ShieldCheckIcon, ShoppingBagIcon, SparklesIcon } from '@heroicons/react/24/solid'
import { CheckIcon, ClipboardDocumentIcon, TrashIcon } from '@heroicons/react/24/outline'
import { CrmApi, type CrmListUser, type DeleteUserCascadeStats } from '@/api/CrmApi'
import { useAppStore } from '@/zustand/app_store/AppStore'
import AdminCrmUserDetailModal from '@/components/ui/admin/AdminCrmUserDetailModal'
import { tokenManager } from '@/utils/TokenManager'
import { accountObjectIdFromCrmListRow } from '@/utils/mongoObjectId'
import { crmUserDisplayName } from '@/utils/crmUserDisplayName'
import { formatExpPoints, type LoyaltyStatus } from '@/api/LoyaltyApi'
import { getLevelTheme, getLoyaltyLevelBorderStyle } from '@/utils/loyaltyLevelTheme'

function formatCrmLoadError(err: unknown): string {
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
        if (status === 401) {
            return `401 — ${msg || 'Неверный или просроченный токен, либо нет активной админ-сессии для этого устройства (нужен успешный POST /auth/admin-login с тем же deviceId).'}`
        }
        if (status === 403) {
            return `403 — ${msg || 'Доступ запрещён (роль админа в JWT).'}`
        }
        if (status === 404) {
            return (
                '404 — ' +
                (msg ||
                    'Ресурс не найден. Если на бэкенде глобальный префикс (например v1), добавьте в .env.local строку NEXT_PUBLIC_CRM_PREFIX=v1')
            )
        }
        const tail = msg || ax.message || ''
        return status ? `${status} — ${tail}` : tail || 'Ошибка сети'
    }
    return err instanceof Error ? err.message : 'Не удалось загрузить CRM'
}

function formatDeleteUserError(err: unknown): string {
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
        if (status === 403) {
            return msg || 'Нельзя удалить аккаунт владельца'
        }
        if (status === 400) {
            return msg || 'Пользователь не найден'
        }
        if (status === 401) {
            return msg || 'Нет доступа. Войдите в админку заново.'
        }
        const tail = msg || ax.message || ''
        return status ? `${status} — ${tail}` : tail || 'Не удалось удалить пользователя'
    }
    return err instanceof Error ? err.message : 'Не удалось удалить пользователя'
}

/** Telegram id владельцев — на бэкенде DELETE вернёт 403 */
const PROTECTED_OWNER_TELEGRAM_IDS = new Set([6399340874, 412971440])

function isProtectedOwnerUser(u: CrmListUser): boolean {
    const tg = u.telegramUserId ?? u.userId
    return tg != null && PROTECTED_OWNER_TELEGRAM_IDS.has(tg)
}

function displayNameForUser(u: CrmListUser): string {
    const title = crmUserDisplayName(u)
    if (title !== '—') return title
    const phone = phoneFromRow(u)
    if (phone) return phone
    return u._id
}

type OrdersSort =
    | 'none'
    | 'online_sum_desc'
    | 'offline_sum_desc'
    | 'total_orders_desc'
    | 'total_orders_asc'
    | 'total_sum_desc'
    | 'total_sum_asc'

function statSortTileClass(active: boolean, accent: 'mint' | 'amber'): string {
    const base =
        'flex flex-col justify-between gap-1.5 bg-white/10 backdrop-blur-sm border p-3 text-left w-full transition-all cursor-pointer hover:bg-white/15 focus:outline-none focus-visible:ring-2'
    if (!active) return `${base} border-white/20`
    return accent === 'mint'
        ? `${base} border-[var(--mint-bright)] ring-1 ring-[var(--mint-bright)]/50`
        : `${base} border-amber-400/90 ring-1 ring-amber-400/40`
}

function onlineOrdersCount(u: CrmListUser): number {
    return u.stats?.ordersTotal ?? 0
}

function onlineOrdersSum(u: CrmListUser): number {
    return u.stats?.totalSpent ?? 0
}

function offlineOrdersCount(u: CrmListUser): number {
    return u.offlinePurchasesSummary?.linesCount ?? 0
}

function offlineOrdersSum(u: CrmListUser): number {
    return u.offlinePurchasesSummary?.totalAmount ?? 0
}

function totalOrdersCount(u: CrmListUser): number {
    return onlineOrdersCount(u) + offlineOrdersCount(u)
}

function totalOrdersSum(u: CrmListUser): number {
    return onlineOrdersSum(u) + offlineOrdersSum(u)
}

function phoneFromRow(u: CrmListUser): string {
    return (
        u.userPhoneNumber?.trim() ||
        u.userPhoneNormalized?.trim() ||
        u.shippingAddress?.phone?.trim() ||
        ''
    )
}

/** Превью корзины из CRM: непустая, если есть позиции по сводке или в массиве items */
function hasItemsInCart(u: CrmListUser): boolean {
    const c = u.cart
    if (!c) return false
    if ((c.totalItems ?? 0) > 0) return true
    if (c.items && c.items.length > 0) return true
    return false
}

function formatCascadeSummary(c: DeleteUserCascadeStats): string {
    const parts: string[] = []
    if (c.ordersDeleted > 0) parts.push(`заказов удалено: ${c.ordersDeleted}`)
    if (c.ordersAnonymized > 0) parts.push(`заказов анонимизировано: ${c.ordersAnonymized}`)
    if (c.cartsDeleted > 0) parts.push(`корзин удалено: ${c.cartsDeleted}`)
    return parts.length > 0 ? parts.join(' · ') : 'дополнительных изменений не было'
}

function CrmDeleteUserConfirmModal({
    user,
    isDeleting,
    error,
    cascadeResult,
    onCancel,
    onConfirm,
    onCloseAfterSuccess,
}: {
    user: CrmListUser
    isDeleting: boolean
    error: string | null
    cascadeResult: DeleteUserCascadeStats | null
    onCancel: () => void
    onConfirm: () => void
    onCloseAfterSuccess: () => void
}) {
    const label = displayNameForUser(user)
    const accountId = accountObjectIdFromCrmListRow(user)
    const success = cascadeResult != null

    return (
        <div
            className="fixed inset-0 z-[110] flex items-end sm:items-center justify-center bg-black/60 backdrop-blur-md p-4 sm:p-6"
            role="dialog"
            aria-modal="true"
            aria-labelledby="crm-delete-user-title"
            onClick={(e) => {
                if (e.target === e.currentTarget && !isDeleting) {
                    success ? onCloseAfterSuccess() : onCancel()
                }
            }}
        >
            <div className="relative w-full max-w-md max-h-[min(90dvh,640px)] overflow-y-auto bg-white/5 backdrop-blur-md border border-white/10 rounded-lg p-5 sm:p-6 shadow-2xl">
                <h3
                    id="crm-delete-user-title"
                    className="text-white font-semibold text-lg sm:text-xl font-durik mb-3"
                >
                    {success ? 'Пользователь удалён' : 'Удаление пользователя'}
                </h3>

                {success && cascadeResult ? (
                    <>
                        <p className="text-white/80 text-sm sm:text-base mb-3">
                            <span className="text-[var(--mint-bright)] font-semibold break-words">{label}</span>{' '}
                            удалён из CRM вместе со связанными данными.
                        </p>
                        <div className="text-sm text-emerald-200/95 bg-emerald-950/35 border border-emerald-500/30 rounded p-3 mb-4 space-y-1.5">
                            <p className="font-medium">Результат каскада:</p>
                            <ul className="list-disc list-inside text-emerald-100/90 text-xs sm:text-sm space-y-1">
                                <li>Заказов удалено: {cascadeResult.ordersDeleted}</li>
                                <li>
                                    Заказов анонимизировано (оплачено / завершено):{' '}
                                    {cascadeResult.ordersAnonymized}
                                </li>
                                <li>Корзин удалено: {cascadeResult.cartsDeleted}</li>
                            </ul>
                            <p className="text-emerald-100/70 text-[10px] sm:text-xs pt-1">
                                {formatCascadeSummary(cascadeResult)}
                            </p>
                        </div>
                        <button
                            type="button"
                            onClick={onCloseAfterSuccess}
                            className="w-full sm:w-auto sm:ml-auto sm:block px-4 py-2.5 rounded-md bg-[var(--mint-bright)] text-black text-sm font-semibold hover:opacity-90 transition-opacity"
                        >
                            Закрыть
                        </button>
                    </>
                ) : (
                    <>
                        <p className="text-white/80 text-sm sm:text-base mb-2">
                            Вы точно хотите удалить пользователя{' '}
                            <span className="text-[var(--mint-bright)] font-semibold break-words">{label}</span>?
                        </p>
                        <div className="text-white/55 text-xs sm:text-sm mb-4 leading-relaxed space-y-2 border border-white/10 bg-white/[0.03] rounded p-3">
                            <p className="text-white/70 font-medium">Будет выполнено атомарно:</p>
                            <ul className="list-disc list-inside space-y-1 pl-0.5">
                                <li>Удаление профиля в CRM</li>
                                <li>
                                    <strong className="text-white/80">Заказы:</strong> ожидающие и подтверждённые —
                                    удаление и возврат на склад; отменённые — удаление; оплаченные и завершённые —
                                    только анонимизация контактов (суммы и позиции сохраняются)
                                </li>
                                <li>
                                    <strong className="text-white/80">Корзины:</strong> полное удаление по аккаунту
                                </li>
                            </ul>
                            <p className="text-white/45 text-[10px] sm:text-xs">
                                При ошибке все изменения каскада откатываются. Действие необратимо.
                            </p>
                        </div>
                {accountId && (
                    <p className="text-white/40 text-[10px] sm:text-xs font-mono mb-4 break-all">id: {accountId}</p>
                )}
                {error && (
                    <p className="text-sm text-red-200/90 break-words whitespace-pre-wrap bg-red-950/40 border border-red-500/30 p-3 rounded mb-4">
                        {error}
                    </p>
                )}
                <div className="flex flex-col-reverse sm:flex-row sm:justify-end gap-2 sm:gap-3">
                    <button
                        type="button"
                        onClick={onCancel}
                        disabled={isDeleting}
                        className="w-full sm:w-auto px-4 py-2.5 rounded-md bg-white/10 text-white/90 hover:bg-white/15 text-sm font-medium transition-colors disabled:opacity-50"
                    >
                        Отмена
                    </button>
                    <button
                        type="button"
                        onClick={onConfirm}
                        disabled={isDeleting}
                        className="w-full sm:w-auto px-4 py-2.5 rounded-md bg-red-600/90 text-white hover:bg-red-600 text-sm font-semibold transition-colors disabled:opacity-50"
                    >
                        {isDeleting ? 'Удаляем…' : 'Удалить'}
                    </button>
                </div>
                    </>
                )}
            </div>
        </div>
    )
}

function CrmCopyIconBtn({ text, label }: { text: string; label: string }) {
    const [copied, setCopied] = useState(false)
    const trimmed = text.trim()
    const canCopy = trimmed.length > 0

    const handleClick = async (e: MouseEvent) => {
        e.stopPropagation()
        if (!canCopy) return
        try {
            await navigator.clipboard.writeText(trimmed)
            setCopied(true)
            setTimeout(() => setCopied(false), 1000)
        } catch {
            /* ignore */
        }
    }

    return (
        <button
            type="button"
            disabled={!canCopy}
            onClick={handleClick}
            title={canCopy ? `${label}: скопировать` : label}
            className="inline-flex shrink-0 rounded p-0.5 text-white/45 hover:text-[var(--mint-bright)] disabled:pointer-events-none disabled:opacity-25 transition-colors focus:outline-none focus-visible:ring-1 focus-visible:ring-[var(--mint-bright)]"
            aria-label={canCopy ? `Скопировать ${label}` : undefined}
        >
            {copied ? (
                <CheckIcon className="h-3.5 w-3.5 text-[var(--mint-bright)]" aria-hidden />
            ) : (
                <ClipboardDocumentIcon className="h-3.5 w-3.5" aria-hidden />
            )}
        </button>
    )
}

const AdminUsers = () => {
    const [users, setUsers] = useState<CrmListUser[]>([])
    const [detailRow, setDetailRow] = useState<CrmListUser | null>(null)
    const [searchTerm, setSearchTerm] = useState('')
    const [onlyWithPhone, setOnlyWithPhone] = useState(false)
    const [onlyWithOrders, setOnlyWithOrders] = useState(false)
    const [onlyWithCartItems, setOnlyWithCartItems] = useState(false)
    const [ordersSort, setOrdersSort] = useState<OrdersSort>('none')
    const { status, setStatus } = useAppStore()
    const [loadError, setLoadError] = useState<string | null>(null)
    const [portalMounted, setPortalMounted] = useState(false)
    const [userToDelete, setUserToDelete] = useState<CrmListUser | null>(null)
    const [isDeletingUser, setIsDeletingUser] = useState(false)
    const [deleteUserError, setDeleteUserError] = useState<string | null>(null)
    const [deleteCascadeResult, setDeleteCascadeResult] = useState<DeleteUserCascadeStats | null>(null)
    const [loyaltyEnriching, setLoyaltyEnriching] = useState(false)

    useEffect(() => {
        setPortalMounted(true)
    }, [])

    const loadUsers = useCallback(async () => {
        try {
            setLoadError(null)
            setStatus('loading')
            const access = await tokenManager.getAccessToken()
            if (!access) {
                setUsers([])
                setLoadError(
                    'Нет access token. Войдите в админку паролем (admin-login), чтобы создалась сессия для этого устройства.'
                )
                setStatus('failed')
                return
            }
            const rows = await CrmApi.getUsers()
            setUsers(rows)
            setStatus('success')
            setLoyaltyEnriching(true)
            try {
                const enriched = await CrmApi.enrichUsersWithLoyalty(rows)
                setUsers(enriched)
            } finally {
                setLoyaltyEnriching(false)
            }
        } catch (e) {
            setUsers([])
            setLoadError(formatCrmLoadError(e))
            setStatus('failed')
        }
    }, [setStatus])

    useEffect(() => {
        void loadUsers()
    }, [loadUsers])

    const handleUserLoyaltyChange = useCallback((accountId: string, loyalty: LoyaltyStatus) => {
        setUsers(prev =>
            prev.map(row => {
                if (accountObjectIdFromCrmListRow(row) !== accountId) return row
                if (
                    row.loyalty?.level.id === loyalty.level.id &&
                    row.loyalty?.expPoints === loyalty.expPoints
                ) {
                    return row
                }
                return { ...row, loyalty }
            }),
        )
        setDetailRow(row => {
            if (!row || accountObjectIdFromCrmListRow(row) !== accountId) return row
            if (
                row.loyalty?.level.id === loyalty.level.id &&
                row.loyalty?.expPoints === loyalty.expPoints
            ) {
                return row
            }
            return { ...row, loyalty }
        })
    }, [])

    const resolvedUserPhone = (u: CrmListUser) => phoneFromRow(u)

    const filteredUsers = useMemo(() => {
        const search = searchTerm.toLowerCase().trim()
        let list = users.filter(u => {
            if (search) {
                const hit =
                    u._id?.toLowerCase().includes(search) ||
                    (u.telegramUserId != null && u.telegramUserId.toString().includes(search)) ||
                    u.userId?.toString().includes(search) ||
                    u.username?.toLowerCase().includes(search) ||
                    u.firstName?.toLowerCase().includes(search) ||
                    u.lastName?.toLowerCase().includes(search) ||
                    u.personalFirstName?.toLowerCase().includes(search) ||
                    u.personalLastName?.toLowerCase().includes(search) ||
                    u.email?.toLowerCase().includes(search) ||
                    resolvedUserPhone(u).toLowerCase().includes(search)
                if (!hit) return false
            }
            if (onlyWithPhone && !resolvedUserPhone(u)) return false
            if (onlyWithOrders && totalOrdersCount(u) < 1) return false
            if (onlyWithCartItems && !hasItemsInCart(u)) return false
            return true
        })

        if (ordersSort !== 'none') {
            const copy = [...list]
            switch (ordersSort) {
                case 'online_sum_desc':
                    copy.sort((a, b) => onlineOrdersSum(b) - onlineOrdersSum(a))
                    break
                case 'offline_sum_desc':
                    copy.sort((a, b) => offlineOrdersSum(b) - offlineOrdersSum(a))
                    break
                case 'total_orders_desc':
                    copy.sort((a, b) => totalOrdersCount(b) - totalOrdersCount(a))
                    break
                case 'total_orders_asc':
                    copy.sort((a, b) => totalOrdersCount(a) - totalOrdersCount(b))
                    break
                case 'total_sum_desc':
                    copy.sort((a, b) => totalOrdersSum(b) - totalOrdersSum(a))
                    break
                case 'total_sum_asc':
                    copy.sort((a, b) => totalOrdersSum(a) - totalOrdersSum(b))
                    break
            }
            list = copy
        }
        return list
    }, [users, searchTerm, onlyWithPhone, onlyWithOrders, onlyWithCartItems, ordersSort])

    const resetFilters = () => {
        setOnlyWithPhone(false)
        setOnlyWithOrders(false)
        setOnlyWithCartItems(false)
        setOrdersSort('none')
    }

    const aggOnlineOrders = users.reduce((s, u) => s + onlineOrdersCount(u), 0)
    const aggOnlineSum = users.reduce((s, u) => s + onlineOrdersSum(u), 0)
    const aggOfflineOrders = users.reduce((s, u) => s + offlineOrdersCount(u), 0)
    const aggOfflineSum = users.reduce((s, u) => s + offlineOrdersSum(u), 0)
    const aggTotalOrders = aggOnlineOrders + aggOfflineOrders
    const aggTotalSum = aggOnlineSum + aggOfflineSum

    const toggleOrdersSort = (next: OrdersSort) => {
        setOrdersSort((prev) => (prev === next ? 'none' : next))
    }

    const closeDeleteModal = () => {
        if (isDeletingUser) return
        setUserToDelete(null)
        setDeleteUserError(null)
        setDeleteCascadeResult(null)
    }

    const confirmDeleteUser = async () => {
        if (!userToDelete) return
        const accountId = accountObjectIdFromCrmListRow(userToDelete)
        if (!accountId) {
            setDeleteUserError('Нет валидного Mongo ObjectId для удаления')
            return
        }
        try {
            setIsDeletingUser(true)
            setDeleteUserError(null)
            const res = await CrmApi.deleteUser(accountId, 'full')
            setUsers((prev) => prev.filter((row) => accountObjectIdFromCrmListRow(row) !== accountId))
            if (detailRow && accountObjectIdFromCrmListRow(detailRow) === accountId) {
                setDetailRow(null)
            }
            setDeleteCascadeResult(
                res.cascade ?? {
                    ordersDeleted: 0,
                    ordersAnonymized: 0,
                    cartsDeleted: 0,
                },
            )
        } catch (e) {
            setDeleteUserError(formatDeleteUserError(e))
        } finally {
            setIsDeletingUser(false)
        }
    }

    return (
        <>
            <div className="relative p-4 mt-4 bg-white/5 backdrop-blur-md border border-white/10 text-white">
                <div className="flex items-center justify-between mb-5">
                    <h1 className="text-[var(--mint-bright)] text-xl font-bold font-durik">Клиенты (CRM)</h1>
                    <button
                        type="button"
                        onClick={() => void loadUsers()}
                        className="relative inline-flex items-center justify-center px-4 py-2 bg-white/10 backdrop-blur-sm border border-white/20 text-white hover:bg-white/15 transition-all duration-200"
                        disabled={status === 'loading'}
                    >
                        <svg
                            className={`w-5 h-5 mr-2 ${status === 'loading' ? 'animate-spin' : ''}`}
                            fill="none"
                            stroke="currentColor"
                            viewBox="0 0 24 24"
                        >
                            <path
                                strokeLinecap="round"
                                strokeLinejoin="round"
                                strokeWidth={2}
                                d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15"
                            />
                        </svg>
                        Обновить
                    </button>
                </div>

                <div className="mb-4 space-y-3">
                    <input
                        type="text"
                        placeholder="Поиск по имени, username, accountId, Telegram ID или телефону..."
                        value={searchTerm}
                        onChange={e => setSearchTerm(e.target.value)}
                        className="w-full bg-white/10 backdrop-blur-sm border border-white/20 p-3 text-white placeholder-white/50 focus:outline-none focus:border-[var(--mint-bright)] transition-all"
                    />
                    <div className="flex flex-wrap items-center gap-3 text-sm">
                        <label className="inline-flex items-center gap-2 cursor-pointer select-none">
                            <input
                                type="checkbox"
                                checked={onlyWithPhone}
                                onChange={e => setOnlyWithPhone(e.target.checked)}
                                className="rounded border-white/30 bg-white/10 text-[var(--mint-bright)] focus:ring-[var(--mint-bright)]"
                            />
                            <span className="text-white/90">Только с телефоном</span>
                        </label>
                        <label className="inline-flex items-center gap-2 cursor-pointer select-none">
                            <input
                                type="checkbox"
                                checked={onlyWithOrders}
                                onChange={e => setOnlyWithOrders(e.target.checked)}
                                className="rounded border-white/30 bg-white/10 text-[var(--mint-bright)] focus:ring-[var(--mint-bright)]"
                            />
                            <span className="text-white/90" title="Есть хотя бы один онлайн- или офлайн-заказ">
                                Только с заказами
                            </span>
                        </label>
                        <label className="inline-flex items-center gap-2 cursor-pointer select-none">
                            <input
                                type="checkbox"
                                checked={onlyWithCartItems}
                                onChange={e => setOnlyWithCartItems(e.target.checked)}
                                className="rounded border-white/30 bg-white/10 text-[var(--mint-bright)] focus:ring-[var(--mint-bright)]"
                            />
                            <span className="text-white/90">Корзина не пуста</span>
                        </label>
                        <div className="flex flex-wrap items-center gap-2">
                            <span className="text-white/50">Сортировка:</span>
                            <select
                                value={ordersSort}
                                onChange={e => setOrdersSort(e.target.value as OrdersSort)}
                                className="bg-white/10 border border-white/20 text-white text-sm py-1.5 px-2 rounded-none focus:outline-none focus:border-[var(--mint-bright)] max-w-[min(100%,320px)]"
                            >
                                <option value="none">Как пришло с сервера</option>
                                <option value="online_sum_desc">Онлайн: сумма больше → меньше</option>
                                <option value="offline_sum_desc">Офлайн: сумма больше → меньше</option>
                                <option value="total_orders_desc">
                                    Заказы онлайн + офлайн: больше → меньше
                                </option>
                                <option value="total_orders_asc">
                                    Заказы онлайн + офлайн: меньше → больше
                                </option>
                                <option value="total_sum_desc">Сумма онлайн + офлайн: больше → меньше</option>
                                <option value="total_sum_asc">Сумма онлайн + офлайн: меньше → больше</option>
                            </select>
                        </div>
                        {(onlyWithPhone || onlyWithOrders || onlyWithCartItems || ordersSort !== 'none') && (
                            <button
                                type="button"
                                onClick={resetFilters}
                                className="text-[var(--mint-bright)] hover:underline text-xs"
                            >
                                Сбросить фильтры
                            </button>
                        )}
                    </div>
                </div>

                <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-3 mb-5">
                    <div className="flex flex-col  justify-between gap-1.5 bg-white/10 backdrop-blur-sm border border-white/20 p-3 text-left">
                        <div className="text-xs text-white/60 leading-snug">Клиентов</div>
                        <div className="text-2xl font-bold text-[var(--mint-bright)] leading-tight">{users.length}</div>
                    </div>
                    <div className="flex flex-col  justify-between  gap-1.5 bg-white/10 backdrop-blur-sm border border-white/20 p-3 text-left">
                        <div className="text-xs text-white/60 leading-snug">Админы</div>
                        <div className="text-2xl font-bold text-[var(--pink-punk)] leading-tight">
                            {users.filter(u => u.isAdmin).length}
                        </div>
                    </div>
                    <div className="flex flex-col  justify-between  gap-1.5 bg-white/10 backdrop-blur-sm border border-white/20 p-3 text-left">
                        <div className="text-xs text-white/60 leading-snug">С телефоном</div>
                        <div className="text-2xl font-bold text-white leading-tight">
                            {users.filter(u => phoneFromRow(u)).length}
                        </div>
                    </div>
                    <button
                        type="button"
                        onClick={() => toggleOrdersSort('online_sum_desc')}
                        title="Сортировать карточки по сумме онлайн-заказов (больше → меньше). Повторный клик — сброс."
                        className={statSortTileClass(ordersSort === 'online_sum_desc', 'mint')}
                        aria-pressed={ordersSort === 'online_sum_desc'}
                    >
                        <div className="text-xs text-white/60 leading-snug">Онлайн-заказы</div>
                        <div className="text-lg md:text-xl font-bold text-[var(--mint-bright)] leading-tight">
                            {aggOnlineOrders} шт
                        </div>
                        <div className="text-xs text-white/70 mt-0.5">{aggOnlineSum.toFixed(0)} BYN</div>
                    </button>
                    <button
                        type="button"
                        onClick={() => toggleOrdersSort('offline_sum_desc')}
                        title="Сортировать карточки по сумме офлайн-заказов (больше → меньше). Повторный клик — сброс."
                        className={statSortTileClass(ordersSort === 'offline_sum_desc', 'amber')}
                        aria-pressed={ordersSort === 'offline_sum_desc'}
                    >
                        <div className="text-xs text-white/60 leading-snug">Офлайн-заказы</div>
                        <div className="text-lg md:text-xl font-bold text-amber-300/95 leading-tight">
                            {aggOfflineOrders} шт
                        </div>
                        <div className="text-xs text-white/70 mt-0.5">{aggOfflineSum.toFixed(0)} BYN</div>
                    </button>
                    <div className="flex flex-col justify-between gap-1.5 bg-white/10 backdrop-blur-sm border border-white/20 p-3 text-left col-span-2 md:col-span-1">
                        <div className="text-xs text-white/60 leading-snug">Итого онлайн + офлайн</div>
                        <div className="text-lg md:text-xl font-bold text-white leading-tight">
                            {aggTotalOrders} шт
                        </div>
                        <div className="text-xs text-white/80 mt-0.5 font-medium">{aggTotalSum.toFixed(0)} BYN</div>
                    </div>
                </div>

                <div>
                    {loyaltyEnriching && status === 'success' && (
                        <p className="mb-2 text-center text-xs text-white/50">Подгрузка уровней лояльности…</p>
                    )}
                    {status === 'loading' ? (
                        <div className="text-center py-10 text-white/60">Загрузка клиентов…</div>
                    ) : status === 'failed' ? (
                        <div className="text-center py-10 text-red-300/90 max-w-xl mx-auto space-y-3">
                            <p className="font-semibold">Не удалось загрузить список клиентов (CRM).</p>
                            {loadError && (
                                <p className="text-sm text-red-200/90 break-words whitespace-pre-wrap bg-red-950/40 border border-red-500/30 p-3 rounded">
                                    {loadError}
                                </p>
                            )}
                        </div>
                    ) : filteredUsers.length === 0 ? (
                        <div className="text-center py-10 text-white/60">
                            {searchTerm || onlyWithPhone || onlyWithOrders || onlyWithCartItems
                                ? 'Никто не подошёл под фильтры'
                                : 'Список пуст'}
                        </div>
                    ) : (
                        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-2">
                            {filteredUsers.map(u => {
                                const cart = u.cart
                                const off = u.offlinePurchasesSummary
                                const onlineSum = u.stats?.totalSpent ?? 0
                                const offlineSum = off?.totalAmount ?? 0
                                const totalAll = onlineSum + offlineSum
                                const crmAccountId = accountObjectIdFromCrmListRow(u)
                                const cardTitle = crmUserDisplayName(u)
                                const phoneDisplay = phoneFromRow(u)
                                const telegramCopy = u.username?.trim() ? `@${u.username.trim()}` : ''
                                const protectedOwner = isProtectedOwnerUser(u)
                                const userLoyalty = u.loyalty
                                const levelTheme = userLoyalty
                                    ? getLevelTheme(userLoyalty.level.id)
                                    : null
                                const levelBorderStyle = getLoyaltyLevelBorderStyle(
                                    userLoyalty?.level.id,
                                )
                                return (
                                    <div
                                        key={u._id}
                                        role="button"
                                        tabIndex={0}
                                        onClick={() => {
                                            if (crmAccountId) setDetailRow(u)
                                        }}
                                        onKeyDown={(e: KeyboardEvent) => {
                                            if (e.key === 'Enter' || e.key === ' ') {
                                                e.preventDefault()
                                                if (crmAccountId) setDetailRow(u)
                                            }
                                        }}
                                        title={
                                            crmAccountId
                                                ? 'Открыть карточку CRM'
                                                : 'Нет валидного Mongo ObjectId в _id — проверьте ответ GET /admin/crm/users'
                                        }
                                        style={levelBorderStyle}
                                        className={`text-left bg-white/10 backdrop-blur-sm border-2 p-2.5 transition-all duration-200 focus:outline-none focus-visible:ring-2 focus-visible:ring-[var(--mint-bright)] ${
                                            crmAccountId
                                                ? 'cursor-pointer hover:brightness-110'
                                                : 'cursor-not-allowed opacity-60'
                                        }`}
                                    >
                                        <div className="min-w-0 space-y-1 text-[10px] leading-snug">
                                            <div className="flex items-center justify-between gap-2">
                                                <span className="text-xs font-semibold text-white break-words min-w-0">
                                                    {cardTitle}
                                                </span>
                                                <span className="flex items-center gap-1 shrink-0">
                                                    <button
                                                        type="button"
                                                        disabled={!crmAccountId || protectedOwner}
                                                        onClick={(e) => {
                                                            e.stopPropagation()
                                                            if (!crmAccountId || protectedOwner) return
                                                            setDeleteUserError(null)
                                                            setDeleteCascadeResult(null)
                                                            setUserToDelete(u)
                                                        }}
                                                        title={
                                                            protectedOwner
                                                                ? 'Нельзя удалить аккаунт владельца'
                                                                : crmAccountId
                                                                  ? 'Удалить пользователя'
                                                                  : 'Нет id для удаления'
                                                        }
                                                        className="inline-flex rounded p-0.5 text-white/40 hover:text-red-400 hover:bg-red-500/10 disabled:pointer-events-none disabled:opacity-25 transition-colors focus:outline-none focus-visible:ring-1 focus-visible:ring-red-400"
                                                        aria-label="Удалить пользователя"
                                                    >
                                                        <TrashIcon className="h-3.5 w-3.5" aria-hidden />
                                                    </button>
                                                    <span title={u.isAdmin ? 'Администратор' : 'Не администратор'}>
                                                        <ShieldCheckIcon
                                                            className={`h-3.5 w-3.5 ${u.isAdmin ? 'text-[var(--pink-punk)]' : 'text-white/20'}`}
                                                        />
                                                    </span>
                                                    <span title={u.isPremium ? 'Telegram Premium' : 'Без Premium'}>
                                                        <SparklesIcon
                                                            className={`h-3.5 w-3.5 ${u.isPremium ? 'text-[var(--mint-bright)]' : 'text-white/20'}`}
                                                        />
                                                    </span>
                                                    <span
                                                        title={
                                                            hasItemsInCart(u)
                                                                ? `В корзине: ${u.cart?.totalItems ?? 0} шт`
                                                                : 'Корзина пустая или нет данных CRM'
                                                        }
                                                    >
                                                        <ShoppingBagIcon
                                                            className={`h-3.5 w-3.5 ${hasItemsInCart(u) ? 'text-amber-400' : 'text-white/20'}`}
                                                        />
                                                    </span>
                                                </span>
                                            </div>
                                            {userLoyalty && levelTheme && (
                                                <p className="text-[10px] leading-snug">
                                                    <span
                                                        className="font-semibold"
                                                        style={{ color: levelTheme.labelColor }}
                                                    >
                                                        {userLoyalty.level.label}
                                                    </span>
                                                    <span className="text-white/45"> · </span>
                                                    <span className="text-white/80 tabular-nums">
                                                        {formatExpPoints(userLoyalty.expPoints)} pts
                                                    </span>
                                                </p>
                                            )}
                                            <div className="text-white/55 truncate" title="Имя из профиля">
                                                Имя:{' '}
                                                <span className="text-white/85">
                                                    {[u.personalFirstName, u.personalLastName].filter(Boolean).join(' ') || '—'}
                                                </span>
                                            </div>
                                            <div className="flex items-center gap-1 text-white/55 min-w-0">
                                                <span className="truncate min-w-0 flex-1" title="Username в Telegram">
                                                    Telegram:{' '}
                                                    <span className="text-white/85">
                                                        {telegramCopy || '—'}
                                                    </span>
                                                </span>
                                                <CrmCopyIconBtn text={telegramCopy} label="Telegram" />
                                            </div>
                                            <div className="flex items-center gap-1 text-white/55 min-w-0">
                                                <span className="truncate min-w-0 flex-1">
                                                    Телефон:{' '}
                                                    <span className="font-mono text-white/80">{phoneDisplay || '—'}</span>
                                                </span>
                                                <CrmCopyIconBtn text={phoneDisplay} label="Телефон" />
                                            </div>
                                            <div className="text-white/55">
                                                Заказы:{' '}
                                                <span className="text-white/90">
                                                    {u.stats?.ordersTotal ?? 0} шт · {onlineSum.toFixed(0)} BYN
                                                </span>
                                            </div>
                                            <div className="text-white/55">
                                                Офлайн-заказы:{' '}
                                                <span className="text-white/90">
                                                    {off
                                                        ? `${off.linesCount} шт · ${offlineSum.toFixed(0)} BYN`
                                                        : '—'}
                                                </span>
                                            </div>
                                            <div className="text-white/55">
                                                Всего:{' '}
                                                <span className="text-white font-medium">{totalAll.toFixed(0)} BYN</span>
                                            </div>
                                            <div className="text-white/55 truncate">
                                                Корзина:{' '}
                                                <span className="text-white/85">
                                                    {cart
                                                        ? `${cart.totalItems} шт · ${(cart.totalPrice ?? 0).toFixed(0)} BYN`
                                                        : '—'}
                                                </span>
                                            </div>
                                            <div className="text-white/45 pt-0.5 border-t border-white/10">
                                                Рефералы:{' '}
                                                <span className="text-white/70">{u.referralsCount ?? 0}</span>
                                            </div>
                                        </div>
                                    </div>
                                )
                            })}
                        </div>
                    )}
                </div>
            </div>

            {portalMounted &&
                userToDelete &&
                typeof document !== 'undefined' &&
                document.body &&
                createPortal(
                    <CrmDeleteUserConfirmModal
                        user={userToDelete}
                        isDeleting={isDeletingUser}
                        error={deleteUserError}
                        cascadeResult={deleteCascadeResult}
                        onCancel={closeDeleteModal}
                        onConfirm={() => void confirmDeleteUser()}
                        onCloseAfterSuccess={closeDeleteModal}
                    />,
                    document.body,
                )}

            {portalMounted &&
                detailRow &&
                typeof document !== 'undefined' &&
                document.body &&
                createPortal(
                    <div className="fixed inset-0 z-[100] overflow-y-auto overscroll-contain">
                        <button
                            type="button"
                            className="fixed inset-0 z-0 m-0 cursor-pointer border-0 bg-black/50 p-0"
                            onClick={() => setDetailRow(null)}
                            aria-label="Закрыть карточку клиента"
                        />
                        <div className="relative z-10 mb-4 flex w-full justify-center px-0 sm:px-1 pb-12 pt-6">
                            <AdminCrmUserDetailModal
                                embedded
                                listRow={detailRow}
                                onClose={() => setDetailRow(null)}
                                onListRefresh={() => void loadUsers()}
                                onUserLoyaltyChange={handleUserLoyaltyChange}
                            />
                        </div>
                    </div>,
                    document.body,
                )}
        </>
    )
}

export default AdminUsers
