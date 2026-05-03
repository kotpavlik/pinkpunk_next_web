'use client'

import { useCallback, useEffect, useMemo, useState } from 'react'
import {
    CrmApi,
    CrmListUser,
    CrmUpdateUserDto,
    CrmUserCardResponse,
    CrmAddOfflineCustomBody,
    CrmOfflineLine,
    CrmProductRef,
} from '@/api/CrmApi'
import { isOrderItemProductPopulated, type OrderItem, type PaymentMethod, type PinkPunkOrder } from '@/api/OrderApi'
import { ProductApi, type ProductResponse } from '@/api/ProductApi'
import LazyImage from '@/components/common/LazyImage'
import { formatShippingAddress } from '@/utils/formatShippingAddress'
import { useAppStore } from '@/zustand/app_store/AppStore'

type TabId = 'profile' | 'orders' | 'cart' | 'referrals'

function isPopulatedProduct(p: string | CrmProductRef): p is CrmProductRef {
    return typeof p === 'object' && p !== null && 'name' in p
}

/** Mongo _id карточки товара для каталожной офлайн-строки */
function catalogLineProductMongoId(line: CrmOfflineLine): string | null {
    if (line.kind !== 'catalog') return null
    if (typeof line.product === 'string' && line.product.trim()) return line.product.trim()
    if (isPopulatedProduct(line.product)) return line.product._id
    return null
}

function axiosResponseMessage(e: unknown): string {
    if (e && typeof e === 'object' && 'response' in e) {
        const d = (e as { response?: { data?: { message?: unknown } } }).response?.data
        const m = d?.message
        if (typeof m === 'string') return m
        if (Array.isArray(m)) return m.join(', ')
    }
    if (e instanceof Error) return e.message
    return ''
}

function offlineLineLabel(line: CrmOfflineLine): string {
    if (line.kind === 'custom') return line.customName
    if (isPopulatedProduct(line.product)) return line.product.name
    return line.productNameSnapshot
}

function fmtMoney(n: number) {
    return `${n.toFixed(0)} BYN`
}

function fmtDt(iso?: string) {
    if (!iso) return '—'
    return new Date(iso).toLocaleString('ru-RU', {
        day: '2-digit',
        month: '2-digit',
        year: 'numeric',
        hour: '2-digit',
        minute: '2-digit',
    })
}

const PAYMENT_METHOD_RU: Record<PaymentMethod, string> = {
    card_online: 'Карта онлайн',
    card_offline: 'Карта офлайн',
    cash: 'Наличные',
    crypto: 'Крипто',
    bank_transfer: 'Банковский перевод',
}

function paymentMethodRu(m?: PaymentMethod) {
    if (!m) return '—'
    return PAYMENT_METHOD_RU[m] ?? m
}

const ORDER_STATUS_RU: Record<PinkPunkOrder['status'], string> = {
    pending_confirmation: 'Ожидает подтверждения',
    confirmed: 'Подтверждён',
    paid: 'Оплачен',
    completed: 'Завершён',
    cancelled: 'Отменён',
}

function orderItemLabel(it: OrderItem): string {
    if (isOrderItemProductPopulated(it.product)) return it.product.name
    if (typeof it.product === 'string' && it.product) return `Товар (id: ${it.product})`
    return 'Товар'
}

function orderItemPhotoUrls(it: OrderItem): string[] {
    if (!isOrderItemProductPopulated(it.product) || !it.product.photos?.length) return []
    return it.product.photos.filter((u): u is string => typeof u === 'string' && u.trim().length > 0)
}

type Props = {
    listRow: CrmListUser
    onClose: () => void
    onListRefresh: () => void
}

