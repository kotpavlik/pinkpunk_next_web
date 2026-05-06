'use client'

import { useCallback, useEffect, useMemo, useState, type KeyboardEvent, type MouseEvent } from 'react'
import { createPortal } from 'react-dom'
import type { AxiosError } from 'axios'
import { ShieldCheckIcon, ShoppingBagIcon, SparklesIcon } from '@heroicons/react/24/solid'
import { CheckIcon, ClipboardDocumentIcon } from '@heroicons/react/24/outline'
import { CrmApi, type CrmListUser } from '@/api/CrmApi'
import { useAppStore } from '@/zustand/app_store/AppStore'
import AdminCrmUserDetailModal from '@/components/ui/admin/AdminCrmUserDetailModal'
import { tokenManager } from '@/utils/TokenManager'

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

type OrdersSort =
    | 'none'
    | 'orders_desc'
    | 'orders_asc'
    | 'sum_desc'
    | 'sum_asc'

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
            const data = await CrmApi.getUsers()
            setUsers(data)
            setStatus('success')
        } catch (e) {
            console.error(e)
            setUsers([])
            setLoadError(formatCrmLoadError(e))
            setStatus('failed')
        }
    }, [setStatus])

    useEffect(() => {
        void loadUsers()
    }, [loadUsers])

    const resolvedUserPhone = (u: CrmListUser) => phoneFromRow(u)

    const filteredUsers = useMemo(() => {
        const search = searchTerm.toLowerCase().trim()
        let list = users.filter(u => {
            if (search) {
                const hit =
                    u.username?.toLowerCase().includes(search) ||
                    u.firstName?.toLowerCase().includes(search) ||
                    u.lastName?.toLowerCase().includes(search) ||
                    u.personalFirstName?.toLowerCase().includes(search) ||
                    u.personalLastName?.toLowerCase().includes(search) ||
                    u.userId?.toString().includes(search) ||
                    u.email?.toLowerCase().includes(search) ||
                    resolvedUserPhone(u).toLowerCase().includes(search)
                if (!hit) return false
            }
            if (onlyWithPhone && !resolvedUserPhone(u)) return false
            if (onlyWithOrders && (u.stats?.ordersTotal ?? 0) < 1) return false
            if (onlyWithCartItems && !hasItemsInCart(u)) return false
            return true
        })

        if (ordersSort !== 'none') {
            const copy = [...list]
            switch (ordersSort) {
                case 'orders_desc':
                    copy.sort((a, b) => (b.stats?.ordersTotal ?? 0) - (a.stats?.ordersTotal ?? 0))
                    break
                case 'orders_asc':
                    copy.sort((a, b) => (a.stats?.ordersTotal ?? 0) - (b.stats?.ordersTotal ?? 0))
                    break
                case 'sum_desc':
                    copy.sort((a, b) => (b.stats?.totalSpent ?? 0) - (a.stats?.totalSpent ?? 0))
                    break
                case 'sum_asc':
                    copy.sort((a, b) => (a.stats?.totalSpent ?? 0) - (b.stats?.totalSpent ?? 0))
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

    const totalOrdersAll = users.reduce((s, u) => s + (u.stats?.ordersTotal ?? 0), 0)
    const totalSpentAgg = users.reduce((s, u) => s + (u.stats?.totalSpent ?? 0), 0)

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
                        placeholder="Поиск по имени, username, Telegram ID или телефону..."
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
                            <span className="text-white/90">Только с заказами</span>
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
                                className="bg-white/10 border border-white/20 text-white text-sm py-1.5 px-2 rounded-none focus:outline-none focus:border-[var(--mint-bright)] max-w-[min(100%,240px)]"
                            >
                                <option value="none">Как пришло с сервера</option>
                                <option value="orders_desc">Заказы: больше → меньше</option>
                                <option value="orders_asc">Заказы: меньше → больше</option>
                                <option value="sum_desc">Сумма (оплачено + завершено): больше → меньше</option>
                                <option value="sum_asc">Сумма (оплачено + завершено): меньше → больше</option>
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
                        <div className="text-xs text-white/60 leading-snug">Премиум</div>
                        <div className="text-2xl font-bold text-[var(--mint-bright)] leading-tight">
                            {users.filter(u => u.isPremium).length}
                        </div>
                    </div>
                    <div className="flex flex-col  justify-between  gap-1.5 bg-white/10 backdrop-blur-sm border border-white/20 p-3 text-left">
                        <div className="text-xs text-white/60 leading-snug">С телефоном</div>
                        <div className="text-2xl font-bold text-white leading-tight">
                            {users.filter(u => phoneFromRow(u)).length}
                        </div>
                    </div>
                    <div className="flex flex-col  justify-between  gap-1.5 bg-white/10 backdrop-blur-sm border border-white/20 p-3 text-left">
                        <div className="text-xs text-white/60 leading-snug">Всего заказов (все статусы)</div>
                        <div className="text-2xl font-bold text-[var(--mint-bright)] leading-tight">{totalOrdersAll}</div>
                    </div>
                    <div className="flex flex-col  justify-between   gap-1.5 bg-white/10 backdrop-blur-sm border border-white/20 p-3 text-left">
                        <div className="text-xs text-white/60 leading-snug">Сумма (оплачено + завершено)</div>
                        <div className="text-lg md:text-xl font-bold text-[var(--mint-bright)] break-words leading-tight">
                            {totalSpentAgg.toFixed(0)} BYN
                        </div>
                    </div>
                </div>

                <div>
                    {status === 'loading' ? (
                        <div className="text-center py-10 text-white/60">Загрузка CRM…</div>
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
                                const tgName =
                                    [u.firstName, u.lastName].filter(Boolean).join(' ').trim() ||
                                    (u.username ? `@${u.username}` : '—')
                                const phoneDisplay = phoneFromRow(u)
                                const telegramCopy = u.username?.trim() ? `@${u.username.trim()}` : ''
                                return (
                                    <div
                                        key={u._id || String(u.userId)}
                                        role="button"
                                        tabIndex={0}
                                        onClick={() => setDetailRow(u)}
                                        onKeyDown={(e: KeyboardEvent) => {
                                            if (e.key === 'Enter' || e.key === ' ') {
                                                e.preventDefault()
                                                setDetailRow(u)
                                            }
                                        }}
                                        className="text-left bg-white/10 backdrop-blur-sm border border-white/20 p-2.5 hover:border-[var(--mint-bright)] transition-all duration-200 focus:outline-none focus-visible:ring-2 focus-visible:ring-[var(--mint-bright)] cursor-pointer"
                                    >
                                        <div className="min-w-0 space-y-1 text-[10px] leading-snug">
                                            <div className="flex items-center justify-between gap-2">
                                                <span className="text-xs font-semibold text-white break-words min-w-0">
                                                    {tgName}
                                                </span>
                                                <span className="flex items-center gap-1 shrink-0">
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
                            />
                        </div>
                    </div>,
                    document.body,
                )}
        </>
    )
}

export default AdminUsers