export default function AdminCrmUserDetailModal({ listRow, onClose, onListRefresh }: Props) {
    const telegramId = listRow.userId
    const { setStatus } = useAppStore()
    const [tab, setTab] = useState<TabId>('profile')
    const [loading, setLoading] = useState(true)
    const [error, setError] = useState<string | null>(null)
    const [card, setCard] = useState<CrmUserCardResponse | null>(null)

    const [saving, setSaving] = useState(false)
    const [products, setProducts] = useState<ProductResponse[]>([])
    const [productsLoaded, setProductsLoaded] = useState(false)

    const profile = card?.profile

    const [form, setForm] = useState({
        personalFirstName: '',
        personalLastName: '',
        firstName: '',
        lastName: '',
        email: '',
        userPhoneNumber: '',
        username: '',
        walletAddress: '',
        isAdmin: false,
        dateOfBirth: '',
        heightCm: '',
        hipsCircumferenceCm: '',
        armLengthCm: '',
        chestCircumferenceCm: '',
        waistCircumferenceCm: '',
        trousersLengthCm: '',
        adminNotes: '',
        shipFullName: '',
        shipPhone: '',
        shipCity: '',
        shipPostal: '',
        shipCountry: '',
        shipStreet: '',
        shipHouse: '',
        shipApartment: '',
        shipNotes: '',
    })

    const [catalogProductId, setCatalogProductId] = useState('')
    const [catalogQty, setCatalogQty] = useState('1')
    const [catalogPriceOverride, setCatalogPriceOverride] = useState('')
    const [customName, setCustomName] = useState('')
    const [customDesc, setCustomDesc] = useState('')
    const [customPrice, setCustomPrice] = useState('')
    const [customQty, setCustomQty] = useState('1')
    const [offlineBusy, setOfflineBusy] = useState(false)

    const loadCard = useCallback(async () => {
        setLoading(true)
        setError(null)
        try {
            const data = await CrmApi.getUserCard(telegramId)
            setCard(data)
        } catch (e: unknown) {
            const msg =
                e && typeof e === 'object' && 'response' in e
                    ? String((e as { response?: { data?: { message?: string } } }).response?.data?.message || '')
                    : ''
            setError(msg || 'Не удалось загрузить карточку клиента')
        } finally {
            setLoading(false)
        }
    }, [telegramId])

    useEffect(() => {
        loadCard()
    }, [loadCard])

    useEffect(() => {
        if (!profile) return
        const s = profile.shippingAddress
        setForm({
            personalFirstName: profile.personalFirstName ?? '',
            personalLastName: profile.personalLastName ?? '',
            firstName: profile.firstName ?? '',
            lastName: profile.lastName ?? '',
            email: profile.email ?? '',
            userPhoneNumber: profile.userPhoneNumber ?? '',
            username: profile.username ?? '',
            walletAddress: profile.walletAddress ?? '',
            isAdmin: !!profile.isAdmin,
            dateOfBirth: profile.dateOfBirth ? profile.dateOfBirth.slice(0, 10) : '',
            heightCm: profile.heightCm != null ? String(profile.heightCm) : '',
            hipsCircumferenceCm: profile.hipsCircumferenceCm != null ? String(profile.hipsCircumferenceCm) : '',
            armLengthCm: profile.armLengthCm != null ? String(profile.armLengthCm) : '',
            chestCircumferenceCm: profile.chestCircumferenceCm != null ? String(profile.chestCircumferenceCm) : '',
            waistCircumferenceCm: profile.waistCircumferenceCm != null ? String(profile.waistCircumferenceCm) : '',
            trousersLengthCm: profile.trousersLengthCm != null ? String(profile.trousersLengthCm) : '',
            adminNotes: profile.adminNotes ?? '',
            shipFullName: s?.fullName ?? '',
            shipPhone: s?.phone ?? '',
            shipCity: s?.city ?? '',
            shipPostal: s?.postalCode ?? '',
            shipCountry: s?.country ?? '',
            shipStreet: s?.street ?? '',
            shipHouse: s?.house ?? '',
            shipApartment: s?.apartment ?? '',
            shipNotes: s?.notes ?? '',
        })
    }, [profile])

    const loadProducts = async () => {
        if (productsLoaded) return
        try {
            const { data } = await ProductApi.GetAllProducts(true)
            setProducts(Array.isArray(data) ? data : [])
            setProductsLoaded(true)
        } catch {
            setProducts([])
            setProductsLoaded(true)
        }
    }

    const refreshProductCatalog = useCallback(async () => {
        try {
            const { data } = await ProductApi.GetAllProducts(true)
            setProducts(Array.isArray(data) ? data : [])
        } catch {
            /* оставляем текущий список */
        }
    }, [])

    useEffect(() => {
        if (tab === 'profile') void loadProducts()
    }, [tab, productsLoaded])

    const buildPatch = useCallback((): CrmUpdateUserDto => {
        if (!profile) return {}
        const p: CrmUpdateUserDto = {}
        const str = (a: string, b: string | undefined) => (a.trim() !== (b ?? '').trim() ? a.trim() : undefined)

        const pf = str(form.personalFirstName, profile.personalFirstName)
        if (pf !== undefined) p.personalFirstName = pf
        const pl = str(form.personalLastName, profile.personalLastName)
        if (pl !== undefined) p.personalLastName = pl
        const ff = str(form.firstName, profile.firstName)
        if (ff !== undefined) p.firstName = ff
        const fl = str(form.lastName, profile.lastName)
        if (fl !== undefined) p.lastName = fl
        const em = str(form.email, profile.email)
        if (em !== undefined) p.email = em
        const ph = str(form.userPhoneNumber, profile.userPhoneNumber)
        if (ph !== undefined) p.userPhoneNumber = ph
        const un = str(form.username, profile.username)
        if (un !== undefined) p.username = un
        const wa = str(form.walletAddress, profile.walletAddress)
        if (wa !== undefined) p.walletAddress = wa

        if (!profile.owner && form.isAdmin !== !!profile.isAdmin) {
            p.isAdmin = form.isAdmin
        }

        const dobNew = form.dateOfBirth.trim()
        const dobOld = profile.dateOfBirth ? profile.dateOfBirth.slice(0, 10) : ''
        if (dobNew !== dobOld) p.dateOfBirth = dobNew || undefined

        const num = (raw: string, prev?: number) => {
            const t = raw.trim()
            if (!t) return prev === undefined ? undefined : null
            const n = Number(t)
            return Number.isNaN(n) ? prev : n
        }
        const hm = num(form.heightCm, profile.heightCm)
        if (hm !== undefined && hm !== profile.heightCm) p.heightCm = hm === null ? undefined : hm
        const hips = num(form.hipsCircumferenceCm, profile.hipsCircumferenceCm)
        if (hips !== undefined && hips !== profile.hipsCircumferenceCm)
            p.hipsCircumferenceCm = hips === null ? undefined : hips
        const arm = num(form.armLengthCm, profile.armLengthCm)
        if (arm !== undefined && arm !== profile.armLengthCm) p.armLengthCm = arm === null ? undefined : arm
        const ch = num(form.chestCircumferenceCm, profile.chestCircumferenceCm)
        if (ch !== undefined && ch !== profile.chestCircumferenceCm)
            p.chestCircumferenceCm = ch === null ? undefined : ch
        const ws = num(form.waistCircumferenceCm, profile.waistCircumferenceCm)
        if (ws !== undefined && ws !== profile.waistCircumferenceCm)
            p.waistCircumferenceCm = ws === null ? undefined : ws
        const tr = num(form.trousersLengthCm, profile.trousersLengthCm)
        if (tr !== undefined && tr !== profile.trousersLengthCm)
            p.trousersLengthCm = tr === null ? undefined : tr

        const an = str(form.adminNotes, profile.adminNotes)
        if (an !== undefined) p.adminNotes = an

        const prevAddr = profile.shippingAddress
        const addrPatch: Record<string, string> = {}
        const cmp = (value: string, field: string, oldVal?: string) => {
            const v = value.trim()
            if (v !== (oldVal ?? '').trim()) addrPatch[field] = v
        }
        cmp(form.shipFullName, 'fullName', prevAddr?.fullName)
        cmp(form.shipPhone, 'phone', prevAddr?.phone)
        cmp(form.shipCity, 'city', prevAddr?.city)
        cmp(form.shipPostal, 'postalCode', prevAddr?.postalCode)
        cmp(form.shipCountry, 'country', prevAddr?.country)
        cmp(form.shipStreet, 'street', prevAddr?.street)
        cmp(form.shipHouse, 'house', prevAddr?.house)
        cmp(form.shipApartment, 'apartment', prevAddr?.apartment)
        cmp(form.shipNotes, 'notes', prevAddr?.notes)

        if (Object.keys(addrPatch).length) {
            p.shippingAddress = addrPatch as CrmUpdateUserDto['shippingAddress']
        }

        return p
    }, [form, profile])

    const handleSaveProfile = async () => {
        const patch = buildPatch()
        if (!Object.keys(patch).length) {
            return
        }
        setSaving(true)
        setStatus('loading')
        try {
            const updated = await CrmApi.patchUser(telegramId, patch)
            setCard(c =>
                c
                    ? {
                          ...c,
                          profile: {
                              ...c.profile,
                              ...updated,
                              crmOfflinePurchases:
                                  updated.crmOfflinePurchases ?? c.profile.crmOfflinePurchases,
                          },
                      }
                    : c
            )
            onListRefresh()
            setStatus('success')
        } catch (e: unknown) {
            setStatus('failed')
            const msg =
                e && typeof e === 'object' && 'response' in e
                    ? String((e as { response?: { data?: { message?: unknown } } }).response?.data?.message || '')
                    : 'Ошибка сохранения'
            alert(typeof msg === 'string' ? msg : JSON.stringify(msg))
        } finally {
            setSaving(false)
        }
    }

    /** Офлайн CRM на бэкенде склад не меняет — списание/возврат только через ProductApi здесь. */
    const handleAddCatalogOffline = async () => {
        if (!catalogProductId) return
        const q = Math.max(1, parseInt(catalogQty, 10) || 1)
        const body: Parameters<typeof CrmApi.addOfflinePurchase>[1] = {
            kind: 'catalog',
            productId: catalogProductId,
            quantity: q,
        }
        const po = catalogPriceOverride.trim()
        if (po) {
            const n = Number(po)
            if (!Number.isNaN(n)) body.unitPriceOverride = n
        }
        setOfflineBusy(true)
        try {
            let stockBefore = 0
            try {
                const { data: product } = await ProductApi.GetProductById(catalogProductId)
                stockBefore = product.stockQuantity ?? 0
            } catch {
                alert('Не удалось загрузить товар для проверки склада.')
                return
            }
            if (q > stockBefore) {
                alert(
                    `Недостаточно на складе: запрошено ${q} шт., в наличии ${stockBefore} шт. (${products.find(p => p._id === catalogProductId)?.name ?? 'товар'})`
                )
                return
            }
            const stockAfterSale = stockBefore - q
            try {
                await ProductApi.UpdateProduct(catalogProductId, { stockQuantity: stockAfterSale })
            } catch (e) {
                alert(`Не удалось списать со склада.\n${axiosResponseMessage(e) || 'Ошибка обновления товара'}`)
                return
            }
            try {
                const res = await CrmApi.addOfflinePurchase(telegramId, body)
                setCard(c =>
                    c ? { ...c, profile: { ...c.profile, crmOfflinePurchases: res.crmOfflinePurchases } } : c
                )
                onListRefresh()
                void refreshProductCatalog()
            } catch (e) {
                try {
                    await ProductApi.UpdateProduct(catalogProductId, { stockQuantity: stockBefore })
                } catch {
                    alert(
                        'Офлайн-продажа не создана, а вернуть остаток на склад не удалось. Проверьте остаток вручную в каталоге.'
                    )
                    return
                }
                alert(
                    `Не удалось зафиксировать офлайн-покупку. Остаток на складе возвращён (${stockBefore} шт.).\n${axiosResponseMessage(e) || 'Ошибка CRM'}`
                )
            }
        } finally {
            setOfflineBusy(false)
        }
    }

    const handleAddCustomOffline = async () => {
        if (!customName.trim() || !customPrice.trim()) return
        const price = Number(customPrice)
        const q = Math.max(1, parseInt(customQty, 10) || 1)
        if (Number.isNaN(price)) return
        const body: CrmAddOfflineCustomBody = {
            kind: 'custom',
            customName: customName.trim(),
            customDescription: customDesc.trim() || undefined,
            customPrice: price,
            quantity: q,
        }
        setOfflineBusy(true)
        try {
            const res = await CrmApi.addOfflinePurchase(telegramId, body)
            setCard(c =>
                c ? { ...c, profile: { ...c.profile, crmOfflinePurchases: res.crmOfflinePurchases } } : c
            )
            onListRefresh()
        } catch {
            alert('Не удалось добавить кастомную позицию')
        } finally {
            setOfflineBusy(false)
        }
    }

    const handleDeleteOffline = async (lineId: string) => {
        if (!confirm('Удалить строку офлайн-покупки?')) return
        const line = profile?.crmOfflinePurchases?.find(l => l._id === lineId)
        const catalogProductIdToRestore = line?.kind === 'catalog' ? catalogLineProductMongoId(line) : null
        const qtyToRestore = line?.kind === 'catalog' ? line.quantity : 0

        setOfflineBusy(true)
        try {
            await CrmApi.deleteOfflineLine(telegramId, lineId)
            setCard(c =>
                c
                    ? {
                          ...c,
                          profile: {
                              ...c.profile,
                              crmOfflinePurchases: c.profile.crmOfflinePurchases.filter(l => l._id !== lineId),
                          },
                      }
                    : c
            )
            onListRefresh()

            if (catalogProductIdToRestore && qtyToRestore > 0) {
                try {
                    const { data: product } = await ProductApi.GetProductById(catalogProductIdToRestore)
                    const current = product.stockQuantity ?? 0
                    await ProductApi.UpdateProduct(catalogProductIdToRestore, {
                        stockQuantity: current + qtyToRestore,
                    })
                    void refreshProductCatalog()
                } catch (e) {
                    alert(
                        `Строка удалена, но вернуть ${qtyToRestore} шт. на склад не удалось. Обновите остаток вручную.\n${axiosResponseMessage(e) || 'Ошибка обновления товара'}`
                    )
                }
            }
        } catch (e) {
            alert(`Не удалось удалить строку.\n${axiosResponseMessage(e) || 'Ошибка CRM'}`)
        } finally {
            setOfflineBusy(false)
        }
    }

    const orders = card?.orders ?? []
    const cart = card?.cart

    const tabBtn = (id: TabId, label: string) => (
        <button
            type="button"
            onClick={() => setTab(id)}
            className={`px-3 py-1.5 text-sm font-semibold border-b-2 transition-colors ${
                tab === id ? 'border-[var(--mint-bright)] text-[var(--mint-bright)]' : 'border-transparent text-white/50'
            }`}
        >
            {label}
        </button>
    )

    const profileSummary = useMemo(() => listRow, [listRow])

    return (
        <div
            className="fixed inset-0 z-[10000] flex items-center justify-center bg-black/90 p-4"
            onClick={onClose}
        >
            <div
                className="relative w-full max-w-4xl bg-[#1a1a1a] border border-[#333] rounded-lg overflow-hidden max-h-[92vh] flex flex-col"
                onClick={e => e.stopPropagation()}
            >
                <div className="sticky top-0 z-10 flex flex-wrap items-center justify-between gap-2 p-4 border-b border-[#333] bg-[#1a1a1a]">
                    <div>
                        <h1 className="text-[var(--mint-bright)] text-lg font-bold font-durik">CRM — клиент</h1>
                        <p className="text-white/60 text-sm">
                            Telegram ID: <span className="text-white font-mono">{telegramId}</span>
                            {profile?._id && (
                                <>
                                    {' '}
                                    · Mongo:{' '}
                                    <span className="text-white/80 font-mono text-xs">{profile._id}</span>
                                </>
                            )}
                        </p>
                    </div>
                    <button
                        type="button"
                        onClick={onClose}
                        className="w-8 h-8 rounded-full flex items-center justify-center bg-[#2a2a2a] hover:bg-[#333] border border-[#333]"
                        aria-label="Закрыть"
                    >
                        ×
                    </button>
                </div>

                <div className="flex gap-1 px-4 pt-2 border-b border-white/10 flex-wrap">
                    {tabBtn('profile', 'Профиль и офлайн')}
                    {tabBtn('orders', `Заказы (${orders.length})`)}
                    {tabBtn('cart', 'Корзина')}
                    {tabBtn('referrals', 'Рефералы')}
                </div>

                <div className="overflow-y-auto flex-1 p-4 text-white">
                    {loading && <p className="text-white/60 text-center py-8">Загрузка…</p>}
                    {error && !loading && (
                        <p className="text-red-300 text-center py-8">
                            {error}
                            <button
                                type="button"
                                className="block mx-auto mt-4 text-[var(--mint-bright)] underline"
                                onClick={() => loadCard()}
                            >
                                Повторить
                            </button>
                        </p>
                    )}

                    {!loading && !error && tab === 'profile' && profile && (
                        <div className="space-y-6">
                            <div className="text-sm text-white/50">
                                Онлайн-статистика (список): заказов всего — {profileSummary.stats?.ordersTotal ?? 0}, оплачено/завершено —{' '}
                                {profileSummary.stats?.ordersPaidOrCompleted ?? 0}, сумма (оплачено + завершено) —{' '}
                                {fmtMoney(profileSummary.stats?.totalSpent ?? 0)}, единиц — {profileSummary.stats?.totalUnitsPurchased ?? 0}
                            </div>

                            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                                <label className="block">
                                    <span className="text-xs text-white/50">Личное имя</span>
                                    <input
                                        className="mt-1 w-full bg-[#2a2a2a] border border-[#444] px-2 py-1.5 text-sm"
                                        value={form.personalFirstName}
                                        onChange={e => setForm(f => ({ ...f, personalFirstName: e.target.value }))}
                                    />
                                </label>
                                <label className="block">
                                    <span className="text-xs text-white/50">Личная фамилия</span>
                                    <input
                                        className="mt-1 w-full bg-[#2a2a2a] border border-[#444] px-2 py-1.5 text-sm"
                                        value={form.personalLastName}
                                        onChange={e => setForm(f => ({ ...f, personalLastName: e.target.value }))}
                                    />
                                </label>
                                <label className="block">
                                    <span className="text-xs text-white/50">Имя (Telegram)</span>
                                    <input
                                        className="mt-1 w-full bg-[#2a2a2a] border border-[#444] px-2 py-1.5 text-sm"
                                        value={form.firstName}
                                        onChange={e => setForm(f => ({ ...f, firstName: e.target.value }))}
                                    />
                                </label>
                                <label className="block">
                                    <span className="text-xs text-white/50">Фамилия (Telegram)</span>
                                    <input
                                        className="mt-1 w-full bg-[#2a2a2a] border border-[#444] px-2 py-1.5 text-sm"
                                        value={form.lastName}
                                        onChange={e => setForm(f => ({ ...f, lastName: e.target.value }))}
                                    />
                                </label>
                                <label className="block md:col-span-2">
                                    <span className="text-xs text-white/50">Email</span>
                                    <input
                                        className="mt-1 w-full bg-[#2a2a2a] border border-[#444] px-2 py-1.5 text-sm"
                                        value={form.email}
                                        onChange={e => setForm(f => ({ ...f, email: e.target.value }))}
                                    />
                                </label>
                                <label className="block md:col-span-2">
                                    <span className="text-xs text-white/50">Телефон (профиль)</span>
                                    <input
                                        className="mt-1 w-full bg-[#2a2a2a] border border-[#444] px-2 py-1.5 text-sm"
                                        value={form.userPhoneNumber}
                                        onChange={e => setForm(f => ({ ...f, userPhoneNumber: e.target.value }))}
                                    />
                                </label>
                                <label className="block">
                                    <span className="text-xs text-white/50">Username</span>
                                    <input
                                        className="mt-1 w-full bg-[#2a2a2a] border border-[#444] px-2 py-1.5 text-sm"
                                        value={form.username}
                                        onChange={e => setForm(f => ({ ...f, username: e.target.value }))}
                                    />
                                </label>
                                <label className="block">
                                    <span className="text-xs text-white/50">Кошелёк</span>
                                    <input
                                        className="mt-1 w-full bg-[#2a2a2a] border border-[#444] px-2 py-1.5 text-sm"
                                        value={form.walletAddress}
                                        onChange={e => setForm(f => ({ ...f, walletAddress: e.target.value }))}
                                    />
                                </label>
                                {!profile.owner && (
                                    <label className="flex items-center gap-2 md:col-span-2 cursor-pointer">
                                        <input
                                            type="checkbox"
                                            checked={form.isAdmin}
                                            onChange={e => setForm(f => ({ ...f, isAdmin: e.target.checked }))}
                                        />
                                        <span className="text-sm">Администратор</span>
                                    </label>
                                )}
                                <label className="block md:col-span-2">
                                    <span className="text-xs text-white/50">Дата рождения</span>
                                    <input
                                        type="date"
                                        className="mt-1 w-full bg-[#2a2a2a] border border-[#444] px-2 py-1.5 text-sm"
                                        value={form.dateOfBirth}
                                        onChange={e => setForm(f => ({ ...f, dateOfBirth: e.target.value }))}
                                    />
                                </label>
                            </div>

                            <div>
                                <h3 className="text-[var(--mint-bright)] text-sm font-bold mb-2">Мерки (см)</h3>
                                <div className="grid grid-cols-2 md:grid-cols-3 gap-2">
                                    {(
                                        [
                                            ['heightCm', 'Рост', form.heightCm],
                                            ['chestCircumferenceCm', 'Грудь', form.chestCircumferenceCm],
                                            ['waistCircumferenceCm', 'Талия', form.waistCircumferenceCm],
                                            ['hipsCircumferenceCm', 'Бёдра', form.hipsCircumferenceCm],
                                            ['armLengthCm', 'Рукав', form.armLengthCm],
                                            ['trousersLengthCm', 'Длина брюк', form.trousersLengthCm],
                                        ] as const
                                    ).map(([key, label, val]) => (
                                        <label key={key} className="block">
                                            <span className="text-xs text-white/50">{label}</span>
                                            <input
                                                type="number"
                                                min={0}
                                                className="mt-1 w-full bg-[#2a2a2a] border border-[#444] px-2 py-1.5 text-sm"
                                                value={val}
                                                onChange={e =>
                                                    setForm(f => ({ ...f, [key]: e.target.value } as typeof f))
                                                }
                                            />
                                        </label>
                                    ))}
                                </div>
                            </div>

                            <label className="block">
                                <span className="text-xs text-white/50">Заметки админа</span>
                                <textarea
                                    className="mt-1 w-full bg-[#2a2a2a] border border-[#444] px-2 py-2 text-sm min-h-[80px]"
                                    value={form.adminNotes}
                                    onChange={e => setForm(f => ({ ...f, adminNotes: e.target.value }))}
                                />
                            </label>

                            <div>
                                <h3 className="text-[var(--mint-bright)] text-sm font-bold mb-2">Адрес (PATCH — слияние)</h3>
                                <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
                                    <input
                                        placeholder="Получатель"
                                        className="bg-[#2a2a2a] border border-[#444] px-2 py-1.5 text-sm"
                                        value={form.shipFullName}
                                        onChange={e => setForm(f => ({ ...f, shipFullName: e.target.value }))}
                                    />
                                    <input
                                        placeholder="Телефон"
                                        className="bg-[#2a2a2a] border border-[#444] px-2 py-1.5 text-sm"
                                        value={form.shipPhone}
                                        onChange={e => setForm(f => ({ ...f, shipPhone: e.target.value }))}
                                    />
                                    <input
                                        placeholder="Город"
                                        className="bg-[#2a2a2a] border border-[#444] px-2 py-1.5 text-sm"
                                        value={form.shipCity}
                                        onChange={e => setForm(f => ({ ...f, shipCity: e.target.value }))}
                                    />
                                    <input
                                        placeholder="Индекс"
                                        className="bg-[#2a2a2a] border border-[#444] px-2 py-1.5 text-sm"
                                        value={form.shipPostal}
                                        onChange={e => setForm(f => ({ ...f, shipPostal: e.target.value }))}
                                    />
                                    <input
                                        placeholder="Страна"
                                        className="bg-[#2a2a2a] border border-[#444] px-2 py-1.5 text-sm"
                                        value={form.shipCountry}
                                        onChange={e => setForm(f => ({ ...f, shipCountry: e.target.value }))}
                                    />
                                    <input
                                        placeholder="Улица"
                                        className="bg-[#2a2a2a] border border-[#444] px-2 py-1.5 text-sm"
                                        value={form.shipStreet}
                                        onChange={e => setForm(f => ({ ...f, shipStreet: e.target.value }))}
                                    />
                                    <input
                                        placeholder="Дом"
                                        className="bg-[#2a2a2a] border border-[#444] px-2 py-1.5 text-sm"
                                        value={form.shipHouse}
                                        onChange={e => setForm(f => ({ ...f, shipHouse: e.target.value }))}
                                    />
                                    <input
                                        placeholder="Кв."
                                        className="bg-[#2a2a2a] border border-[#444] px-2 py-1.5 text-sm"
                                        value={form.shipApartment}
                                        onChange={e => setForm(f => ({ ...f, shipApartment: e.target.value }))}
                                    />
                                    <input
                                        placeholder="Примечания к адресу"
                                        className="md:col-span-2 bg-[#2a2a2a] border border-[#444] px-2 py-1.5 text-sm"
                                        value={form.shipNotes}
                                        onChange={e => setForm(f => ({ ...f, shipNotes: e.target.value }))}
                                    />
                                </div>
                            </div>

                            <button
                                type="button"
                                disabled={saving}
                                onClick={() => void handleSaveProfile()}
                                className="px-4 py-2 bg-[var(--pink-punk)] text-white font-semibold disabled:opacity-50"
                            >
                                {saving ? 'Сохранение…' : 'Сохранить изменения профиля'}
                            </button>

                            <div className="border-t border-white/10 pt-6">
                                <h3 className="text-[var(--mint-bright)] font-bold mb-3">Офлайн-покупки</h3>
                                <div className="overflow-x-auto mb-4">
                                    <table className="w-full text-xs text-left">
                                        <thead>
                                            <tr className="text-white/50 border-b border-white/10">
                                                <th className="py-2 pr-2">Тип</th>
                                                <th className="py-2 pr-2">Позиция</th>
                                                <th className="py-2 pr-2">Размер</th>
                                                <th className="py-2 pr-2">Кол-во</th>
                                                <th className="py-2 pr-2">Сумма</th>
                                                <th className="py-2 pr-2" />
                                            </tr>
                                        </thead>
                                        <tbody>
                                            {(profile.crmOfflinePurchases ?? []).map(line => (
                                                <tr key={line._id} className="border-b border-white/5">
                                                    <td className="py-2 pr-2">{line.kind}</td>
                                                    <td className="py-2 pr-2">{offlineLineLabel(line)}</td>
                                                    <td className="py-2 pr-2">
                                                        {line.kind === 'catalog' ? line.sizeSnapshot : '—'}
                                                    </td>
                                                    <td className="py-2 pr-2">{line.quantity}</td>
                                                    <td className="py-2 pr-2">
                                                        {line.kind === 'catalog'
                                                            ? fmtMoney(line.unitPrice * line.quantity)
                                                            : fmtMoney(line.customPrice * line.quantity)}
                                                    </td>
                                                    <td className="py-2 pr-2">
                                                        <button
                                                            type="button"
                                                            disabled={offlineBusy}
                                                            className="text-red-300 hover:underline disabled:opacity-40"
                                                            onClick={() => void handleDeleteOffline(line._id)}
                                                        >
                                                            Удалить
                                                        </button>
                                                    </td>
                                                </tr>
                                            ))}
                                        </tbody>
                                    </table>
                                </div>

                                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                    <div className="bg-[#252525] p-3 border border-[#333]">
                                        <h4 className="text-sm font-semibold text-white mb-2">Из каталога</h4>
                                        <select
                                            className="w-full bg-[#2a2a2a] border border-[#444] px-2 py-1.5 text-sm mb-2"
                                            value={catalogProductId}
                                            onChange={e => setCatalogProductId(e.target.value)}
                                        >
                                            <option value="">— товар (Mongo _id) —</option>
                                            {products.map(p => (
                                                <option key={p._id} value={p._id}>
                                                    {p.name} ({p.size}) · {p.price} BYN
                                                </option>
                                            ))}
                                        </select>
                                        <div className="flex gap-2 mb-2">
                                            <input
                                                type="number"
                                                min={1}
                                                className="flex-1 bg-[#2a2a2a] border border-[#444] px-2 py-1 text-sm"
                                                value={catalogQty}
                                                onChange={e => setCatalogQty(e.target.value)}
                                                placeholder="Кол-во"
                                            />
                                            <input
                                                className="flex-1 bg-[#2a2a2a] border border-[#444] px-2 py-1 text-sm"
                                                value={catalogPriceOverride}
                                                onChange={e => setCatalogPriceOverride(e.target.value)}
                                                placeholder="Цена за ед. (опц.)"
                                            />
                                        </div>
                                        <button
                                            type="button"
                                            disabled={offlineBusy || !catalogProductId}
                                            className="w-full py-1.5 bg-[var(--mint-bright)]/20 text-[var(--mint-bright)] text-sm font-semibold disabled:opacity-40"
                                            onClick={() => void handleAddCatalogOffline()}
                                        >
                                            Добавить
                                        </button>
                                    </div>
                                    <div className="bg-[#252525] p-3 border border-[#333]">
                                        <h4 className="text-sm font-semibold text-white mb-2">Кастом</h4>
                                        <input
                                            className="w-full bg-[#2a2a2a] border border-[#444] px-2 py-1.5 text-sm mb-2"
                                            value={customName}
                                            onChange={e => setCustomName(e.target.value)}
                                            placeholder="Название"
                                        />
                                        <textarea
                                            className="w-full bg-[#2a2a2a] border border-[#444] px-2 py-1.5 text-sm mb-2 min-h-[48px]"
                                            value={customDesc}
                                            onChange={e => setCustomDesc(e.target.value)}
                                            placeholder="Описание (опц.)"
                                        />
                                        <div className="flex gap-2 mb-2">
                                            <input
                                                className="flex-1 bg-[#2a2a2a] border border-[#444] px-2 py-1 text-sm"
                                                value={customPrice}
                                                onChange={e => setCustomPrice(e.target.value)}
                                                placeholder="Цена за ед."
                                            />
                                            <input
                                                type="number"
                                                min={1}
                                                className="w-24 bg-[#2a2a2a] border border-[#444] px-2 py-1 text-sm"
                                                value={customQty}
                                                onChange={e => setCustomQty(e.target.value)}
                                                placeholder="Кол-во"
                                            />
                                        </div>
                                        <button
                                            type="button"
                                            disabled={offlineBusy || !customName.trim() || !customPrice}
                                            className="w-full py-1.5 bg-[var(--mint-bright)]/20 text-[var(--mint-bright)] text-sm font-semibold disabled:opacity-40"
                                            onClick={() => void handleAddCustomOffline()}
                                        >
                                            Добавить кастом
                                        </button>
                                    </div>
                                </div>
                            </div>
                        </div>
                    )}

                    {!loading && !error && tab === 'orders' && (
                        <div className="space-y-4">
                            {orders.length === 0 && <p className="text-white/50">Заказов нет</p>}
                            {orders.map((o: PinkPunkOrder) => {
                                const addr = o.shippingAddress
                                const emailCheckout = o.customerEmail?.trim()
                                const emailLegacy = o.email?.trim()
                                return (
                                    <div key={o._id} className="bg-[#252525] border border-[#333] p-3 text-sm space-y-3">
                                        <div className="flex flex-wrap justify-between gap-2 items-start">
                                            <span className="font-semibold text-[var(--mint-bright)]">{o.orderNumber}</span>
                                            <span className="text-white/75 text-xs sm:text-sm">
                                                {ORDER_STATUS_RU[o.status] ?? o.status}
                                            </span>
                                            <span className="font-medium">{fmtMoney(o.totalAmount)}</span>
                                        </div>

                                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-x-4 gap-y-1.5 text-xs border-t border-[#333] pt-2">
                                            <p>
                                                <span className="text-white/45">Mongo _id</span>{' '}
                                                <span className="font-mono text-white/85 break-all">{o._id}</span>
                                            </p>
                                            <p>
                                                <span className="text-white/45">Корзина</span>{' '}
                                                <span className="font-mono text-white/85 break-all">
                                                    {o.cart?.trim() ? o.cart : '—'}
                                                </span>
                                            </p>
                                            <p>
                                                <span className="text-white/45">userId в заказе</span>{' '}
                                                <span className="text-white/85">{o.userId || '—'}</span>
                                            </p>
                                            <p>
                                                <span className="text-white/45">Создан</span>{' '}
                                                <span className="text-white/85">{fmtDt(o.createdAt)}</span>
                                            </p>
                                            <p>
                                                <span className="text-white/45">Обновлён</span>{' '}
                                                <span className="text-white/85">{fmtDt(o.updatedAt)}</span>
                                            </p>
                                            <p>
                                                <span className="text-white/45">Подытог</span>{' '}
                                                <span className="text-white/85">{fmtMoney(o.subtotal)}</span>
                                            </p>
                                            <p>
                                                <span className="text-white/45">Доставка</span>{' '}
                                                <span className="text-white/85">
                                                    {o.shippingCost != null ? fmtMoney(o.shippingCost) : '—'}
                                                </span>
                                            </p>
                                            <p>
                                                <span className="text-white/45">Способ оплаты</span>{' '}
                                                <span className="text-white/85">{paymentMethodRu(o.paymentMethod)}</span>
                                            </p>
                                            <p className="sm:col-span-2">
                                                <span className="text-white/45">Трекинг</span>{' '}
                                                <span className="text-white/85">{o.trackingNumber?.trim() || '—'}</span>
                                            </p>
                                        </div>

                                        {(o.userPhoneNumber?.trim() ||
                                            o.personalFirstName?.trim() ||
                                            o.personalLastName?.trim() ||
                                            emailCheckout ||
                                            emailLegacy) && (
                                            <div className="text-xs space-y-1 border-t border-[#333] pt-2">
                                                <p className="text-white/50 font-medium uppercase tracking-wide">
                                                    Контакты в заказе
                                                </p>
                                                {(o.personalFirstName?.trim() || o.personalLastName?.trim()) && (
                                                    <p>
                                                        <span className="text-white/45">Имя</span>{' '}
                                                        <span className="text-white/85">
                                                            {[o.personalFirstName, o.personalLastName].filter(Boolean).join(' ')}
                                                        </span>
                                                    </p>
                                                )}
                                                {o.userPhoneNumber?.trim() && (
                                                    <p>
                                                        <span className="text-white/45">Телефон</span>{' '}
                                                        <span className="text-white/85">{o.userPhoneNumber}</span>
                                                    </p>
                                                )}
                                                {(emailCheckout || emailLegacy) && (
                                                    <p>
                                                        <span className="text-white/45">Email</span>{' '}
                                                        <span className="text-white/85">
                                                            {emailCheckout || emailLegacy}
                                                            {emailCheckout &&
                                                                emailLegacy &&
                                                                emailCheckout !== emailLegacy && (
                                                                    <span className="text-white/40">
                                                                        {' '}
                                                                        (legacy поле: {emailLegacy})
                                                                    </span>
                                                                )}
                                                        </span>
                                                    </p>
                                                )}
                                            </div>
                                        )}

                                        {addr &&
                                            (addr.fullName?.trim() ||
                                                addr.phone?.trim() ||
                                                addr.city?.trim() ||
                                                addr.street?.trim() ||
                                                addr.postalCode?.trim()) && (
                                                <div className="text-xs space-y-1 border-t border-[#333] pt-2">
                                                    <p className="text-white/50 font-medium uppercase tracking-wide">
                                                        Адрес доставки
                                                    </p>
                                                    {addr.fullName?.trim() && (
                                                        <p>
                                                            <span className="text-white/45">Получатель</span>{' '}
                                                            <span className="text-white/85">{addr.fullName}</span>
                                                        </p>
                                                    )}
                                                    {addr.phone?.trim() && (
                                                        <p>
                                                            <span className="text-white/45">Тел. в адресе</span>{' '}
                                                            <span className="text-white/85">{addr.phone}</span>
                                                        </p>
                                                    )}
                                                    <p>
                                                        <span className="text-white/45">Строка</span>{' '}
                                                        <span className="text-white/85">
                                                            {formatShippingAddress(addr) || '—'}
                                                        </span>
                                                    </p>
                                                    {[
                                                        ['Улица', addr.street],
                                                        ['Дом', addr.house],
                                                        ['Квартира', addr.apartment],
                                                        ['Город', addr.city],
                                                        ['Индекс', addr.postalCode],
                                                        ['Страна', addr.country],
                                                    ].map(([label, val]) =>
                                                        val?.trim() ? (
                                                            <p key={label as string}>
                                                                <span className="text-white/45">{label}</span>{' '}
                                                                <span className="text-white/85">{val}</span>
                                                            </p>
                                                        ) : null,
                                                    )}
                                                    {addr.notes?.trim() && (
                                                        <p>
                                                            <span className="text-white/45">Примечание к адресу</span>{' '}
                                                            <span className="text-white/85">{addr.notes}</span>
                                                        </p>
                                                    )}
                                                </div>
                                            )}

                                        {o.notes?.trim() && (
                                            <div className="text-xs border-t border-[#333] pt-2">
                                                <span className="text-white/45">Комментарий к заказу</span>{' '}
                                                <span className="text-white/85 whitespace-pre-wrap">{o.notes}</span>
                                            </div>
                                        )}

                                        <div className="border-t border-[#333] pt-2">
                                            <p className="text-white/50 text-xs font-medium uppercase tracking-wide mb-2">
                                                Позиции ({o.items?.length ?? 0})
                                            </p>
                                            {(!o.items || o.items.length === 0) && (
                                                <p className="text-white/45 text-xs">Позиций нет</p>
                                            )}
                                            {o.items && o.items.length > 0 && (
                                                <div className="overflow-x-auto">
                                                    <table className="w-full text-xs text-left border-collapse">
                                                        <thead>
                                                            <tr className="text-white/45 border-b border-[#444]">
                                                                <th className="py-1.5 pr-2 font-normal">Товар</th>
                                                                <th className="py-1.5 pr-2 font-normal">Артикул</th>
                                                                <th className="py-1.5 pr-2 font-normal">Mongo</th>
                                                                <th className="py-1.5 pr-2 font-normal">Размер</th>
                                                                <th className="py-1.5 pr-2 font-normal text-right">Цена</th>
                                                                <th className="py-1.5 pr-2 font-normal text-right">Кол-во</th>
                                                                <th className="py-1.5 font-normal text-right">Сумма</th>
                                                            </tr>
                                                        </thead>
                                                        <tbody>
                                                            {o.items.map((it, i) => {
                                                                const pop = isOrderItemProductPopulated(it.product)
                                                                    ? it.product
                                                                    : null
                                                                const mongoId =
                                                                    typeof it.product === 'string'
                                                                        ? it.product
                                                                        : pop?._id ?? '—'
                                                                const slug = pop?.productId ?? '—'
                                                                const lineSum = (it.price ?? 0) * (it.quantity ?? 0)
                                                                const cat = pop?.category?.trim()
                                                                const desc = pop?.description?.trim()
                                                                const photoUrls = orderItemPhotoUrls(it)
                                                                const [mainPhoto, ...morePhotos] = photoUrls
                                                                return (
                                                                    <tr key={i} className="border-b border-[#333]/80 align-top">
                                                                        <td className="py-2 pr-2 text-white/90">
                                                                            <div className="flex gap-2.5 items-start">
                                                                                {mainPhoto ? (
                                                                                    <div className="relative w-14 h-14 flex-shrink-0 rounded overflow-hidden border border-white/10 bg-black/30">
                                                                                        <LazyImage
                                                                                            src={mainPhoto}
                                                                                            alt={orderItemLabel(it)}
                                                                                            className="w-full h-full"
                                                                                        />
                                                                                    </div>
                                                                                ) : null}
                                                                                <div className="min-w-0 flex-1 space-y-0.5">
                                                                                    <span className="font-medium block">
                                                                                        {orderItemLabel(it)}
                                                                                    </span>
                                                                                    {cat && (
                                                                                        <span className="block text-white/45">
                                                                                            {cat}
                                                                                        </span>
                                                                                    )}
                                                                                    {desc && (
                                                                                        <span className="block text-white/40 line-clamp-2">
                                                                                            {desc}
                                                                                        </span>
                                                                                    )}
                                                                                    {pop?.stockQuantity != null && (
                                                                                        <span className="block text-white/35">
                                                                                            Остаток на момент карточки:{' '}
                                                                                            {pop.stockQuantity}
                                                                                        </span>
                                                                                    )}
                                                                                    {morePhotos.length > 0 && (
                                                                                        <div className="flex flex-wrap gap-1 pt-1">
                                                                                            {morePhotos.map((url, pi) => (
                                                                                                <div
                                                                                                    key={pi}
                                                                                                    className="relative w-9 h-9 flex-shrink-0 rounded overflow-hidden border border-white/10 bg-black/30"
                                                                                                >
                                                                                                    <LazyImage
                                                                                                        src={url}
                                                                                                        alt={`${orderItemLabel(it)} — ${pi + 2}`}
                                                                                                        className="w-full h-full"
                                                                                                    />
                                                                                                </div>
                                                                                            ))}
                                                                                        </div>
                                                                                    )}
                                                                                </div>
                                                                            </div>
                                                                        </td>
                                                                        <td className="py-2 pr-2 font-mono text-white/70">
                                                                            {slug}
                                                                        </td>
                                                                        <td className="py-2 pr-2 font-mono text-white/60 break-all max-w-[120px]">
                                                                            {mongoId}
                                                                        </td>
                                                                        <td className="py-2 pr-2 text-white/80">
                                                                            {it.size || pop?.size || '—'}
                                                                        </td>
                                                                        <td className="py-2 pr-2 text-right text-white/80">
                                                                            {fmtMoney(it.price)}
                                                                        </td>
                                                                        <td className="py-2 pr-2 text-right text-white/80">
                                                                            {it.quantity}
                                                                        </td>
                                                                        <td className="py-2 text-right font-medium text-white/90">
                                                                            {fmtMoney(lineSum)}
                                                                        </td>
                                                                    </tr>
                                                                )
                                                            })}
                                                        </tbody>
                                                    </table>
                                                </div>
                                            )}
                                        </div>
                                    </div>
                                )
                            })}
                        </div>
                    )}

                    {!loading && !error && tab === 'cart' && (
                        <div>
                            {!cart ? (
                                <p className="text-white/50">Нет активной корзины</p>
                            ) : (
                                <div className="bg-[#252525] p-4 border border-[#333]">
                                    <p>Позиций: {cart.totalItems}</p>
                                    <p>Сумма: {fmtMoney(cart.totalPrice)}</p>
                                    <p className="text-white/50 text-sm">Обновлено: {fmtDt(cart.lastUpdated)}</p>
                                </div>
                            )}
                        </div>
                    )}

                    {!loading && !error && tab === 'referrals' && (
                        <div>
                            <p className="text-lg">
                                Приглашено рефералов:{' '}
                                <span className="text-[var(--mint-bright)] font-bold">{card?.referralsCount ?? 0}</span>
                            </p>
                            <p className="text-white/50 text-sm mt-2">
                                Список приглашённых в CRM отдельно не отдаётся — только счётчик (см. публичный профиль
                                или расширение API).
                            </p>
                        </div>
                    )}
                </div>
            </div>
        </div>
    )
}
