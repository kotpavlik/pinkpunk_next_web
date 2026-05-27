'use client'

import { useCallback, useEffect, useMemo, useRef, useState, type KeyboardEvent, type MouseEvent } from 'react'
import { isAxiosError } from 'axios'
import {
    CrmApi,
    CrmListUser,
    CrmUpdateUserDto,
    CrmUserCardResponse,
    CrmAddOfflineCustomBody,
    CrmOfflineLine,
    CrmProductRef,
    type CrmInsufficientStockErrorBody,
} from '@/api/CrmApi'
import { accountObjectIdFromCrmListRow } from '@/utils/mongoObjectId'
import {
    isOrderItemProductPopulated,
    type OrderItem,
    type PinkPunkOrder,
    type ShippingAddress,
} from '@/api/OrderApi'
import { ProductApi, type ProductResponse } from '@/api/ProductApi'
import LazyImage from '@/components/common/LazyImage'
import { useAppStore } from '@/zustand/app_store/AppStore'
import { formatProductName } from '@/utils/formatProductName'
import { crmUserDisplayName } from '@/utils/crmUserDisplayName'
import { CheckIcon, ClipboardDocumentIcon } from '@heroicons/react/24/outline'
import type { CrmLoyalty, LoyaltyStatus } from '@/api/LoyaltyApi'
import { resolveEffectiveDiscountPercent } from '@/api/LoyaltyApi'
import {
    computeLineDiscountedSum,
    hasCartDiscount,
    resolveCartPricing,
} from '@/utils/cartPricing'
import AdminCrmLoyaltyTab from '@/components/ui/admin/AdminCrmLoyaltyTab'
import CrmUserHeaderMeta from '@/components/ui/admin/CrmUserHeaderMeta'

type TabId = 'profile' | 'offline' | 'orders' | 'cart' | 'referrals' | 'loyalty'

type CrmDblEditRowProps = {
    editKey: string
    label: string
    displayValue: string
    value: string
    onChange: (v: string) => void
    editingField: string | null
    setEditingField: (k: string | null) => void
    inputType?: 'text' | 'number' | 'date' | 'textarea'
    rows?: number
    /** Для type=number: нижняя граница и блокировка ввода ниже неё */
    numberMin?: number
    /** После завершения редактирования (blur / Enter) — сохранить на сервер */
    onAfterBlur?: () => void
}

function CrmDblEditRow({
    editKey,
    label,
    displayValue,
    value,
    onChange,
    editingField,
    setEditingField,
    inputType = 'text',
    rows = 3,
    numberMin,
    onAfterBlur,
}: CrmDblEditRowProps) {
    const editing = editingField === editKey
    const shown = displayValue.trim() ? displayValue : '—'
    const isTextarea = inputType === 'textarea'

    const commit = () => setEditingField(null)

    const finishEditing = () => {
        commit()
        onAfterBlur?.()
    }

    const handleKeyDown = (e: KeyboardEvent<HTMLInputElement | HTMLTextAreaElement>) => {
        if (!isTextarea && inputType === 'number' && e.key === '-') {
            e.preventDefault()
            return
        }
        if (isTextarea) {
            if (e.key === 'Enter' && (e.ctrlKey || e.metaKey)) {
                e.preventDefault()
                finishEditing()
            }
        } else if (e.key === 'Enter') {
            e.preventDefault()
            finishEditing()
        }
    }

    const handleNumberChange = (raw: string) => {
        if (numberMin === undefined) {
            onChange(raw)
            return
        }
        const t = raw.trim()
        if (!t) {
            onChange(raw)
            return
        }
        const n = Number(t)
        if (!Number.isNaN(n) && n < numberMin) {
            onChange(String(numberMin))
            return
        }
        onChange(raw)
    }

    const rowAlign = isTextarea ? 'sm:items-start' : 'sm:items-center'

    return (
        <div
            className={`flex flex-col gap-0.5 border-b border-white/[0.07] py-1.5 text-sm sm:flex-row sm:gap-3 ${rowAlign}`}
            title={
                isTextarea
                    ? 'Двойной щелчок — редактировать. Ctrl+Enter — готово.'
                    : 'Двойной щелчок — редактировать. Enter — готово.'
            }
            onDoubleClick={() => setEditingField(editKey)}
        >
            <span className={`w-44 shrink-0 text-white/45 ${isTextarea ? 'sm:pt-1.5' : ''}`}>{label}</span>
            <div className="min-w-0 flex-1">
                {editing ? (
                    isTextarea ? (
                        <textarea
                            autoFocus
                            rows={rows}
                            className="box-border min-h-[68px] w-full resize-y rounded border border-[var(--mint-bright)] bg-[#2a2a2a] px-2 py-1 text-sm text-white outline-none"
                            value={value}
                            onChange={e => onChange(e.target.value)}
                            onBlur={finishEditing}
                            onKeyDown={handleKeyDown}
                        />
                    ) : (
                        <input
                            autoFocus
                            type={inputType}
                            min={inputType === 'number' ? (numberMin ?? 0) : undefined}
                            className="box-border h-9 w-full min-w-0 rounded border border-[var(--mint-bright)] bg-[#2a2a2a] px-2 py-1 text-sm leading-normal text-white outline-none"
                            value={value}
                            onChange={e =>
                                inputType === 'number' && numberMin !== undefined
                                    ? handleNumberChange(e.target.value)
                                    : onChange(e.target.value)
                            }
                            onBlur={finishEditing}
                            onKeyDown={handleKeyDown}
                        />
                    )
                ) : (
                    <div
                        className={
                            isTextarea
                                ? 'box-border min-h-[68px] w-full cursor-default select-none whitespace-pre-wrap break-words rounded border border-transparent px-2 py-1 text-sm leading-normal text-white/88'
                                : 'box-border flex h-9 w-full min-w-0 cursor-default select-none items-center overflow-hidden rounded border border-transparent px-2 py-1 text-sm leading-normal text-white/88'
                        }
                    >
                        {isTextarea ? shown : <span className="block min-w-0 truncate">{shown}</span>}
                    </div>
                )}
            </div>
        </div>
    )
}

function isPopulatedProduct(p: string | CrmProductRef): p is CrmProductRef {
    return typeof p === 'object' && p !== null && 'name' in p
}

function axiosResponseMessage(e: unknown): string {
    if (e && typeof e === 'object' && 'response' in e) {
        const d = (e as { response?: { data?: { message?: unknown } } }).response?.data
        const m = d?.message
        if (typeof m === 'string') return m
        if (Array.isArray(m)) return m.join('\n')
    }
    if (e instanceof Error) return e.message
    return ''
}

function offlineLineLabel(line: CrmOfflineLine): string {
    if (line.kind === 'custom') return line.customName
    if (isPopulatedProduct(line.product)) return formatProductName(line.product.name)
    return formatProductName(line.productNameSnapshot)
}

function offlineLineDescription(line: CrmOfflineLine): string | undefined {
    if (line.kind !== 'custom') return undefined
    const desc = line.customDescription?.trim()
    return desc || undefined
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

function CrmReadOnlyCopyRow({ label, displayText, copyText, title }: { label: string; displayText: string; copyText: string; title: string }) {
    const [copied, setCopied] = useState(false)
    const trimmed = copyText.trim()
    const canCopy = trimmed.length > 0

    const handleCopy = async (e: MouseEvent) => {
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
        <div
            className="flex flex-col gap-0.5 border-b border-white/[0.07] py-1.5 text-sm sm:flex-row sm:items-center sm:gap-3"
            title={title}
        >
            <span className="w-44 shrink-0 text-white/45">{label}</span>
            <div className="min-w-0 flex-1 flex items-center gap-1">
                <span className="box-border flex h-9 min-w-0 flex-1 items-center overflow-hidden rounded border border-transparent px-2 py-1 text-sm leading-normal text-white/88">
                    <span className="truncate">{displayText.trim() ? displayText : '—'}</span>
                </span>
                <button
                    type="button"
                    disabled={!canCopy}
                    onClick={handleCopy}
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
            </div>
        </div>
    )
}

/** Для поля date (YYYY-MM-DD) — короткий показ */
function fmtDobShort(ymd: string) {
    const t = ymd.trim()
    if (!t) return ''
    const d = new Date(t + 'T12:00:00')
    return Number.isNaN(d.getTime()) ? t : d.toLocaleDateString('ru-RU')
}

const ORDER_STATUS_RU: Record<PinkPunkOrder['status'], string> = {
    pending_confirmation: 'Ожидает подтверждения',
    confirmed: 'Подтверждён',
    paid: 'Оплачен',
    completed: 'Завершён',
    cancelled: 'Отменён',
}

function orderItemLabel(it: OrderItem): string {
    if (isOrderItemProductPopulated(it.product)) return formatProductName(it.product.name)
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
    /** Обновить loyalty в строке списка (рамка карточки) */
    onUserLoyaltyChange?: (accountId: string, loyalty: LoyaltyStatus) => void
    /** В потоке страницы у блока CRM: без фикс. оверлея, без скролла только внутри панели */
    embedded?: boolean
}

export default function AdminCrmUserDetailModal({
    listRow,
    onClose,
    onListRefresh,
    onUserLoyaltyChange,
    embedded = false,
}: Props) {
    const accountId = accountObjectIdFromCrmListRow(listRow) ?? ''
    const telegramNumericId =
        listRow.telegramUserId != null && typeof listRow.telegramUserId === 'number'
            ? listRow.telegramUserId
            : typeof listRow.userId === 'number'
              ? listRow.userId
              : null
    const { setStatus } = useAppStore()
    const [tab, setTab] = useState<TabId>('profile')
    const [editingField, setEditingField] = useState<string | null>(null)
    const [loading, setLoading] = useState(true)
    const [error, setError] = useState<string | null>(null)
    const [card, setCard] = useState<CrmUserCardResponse | null>(null)

    const [saving, setSaving] = useState(false)
    const saveInFlightRef = useRef(false)
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
    const [catalogQty, setCatalogQty] = useState('')
    const [catalogPriceOverride, setCatalogPriceOverride] = useState('')
    const [customName, setCustomName] = useState('')
    const [customDesc, setCustomDesc] = useState('')
    const [customPrice, setCustomPrice] = useState('')
    const [customQty, setCustomQty] = useState('')
    const [offlineBusy, setOfflineBusy] = useState(false)
    /** О.errors сохранения / офлайн — под основным блоком карточки CRM */
    const [crmBannerError, setCrmBannerError] = useState<string | null>(null)
    const [confirmDeleteLine, setConfirmDeleteLine] = useState<{ lineId: string; label: string } | null>(null)
    const [cartRefreshing, setCartRefreshing] = useState(false)
    const [loyalty, setLoyalty] = useState<CrmLoyalty | null>(null)

    const headerClientName = useMemo(
        () =>
            crmUserDisplayName(
                card
                    ? {
                          personalFirstName: form.personalFirstName,
                          personalLastName: form.personalLastName,
                          username: form.username,
                      }
                    : listRow,
            ),
        [card, form.personalFirstName, form.personalLastName, form.username, listRow],
    )

    useEffect(() => {
        setCrmBannerError(null)
    }, [tab])

    useEffect(() => {
        if (!confirmDeleteLine) return
        const onKey = (e: globalThis.KeyboardEvent) => {
            if (e.key === 'Escape' && !offlineBusy) setConfirmDeleteLine(null)
        }
        window.addEventListener('keydown', onKey)
        return () => window.removeEventListener('keydown', onKey)
    }, [confirmDeleteLine, offlineBusy])

    const syncListLoyalty = useCallback(
        (data: LoyaltyStatus) => {
            if (!accountId || !onUserLoyaltyChange) return
            onUserLoyaltyChange(accountId, data)
        },
        [accountId, onUserLoyaltyChange],
    )

    const loadCard = useCallback(async () => {
        if (!accountId) {
            setLoading(false)
            setError(
                'Нет валидного Mongo accountId в строке списка (_id должен быть 24 hex). Обновите список CRM; для клиентов только с Telegram проверьте, что бэкенд отдаёт _id аккаунта, а не числовой id.',
            )
            return
        }
        setLoading(true)
        setError(null)
        try {
            const data = await CrmApi.getUserCard(accountId)
            setCard(data)
            if (data.loyalty) {
                setLoyalty(data.loyalty)
                syncListLoyalty(data.loyalty)
            } else {
                setLoyalty(null)
                try {
                    const loyaltyData = await CrmApi.getUserLoyalty(accountId)
                    setLoyalty(loyaltyData)
                    setCard(c => (c ? { ...c, loyalty: loyaltyData } : c))
                    syncListLoyalty(loyaltyData)
                } catch {
                    /* loyalty endpoint может отсутствовать на старом бэке */
                }
            }
        } catch (e: unknown) {
            const msg =
                e && typeof e === 'object' && 'response' in e
                    ? String((e as { response?: { data?: { message?: string } } }).response?.data?.message || '')
                    : ''
            setError(msg || 'Не удалось загрузить карточку клиента')
        } finally {
            setLoading(false)
        }
    }, [accountId, syncListLoyalty])

    const refreshLoyalty = useCallback(async () => {
        if (!accountId) return
        try {
            const data = await CrmApi.getUserLoyalty(accountId)
            setLoyalty(data)
            setCard(c => (c ? { ...c, loyalty: data } : c))
            syncListLoyalty(data)
        } catch {
            /* тихо — ошибку покажет вкладка loyalty */
        }
    }, [accountId, syncListLoyalty])

    const handleLoyaltyUpdated = useCallback(
        (updated: CrmLoyalty) => {
            setLoyalty(updated)
            setCard(c => (c ? { ...c, loyalty: updated } : c))
            syncListLoyalty(updated)
        },
        [syncListLoyalty],
    )

    const handleRefreshCart = useCallback(async () => {
        if (!accountId) return
        setCartRefreshing(true)
        setCrmBannerError(null)
        try {
            const data = await CrmApi.getUserCard(accountId)
            setCard(data)
            onListRefresh()
        } catch (e: unknown) {
            const msg =
                e && typeof e === 'object' && 'response' in e
                    ? String((e as { response?: { data?: { message?: string } } }).response?.data?.message || '')
                    : ''
            setCrmBannerError(msg || 'Не удалось обновить данные карточки')
        } finally {
            setCartRefreshing(false)
        }
    }, [accountId, onListRefresh])

    useEffect(() => {
        loadCard()
    }, [loadCard])

    useEffect(() => {
        if (!embedded) return
        const onKey = (e: globalThis.KeyboardEvent) => {
            if (e.key === 'Escape') onClose()
        }
        window.addEventListener('keydown', onKey)
        return () => window.removeEventListener('keydown', onKey)
    }, [embedded, onClose])

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

    const loadProducts = useCallback(async () => {
        if (productsLoaded) return
        try {
            const { data } = await ProductApi.GetAllProducts(true)
            setProducts(
                Array.isArray(data)
                    ? data.map((p) => ({ ...p, name: formatProductName(p.name) }))
                    : [],
            )
            setProductsLoaded(true)
        } catch {
            setProducts([])
            setProductsLoaded(true)
        }
    }, [productsLoaded])

    const applyProductStockFromCrm = useCallback((stock: { productId: string; stockQuantity: number }) => {
        setProducts(prev =>
            prev.map(p => (p._id === stock.productId ? { ...p, stockQuantity: stock.stockQuantity } : p))
        )
    }, [])

    useEffect(() => {
        if (tab === 'offline') void loadProducts()
    }, [tab, loadProducts])

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
        const wa = str(form.walletAddress, profile.walletAddress)
        if (wa !== undefined) p.walletAddress = wa

        if (!profile.owner && form.isAdmin !== !!profile.isAdmin) {
            p.isAdmin = form.isAdmin
        }

        const dobNew = form.dateOfBirth.trim()
        const dobOld = profile.dateOfBirth ? profile.dateOfBirth.slice(0, 10) : ''
        if (dobNew !== dobOld) p.dateOfBirth = dobNew || undefined

        /** Целые см для мерок (бэкенд отклоняет дробные) */
        const intMeasure = (raw: string, prev?: number) => {
            const t = raw.trim()
            if (!t) return prev === undefined ? undefined : null
            const n = Math.round(Number(t))
            return Number.isNaN(n) ? prev : n
        }
        const nonNeg = (v: number | null | undefined) =>
            v === undefined || v === null ? v : Math.max(0, v)

        const hm = nonNeg(intMeasure(form.heightCm, profile.heightCm))
        if (hm !== undefined && hm !== profile.heightCm) p.heightCm = hm === null ? undefined : hm
        const hips = intMeasure(form.hipsCircumferenceCm, profile.hipsCircumferenceCm)
        if (hips !== undefined && hips !== profile.hipsCircumferenceCm)
            p.hipsCircumferenceCm = hips === null ? undefined : hips
        const arm = intMeasure(form.armLengthCm, profile.armLengthCm)
        if (arm !== undefined && arm !== profile.armLengthCm) p.armLengthCm = arm === null ? undefined : arm
        const ch = nonNeg(intMeasure(form.chestCircumferenceCm, profile.chestCircumferenceCm))
        if (ch !== undefined && ch !== profile.chestCircumferenceCm)
            p.chestCircumferenceCm = ch === null ? undefined : ch
        const ws = nonNeg(intMeasure(form.waistCircumferenceCm, profile.waistCircumferenceCm))
        if (ws !== undefined && ws !== profile.waistCircumferenceCm)
            p.waistCircumferenceCm = ws === null ? undefined : ws
        const tr = intMeasure(form.trousersLengthCm, profile.trousersLengthCm)
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
            /* Частичный PATCH: только изменившиеся ключи (см. CRM § 6.3). */
            p.shippingAddress = addrPatch as CrmUpdateUserDto['shippingAddress']
        }

        return p
    }, [form, profile])

    const persistProfileChanges = useCallback(async () => {
        if (!profile || saveInFlightRef.current) return

        const patch = buildPatch()
        if (!Object.keys(patch).length) return

        saveInFlightRef.current = true
        setSaving(true)
        setStatus('loading')
        setCrmBannerError(null)
        try {
            await CrmApi.patchUser(accountId, patch)
            let data: CrmUserCardResponse
            try {
                data = await CrmApi.getUserCard(accountId)
            } catch {
                setCrmBannerError(
                    'Изменения отправлены на сервер, но не удалось перезагрузить карточку. Закройте окно и откройте клиента снова.',
                )
                setStatus('failed')
                return
            }

            if (patch.shippingAddress && data.profile) {
                const base: ShippingAddress = {
                    fullName: '',
                    phone: '',
                    city: '',
                    postalCode: '',
                    country: '',
                    ...data.profile.shippingAddress,
                    ...patch.shippingAddress,
                }
                data = { ...data, profile: { ...data.profile, shippingAddress: base } }
            }

            setCard(data)
            onListRefresh()
            setStatus('success')
        } catch (e: unknown) {
            setStatus('failed')
            setCrmBannerError(axiosResponseMessage(e) || 'Ошибка сохранения')
        } finally {
            saveInFlightRef.current = false
            setSaving(false)
        }
    }, [accountId, buildPatch, onListRefresh, profile])

    const saveProfileOnBlur = useCallback(() => {
        window.setTimeout(() => {
            void persistProfileChanges()
        }, 0)
    }, [persistProfileChanges])

    /** Каталог: склад и строка CRM — один запрос POST; остаток в ответе (`productStock`). */
    const handleAddCatalogOffline = async () => {
        setCrmBannerError(null)
        if (!catalogProductId.trim()) {
            setCrmBannerError('Выберите товар из списка.')
            return
        }
        const qtyRaw = catalogQty.trim()
        if (qtyRaw === '') {
            setCrmBannerError('Введите количество.')
            return
        }
        const q = parseInt(qtyRaw, 10)
        if (Number.isNaN(q) || q < 1) {
            setCrmBannerError('Введите количество — целое число не меньше 1.')
            return
        }
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
            const res = await CrmApi.addOfflinePurchase(accountId, body)
            setCard(c =>
                c ? { ...c, profile: { ...c.profile, crmOfflinePurchases: res.crmOfflinePurchases } } : c
            )
            if (res.productStock) applyProductStockFromCrm(res.productStock)
            onListRefresh()
            void refreshLoyalty()
            setCrmBannerError(null)
            setCatalogProductId('')
            setCatalogQty('')
            setCatalogPriceOverride('')
        } catch (e) {
            if (isAxiosError(e) && e.response?.status === 409) {
                const d = e.response.data as CrmInsufficientStockErrorBody
                if (d?.code === 'INSUFFICIENT_STOCK') {
                    setCrmBannerError(
                        d.message?.trim() ||
                            `Недостаточно на складе: «${formatProductName(d.productName ?? 'товар')}» — запрошено ${d.requestedQty ?? q} шт., в наличии ${d.availableQty ?? '?'}.`
                    )
                    return
                }
            }
            const err = axiosResponseMessage(e)
            setCrmBannerError(err ? `Не удалось добавить офлайн-покупку.\n${err}` : 'Не удалось добавить офлайн-покупку.')
        } finally {
            setOfflineBusy(false)
        }
    }

    const handleAddCustomOffline = async () => {
        setCrmBannerError(null)
        if (!customName.trim()) {
            setCrmBannerError('Введите название позиции.')
            return
        }
        if (!customPrice.trim()) {
            setCrmBannerError('Укажите цену.')
            return
        }
        const price = Number(customPrice)
        const qtyRaw = customQty.trim()
        if (qtyRaw === '') {
            setCrmBannerError('Введите количество.')
            return
        }
        const q = parseInt(qtyRaw, 10)
        if (Number.isNaN(q) || q < 1) {
            setCrmBannerError('Введите количество — целое число не меньше 1.')
            return
        }
        if (Number.isNaN(price)) {
            setCrmBannerError('Укажите цену.')
            return
        }
        const body: CrmAddOfflineCustomBody = {
            kind: 'custom',
            customName: customName.trim(),
            customDescription: customDesc.trim() || undefined,
            customPrice: price,
            quantity: q,
        }
        setOfflineBusy(true)
        try {
            const res = await CrmApi.addOfflinePurchase(accountId, body)
            setCard(c =>
                c ? { ...c, profile: { ...c.profile, crmOfflinePurchases: res.crmOfflinePurchases } } : c
            )
            onListRefresh()
            void refreshLoyalty()
            setCrmBannerError(null)
            setCustomName('')
            setCustomDesc('')
            setCustomPrice('')
            setCustomQty('')
        } catch (e) {
            const err = axiosResponseMessage(e)
            setCrmBannerError(err ? `Не удалось добавить кастомную позицию.\n${err}` : 'Не удалось добавить кастомную позицию.')
        } finally {
            setOfflineBusy(false)
        }
    }

    const requestDeleteOfflineLine = (line: CrmOfflineLine) => {
        setCrmBannerError(null)
        setConfirmDeleteLine({ lineId: line._id, label: offlineLineLabel(line) })
    }

    const confirmDeleteOfflineLine = async () => {
        if (!confirmDeleteLine) return
        const { lineId } = confirmDeleteLine
        setConfirmDeleteLine(null)
        setCrmBannerError(null)
        setOfflineBusy(true)
        try {
            const res = await CrmApi.deleteOfflineLine(accountId, lineId)
            setCard(c =>
                c ? { ...c, profile: { ...c.profile, crmOfflinePurchases: res.crmOfflinePurchases } } : c
            )
            if (res.productStock) applyProductStockFromCrm(res.productStock)
            onListRefresh()
            void refreshLoyalty()
            setCrmBannerError(null)
        } catch (e) {
            const err = axiosResponseMessage(e)
            setCrmBannerError(err ? `Не удалось удалить строку.\n${err}` : 'Не удалось удалить строку.')
        } finally {
            setOfflineBusy(false)
        }
    }

    /**
     * Список CRM считает «есть заказы» по stats.ordersTotal; карточка берёт массив orders отдельным GET.
     * Если бэкенд заполнил stats.orders в списке, но в карточке вернул orders: [], без fallback вкладка пустая.
     */
    const { orders, ordersHint } = useMemo(() => {
        const fromCard = card?.orders ?? []
        const fromListStats = listRow.stats?.orders
        if (fromCard.length > 0) {
            return { orders: fromCard, ordersHint: null as string | null }
        }
        if (Array.isArray(fromListStats) && fromListStats.length > 0) {
            return {
                orders: fromListStats,
                ordersHint:
                    'Заказы показаны из сводки списка CRM (stats.orders): ответ карточки GET …/users/:id вернул пустой массив orders — стоит сверить бэкенд.',
            }
        }
        const totalListed = listRow.stats?.ordersTotal ?? 0
        const offlineLines = listRow.offlinePurchasesSummary?.linesCount ?? 0
        if (totalListed > 0) {
            let msg =
                `В списке клиентов для этого аккаунта указано заказов в сводке: ${totalListed}, а массив orders в карточке пустой. Часто это рассинхрон агрегата списка и выборки по accountId на сервере.`
            if (offlineLines > 0) {
                msg += ` Есть офлайн-позиции (${offlineLines} шт.) — они во вкладке «Покупки офлайн», не в онлайн-заказах.`
            }
            return { orders: [], ordersHint: msg }
        }
        if (offlineLines > 0) {
            return {
                orders: [],
                ordersHint:
                    `Онлайн-заказов в CRM нет; офлайн-покупки — ${offlineLines} шт., вкладка «Покупки офлайн». Фильтр «Только с заказами» смотрит на сводку онлайн-заказов (stats.ordersTotal).`,
            }
        }
        return { orders: [], ordersHint: null }
    }, [card?.orders, listRow.stats?.orders, listRow.stats?.ordersTotal, listRow.offlinePurchasesSummary?.linesCount])

    const cart = card?.cart
    const cartItemCount = cart?.totalItems ?? listRow.cart?.totalItems ?? 0

    const cartPricing = useMemo(() => {
        if (!cart) return null
        const discountPercent = loyalty ? resolveEffectiveDiscountPercent(loyalty) : 0
        return resolveCartPricing(cart.pricing, cart.items ?? [], discountPercent, cart.totalPrice)
    }, [cart, loyalty])

    const cartHasDiscount = hasCartDiscount(cartPricing)
    const cartDiscountPercent = cartPricing?.discountPercent ?? 0
    const cartLineCount = cart?.items?.length ?? 0
    const showCartTotal = cartLineCount > 1

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

    const panel = (
        <div
            className={`relative w-full max-w-4xl mx-auto flex max-h-[90vh] flex-col overflow-hidden rounded-lg border border-[#333] bg-[#1a1a1a] ${embedded ? 'shadow-2xl' : ''}`}
            onClick={e => e.stopPropagation()}
        >
                <div className="flex flex-wrap items-start justify-between gap-3 border-b border-[#333] bg-[#1a1a1a] p-4">
                    <div className="min-w-0 flex-1 space-y-1.5">
                        <p className="text-lg font-bold text-white break-words leading-tight">
                            {headerClientName}
                        </p>
                        <p className="text-xs font-semibold uppercase tracking-wider text-white/50 font-durik">
                            CRM — клиент
                        </p>
                        <CrmUserHeaderMeta
                            accountId={accountId}
                            telegramId={telegramNumericId}
                            loyalty={loyalty ?? listRow.loyalty ?? null}
                            className="pt-0.5"
                        />
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
                    {tabBtn('profile', 'Профиль')}
                    {tabBtn('offline', 'Покупки офлайн')}
                    {tabBtn('orders', `Заказы (${orders.length})`)}
                    {tabBtn('cart', `Корзина (${cartItemCount})`)}
                    {tabBtn('loyalty', 'Прогресс')}
                    {tabBtn('referrals', 'Рефералы')}
                </div>

                <div className="min-h-0 flex-1 overflow-y-auto p-4 text-white">
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
                        <div className="space-y-4">
                            <div className="space-y-0 rounded border border-white/10 bg-[#1f1f1f]/40 px-2">
                                <CrmDblEditRow
                                    editKey="personalFirstName"
                                    label="Личное имя"
                                    displayValue={form.personalFirstName}
                                    value={form.personalFirstName}
                                    onChange={v => setForm(f => ({ ...f, personalFirstName: v }))}
                                    editingField={editingField}
                                    setEditingField={setEditingField}
                                    onAfterBlur={saveProfileOnBlur}
                                />
                                <CrmDblEditRow
                                    editKey="personalLastName"
                                    label="Личная фамилия"
                                    displayValue={form.personalLastName}
                                    value={form.personalLastName}
                                    onChange={v => setForm(f => ({ ...f, personalLastName: v }))}
                                    editingField={editingField}
                                    setEditingField={setEditingField}
                                    onAfterBlur={saveProfileOnBlur}
                                />
                                <CrmDblEditRow
                                    editKey="firstName"
                                    label="Имя (Telegram)"
                                    displayValue={form.firstName}
                                    value={form.firstName}
                                    onChange={v => setForm(f => ({ ...f, firstName: v }))}
                                    editingField={editingField}
                                    setEditingField={setEditingField}
                                    onAfterBlur={saveProfileOnBlur}
                                />
                                <CrmDblEditRow
                                    editKey="lastName"
                                    label="Фамилия (Telegram)"
                                    displayValue={form.lastName}
                                    value={form.lastName}
                                    onChange={v => setForm(f => ({ ...f, lastName: v }))}
                                    editingField={editingField}
                                    setEditingField={setEditingField}
                                    onAfterBlur={saveProfileOnBlur}
                                />
                                <CrmDblEditRow
                                    editKey="email"
                                    label="Email"
                                    displayValue={form.email}
                                    value={form.email}
                                    onChange={v => setForm(f => ({ ...f, email: v }))}
                                    editingField={editingField}
                                    setEditingField={setEditingField}
                                    onAfterBlur={saveProfileOnBlur}
                                />
                                <CrmDblEditRow
                                    editKey="userPhoneNumber"
                                    label="Телефон"
                                    displayValue={form.userPhoneNumber}
                                    value={form.userPhoneNumber}
                                    onChange={v => setForm(f => ({ ...f, userPhoneNumber: v }))}
                                    editingField={editingField}
                                    setEditingField={setEditingField}
                                    onAfterBlur={saveProfileOnBlur}
                                />
                                <CrmReadOnlyCopyRow
                                    label="Username"
                                    displayText={
                                        form.username.trim()
                                            ? `@${form.username.replace(/^@/, '')}`
                                            : ''
                                    }
                                    copyText={
                                        form.username.trim()
                                            ? `@${form.username.replace(/^@/, '')}`
                                            : ''
                                    }
                                    title="Username из Telegram — только просмотр. Можно скопировать в буфер."
                                />
                                <CrmDblEditRow
                                    editKey="walletAddress"
                                    label="Кошелёк"
                                    displayValue={form.walletAddress}
                                    value={form.walletAddress}
                                    onChange={v => setForm(f => ({ ...f, walletAddress: v }))}
                                    editingField={editingField}
                                    setEditingField={setEditingField}
                                    onAfterBlur={saveProfileOnBlur}
                                />
                                <CrmDblEditRow
                                    editKey="dateOfBirth"
                                    label="Дата рождения"
                                    displayValue={fmtDobShort(form.dateOfBirth)}
                                    value={form.dateOfBirth}
                                    onChange={v => setForm(f => ({ ...f, dateOfBirth: v }))}
                                    editingField={editingField}
                                    setEditingField={setEditingField}
                                    onAfterBlur={saveProfileOnBlur}
                                    inputType="date"
                                />
                            </div>

                            {!profile.owner && (
                                <div
                                    className="flex flex-col gap-0.5 border-b border-white/[0.07] py-1.5 text-sm sm:flex-row sm:items-center sm:gap-3"
                                    title="Двойной щелчок — редактировать. Enter — готово."
                                    onDoubleClick={() => setEditingField('isAdmin')}
                                >
                                    <span className="w-44 shrink-0 text-white/45">Администратор</span>
                                    <div className="min-w-0 flex-1">
                                        {editingField === 'isAdmin' ? (
                                            <label className="box-border flex h-9 min-w-0 cursor-pointer items-center gap-2 rounded border border-[var(--mint-bright)] bg-[#2a2a2a] px-2 py-1">
                                                <input
                                                    autoFocus
                                                    type="checkbox"
                                                    className="rounded border-white/30"
                                                    checked={form.isAdmin}
                                                    onChange={e => setForm(f => ({ ...f, isAdmin: e.target.checked }))}
                                                    onBlur={() => {
                                                        setEditingField(null)
                                                        saveProfileOnBlur()
                                                    }}
                                                    onKeyDown={e => {
                                                        if (e.key === 'Enter') {
                                                            e.preventDefault()
                                                            setEditingField(null)
                                                            saveProfileOnBlur()
                                                        }
                                                    }}
                                                />
                                                <span className="text-sm text-white/75">Вкл / выкл</span>
                                            </label>
                                        ) : (
                                            <div className="box-border flex h-9 w-full min-w-0 cursor-default select-none items-center rounded border border-transparent px-2 py-1 text-sm leading-normal text-white/88">
                                                {form.isAdmin ? 'Да' : 'Нет'}
                                            </div>
                                        )}
                                    </div>
                                </div>
                            )}

                            <div>
                                <h3 className="mb-1 text-xs font-bold uppercase tracking-wide text-[var(--mint-bright)]">
                                    Мерки, см
                                </h3>
                                <div className="space-y-0 rounded border border-white/10 bg-[#1f1f1f]/40 px-2">
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
                                        <CrmDblEditRow
                                            key={key}
                                            editKey={key}
                                            label={label}
                                            displayValue={val.trim() ? `${val} см` : ''}
                                            value={val}
                                            onChange={v => setForm(f => ({ ...f, [key]: v } as typeof f))}
                                            editingField={editingField}
                                            setEditingField={setEditingField}
                                            onAfterBlur={saveProfileOnBlur}
                                            inputType="number"
                                            numberMin={
                                                key === 'heightCm' ||
                                                key === 'chestCircumferenceCm' ||
                                                key === 'waistCircumferenceCm'
                                                    ? 0
                                                    : undefined
                                            }
                                        />
                                    ))}
                                </div>
                            </div>

                            <div className="space-y-0 rounded border border-white/10 bg-[#1f1f1f]/40 px-2">
                                <div className="flex flex-col gap-0.5 border-b border-white/[0.07] py-1.5 text-sm last:border-b-0 sm:flex-row sm:items-start sm:gap-3">
                                    <span className="w-44 shrink-0 text-white/45 sm:pt-1.5">Заметки админа</span>
                                    <div className="min-w-0 flex-1">
                                        <textarea
                                            rows={4}
                                            className="box-border min-h-[88px] w-full resize-y rounded border border-white/15 bg-[#2a2a2a] px-2 py-1 text-sm text-white outline-none focus:border-[var(--mint-bright)]"
                                            value={form.adminNotes}
                                            onChange={e => setForm(f => ({ ...f, adminNotes: e.target.value }))}
                                            onBlur={saveProfileOnBlur}
                                            placeholder="Внутренние заметки (видны только в CRM)…"
                                        />
                                    </div>
                                </div>
                            </div>

                            <div>
                                <h3 className="mb-1 text-xs font-bold uppercase tracking-wide text-[var(--mint-bright)]">
                                    Адрес
                                </h3>
                                <div className="space-y-0 rounded border border-white/10 bg-[#1f1f1f]/40 px-2">
                                    <CrmDblEditRow
                                        editKey="shipFullName"
                                        label="Получатель"
                                        displayValue={form.shipFullName}
                                        value={form.shipFullName}
                                        onChange={v => setForm(f => ({ ...f, shipFullName: v }))}
                                        editingField={editingField}
                                        setEditingField={setEditingField}
                                        onAfterBlur={saveProfileOnBlur}
                                    />
                                    <CrmDblEditRow
                                        editKey="shipPhone"
                                        label="Телефон"
                                        displayValue={form.shipPhone}
                                        value={form.shipPhone}
                                        onChange={v => setForm(f => ({ ...f, shipPhone: v }))}
                                        editingField={editingField}
                                        setEditingField={setEditingField}
                                        onAfterBlur={saveProfileOnBlur}
                                    />
                                    <CrmDblEditRow
                                        editKey="shipCity"
                                        label="Город"
                                        displayValue={form.shipCity}
                                        value={form.shipCity}
                                        onChange={v => setForm(f => ({ ...f, shipCity: v }))}
                                        editingField={editingField}
                                        setEditingField={setEditingField}
                                        onAfterBlur={saveProfileOnBlur}
                                    />
                                    <CrmDblEditRow
                                        editKey="shipPostal"
                                        label="Индекс"
                                        displayValue={form.shipPostal}
                                        value={form.shipPostal}
                                        onChange={v => setForm(f => ({ ...f, shipPostal: v }))}
                                        editingField={editingField}
                                        setEditingField={setEditingField}
                                        onAfterBlur={saveProfileOnBlur}
                                    />
                                    <CrmDblEditRow
                                        editKey="shipCountry"
                                        label="Страна"
                                        displayValue={form.shipCountry}
                                        value={form.shipCountry}
                                        onChange={v => setForm(f => ({ ...f, shipCountry: v }))}
                                        editingField={editingField}
                                        setEditingField={setEditingField}
                                        onAfterBlur={saveProfileOnBlur}
                                    />
                                    <CrmDblEditRow
                                        editKey="shipStreet"
                                        label="Улица"
                                        displayValue={form.shipStreet}
                                        value={form.shipStreet}
                                        onChange={v => setForm(f => ({ ...f, shipStreet: v }))}
                                        editingField={editingField}
                                        setEditingField={setEditingField}
                                        onAfterBlur={saveProfileOnBlur}
                                    />
                                    <CrmDblEditRow
                                        editKey="shipHouse"
                                        label="Дом"
                                        displayValue={form.shipHouse}
                                        value={form.shipHouse}
                                        onChange={v => setForm(f => ({ ...f, shipHouse: v }))}
                                        editingField={editingField}
                                        setEditingField={setEditingField}
                                        onAfterBlur={saveProfileOnBlur}
                                    />
                                    <CrmDblEditRow
                                        editKey="shipApartment"
                                        label="Квартира"
                                        displayValue={form.shipApartment}
                                        value={form.shipApartment}
                                        onChange={v => setForm(f => ({ ...f, shipApartment: v }))}
                                        editingField={editingField}
                                        setEditingField={setEditingField}
                                        onAfterBlur={saveProfileOnBlur}
                                    />
                                    <CrmDblEditRow
                                        editKey="shipNotes"
                                        label="Примечание"
                                        displayValue={form.shipNotes}
                                        value={form.shipNotes}
                                        onChange={v => setForm(f => ({ ...f, shipNotes: v }))}
                                        editingField={editingField}
                                        setEditingField={setEditingField}
                                        onAfterBlur={saveProfileOnBlur}
                                        inputType="textarea"
                                        rows={2}
                                    />
                                </div>
                            </div>

                            <p className="text-xs text-white/40">
                                {saving
                                    ? 'Сохранение…'
                                    : 'Изменения сохраняются при выходе из поля (двойной щелчок — редактирование)'}
                            </p>
                        </div>
                    )}

                    {!loading && !error && tab === 'offline' && profile && (
                        <div className="space-y-5">
                                <div className="overflow-x-auto mb-4">
                                    <table className="w-full text-xs text-left">
                                        <thead>
                                            <tr className="text-white/50 border-b border-white/10">
                                                <th className="py-2 pr-2">Тип</th>
                                                <th className="py-2 pr-2">Позиция</th>
                                                <th className="py-2 pr-2">Описание</th>
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
                                                    <td className="py-2 pr-2 font-medium text-white/90">
                                                        {offlineLineLabel(line)}
                                                    </td>
                                                    <td className="py-2 pr-2 max-w-[200px] text-white/55 whitespace-pre-wrap break-words">
                                                        {offlineLineDescription(line) ?? '—'}
                                                    </td>
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
                                                            onClick={() => requestDeleteOfflineLine(line)}
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
                    )}

                    {!loading && !error && tab === 'orders' && (
                        <div className="space-y-4">
                            {ordersHint && (
                                <p className="rounded border border-amber-500/40 bg-amber-950/35 px-3 py-2 text-xs text-amber-100/95 whitespace-pre-wrap">
                                    {ordersHint}
                                </p>
                            )}
                            {orders.length === 0 && !ordersHint && <p className="text-white/50">Заказов нет</p>}
                            {orders.map((o: PinkPunkOrder) => {
                                return (
                                    <div key={o._id} className="bg-[#252525] border border-[#333] p-3 text-sm space-y-3">
                                        <div className="flex flex-wrap justify-between gap-2 items-start">
                                            <span className="font-semibold text-[var(--mint-bright)]">{o.orderNumber}</span>
                                            <span className="text-white/75 text-xs sm:text-sm">
                                                {ORDER_STATUS_RU[o.status] ?? o.status}
                                            </span>
                                            <span className="font-medium">{fmtMoney(o.totalAmount)}</span>
                                        </div>

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
                                                                const slug = pop?.productId ?? '—'
                                                                const lineSum = (it.price ?? 0) * (it.quantity ?? 0)
                                                                const cat = pop?.category?.trim()
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
                        <div className="space-y-3">
                            <div className="flex flex-wrap items-center justify-end gap-2">
                                <button
                                    type="button"
                                    disabled={cartRefreshing}
                                    className="rounded border border-[var(--mint-bright)] bg-[var(--mint-bright)]/15 px-3 py-1.5 text-sm font-semibold text-[var(--mint-bright)] disabled:opacity-40"
                                    onClick={() => void handleRefreshCart()}
                                >
                                    {cartRefreshing ? 'Обновление…' : 'Обновить'}
                                </button>
                            </div>
                            {!cart ? (
                                <p className="text-white/50">
                                    Сейчас нет активной корзины, которую удалось сопоставить с этим клиентом (пустая,
                                    неактивная или нет совпадения в БД).
                                </p>
                            ) : (
                                <div className="bg-[#252525] p-4 border border-[#333] space-y-3">
                                    <p>Позиций: {cart.totalItems}</p>
                                    <p className="text-white/50 text-sm">Обновлено: {fmtDt(cart.lastUpdated)}</p>

                                    {cart.items == null ? (
                                        <p className="text-white/40 text-xs border-t border-[#333] pt-2">
                                            Детализация по строкам (<code className="text-white/55">items</code>) в ответе
                                            не отдаётся — только сводка.
                                        </p>
                                    ) : cart.items.length === 0 ? (
                                        <p className="text-white/40 text-xs border-t border-[#333] pt-2">
                                            В ответе пустой массив позиций.
                                        </p>
                                    ) : (
                                        <div className="border-t border-[#333] pt-3">
                                            {cartHasDiscount && cartPricing ? (
                                                <p className="text-xs text-white/55 mb-2 tabular-nums">
                                                    Скидка клиента:{' '}
                                                    <span className="text-[var(--mint-bright)] font-semibold">
                                                        {cartPricing.discountPercent}%
                                                    </span>
                                                    {' '}(−{fmtMoney(cartPricing.discountAmount)})
                                                </p>
                                            ) : null}
                                            <p className="text-white/50 text-xs font-medium uppercase tracking-wide mb-2">
                                                Состав корзины
                                            </p>
                                            <div className="overflow-x-auto">
                                                <table className="w-full text-xs text-left border-collapse">
                                                    <thead>
                                                        <tr className="text-white/45 border-b border-[#444]">
                                                            <th className="py-1.5 pr-2 font-normal">Товар</th>
                                                            <th className="py-1.5 pr-2 font-normal">Артикул</th>
                                                            <th className="py-1.5 pr-2 font-normal">Размер</th>
                                                            <th className="py-1.5 pr-2 font-normal text-right">Цена</th>
                                                            <th className="py-1.5 pr-2 font-normal text-right">Кол-во</th>
                                                            <th className="py-1.5 font-normal text-right">Сумма</th>
                                                        </tr>
                                                    </thead>
                                                    <tbody>
                                                        {cart.items.map((line, idx) => {
                                                            const unit = line.unitPrice
                                                            const lineSum =
                                                                unit != null && !Number.isNaN(unit)
                                                                    ? unit * line.quantity
                                                                    : null
                                                            const discountedLineSum =
                                                                lineSum != null
                                                                    ? computeLineDiscountedSum(lineSum, cartDiscountPercent)
                                                                    : null
                                                            const discountedUnit =
                                                                discountedLineSum != null && line.quantity > 0
                                                                    ? Math.floor(discountedLineSum / line.quantity)
                                                                    : null
                                                            const photo = line.photo?.trim()
                                                            return (
                                                                <tr
                                                                    key={`${line.productId}-${idx}`}
                                                                    className="border-b border-[#333]/80 align-top"
                                                                >
                                                                    <td className="py-2 pr-2 text-white/90">
                                                                        <div className="flex gap-2 items-start min-w-0">
                                                                            {photo ? (
                                                                                <div className="relative w-12 h-12 flex-shrink-0 rounded overflow-hidden border border-white/10 bg-black/30">
                                                                                    <LazyImage
                                                                                        src={photo}
                                                                                        alt={
                                                                                            formatProductName(line.name?.trim()) || 'Товар'
                                                                                        }
                                                                                        className="w-full h-full"
                                                                                    />
                                                                                </div>
                                                                            ) : null}
                                                                            <span className="font-medium min-w-0 break-words">
                                                                                {formatProductName(line.name?.trim()) || '—'}
                                                                            </span>
                                                                        </div>
                                                                    </td>
                                                                    <td className="py-2 pr-2 font-mono text-white/70 break-all max-w-[100px]">
                                                                        {line.listingProductId?.trim() || '—'}
                                                                    </td>
                                                                    <td className="py-2 pr-2 text-white/80">
                                                                        {line.size?.trim() || '—'}
                                                                    </td>
                                                                    <td className="py-2 pr-2 text-right tabular-nums">
                                                                        {unit != null ? (
                                                                            cartHasDiscount && discountedUnit != null ? (
                                                                                <div className="space-y-0.5">
                                                                                    <p className="text-white/40 line-through">{fmtMoney(unit)}</p>
                                                                                    <p className="text-[var(--mint-bright)] font-medium">
                                                                                        {fmtMoney(discountedUnit)}
                                                                                    </p>
                                                                                </div>
                                                                            ) : (
                                                                                <span className="text-white/80">{fmtMoney(unit)}</span>
                                                                            )
                                                                        ) : (
                                                                            '—'
                                                                        )}
                                                                    </td>
                                                                    <td className="py-2 pr-2 text-right text-white/80">
                                                                        {line.quantity}
                                                                    </td>
                                                                    <td className="py-2 text-right font-medium tabular-nums">
                                                                        {lineSum != null ? (
                                                                            cartHasDiscount && discountedLineSum != null ? (
                                                                                <div className="space-y-0.5">
                                                                                    <p className="text-white/40 line-through font-normal">
                                                                                        {fmtMoney(lineSum)}
                                                                                    </p>
                                                                                    <p className="text-[var(--mint-bright)]">
                                                                                        {fmtMoney(discountedLineSum)}
                                                                                    </p>
                                                                                </div>
                                                                            ) : (
                                                                                <span className="text-white/90">{fmtMoney(lineSum)}</span>
                                                                            )
                                                                        ) : (
                                                                            '—'
                                                                        )}
                                                                    </td>
                                                                </tr>
                                                            )
                                                        })}
                                                    </tbody>
                                                </table>
                                            </div>
                                        </div>
                                    )}

                                    {showCartTotal && cartPricing ? (
                                        <div className="border-t border-[#333] pt-4 mt-1 text-right space-y-1">
                                            {cartHasDiscount ? (
                                                <>
                                                    <p className="text-xs text-white/45 tabular-nums">
                                                        Без скидки:{' '}
                                                        <span className="line-through">{fmtMoney(cartPricing.subtotal)}</span>
                                                    </p>
                                                    <p className="text-xs text-white/55 tabular-nums">
                                                        Скидка {cartPricing.discountPercent}%: −{fmtMoney(cartPricing.discountAmount)}
                                                    </p>
                                                </>
                                            ) : null}
                                            <p className="text-xs text-white/45 mb-1">Итого</p>
                                            <p className="text-lg font-semibold text-[var(--mint-bright)] tabular-nums">
                                                {fmtMoney(cartPricing.total)}
                                            </p>
                                        </div>
                                    ) : null}
                                </div>
                            )}
                        </div>
                    )}

                    {!loading && !error && tab === 'loyalty' && accountId && (
                        <AdminCrmLoyaltyTab
                            accountId={accountId}
                            loyalty={loyalty}
                            onLoyaltyUpdated={handleLoyaltyUpdated}
                            onError={setCrmBannerError}
                        />
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

                {crmBannerError && (
                    <div
                        role="alert"
                        className="shrink-0 border-t border-red-500/40 bg-red-950/55 px-4 py-3"
                    >
                        <div className="flex items-start justify-between gap-3">
                            <p className="whitespace-pre-wrap text-sm text-red-100">{crmBannerError}</p>
                            <button
                                type="button"
                                className="shrink-0 rounded px-2 py-0.5 text-red-200 hover:bg-white/10"
                                aria-label="Скрыть сообщение"
                                onClick={() => setCrmBannerError(null)}
                            >
                                ×
                            </button>
                        </div>
                    </div>
                )}

                {confirmDeleteLine && (
                    <div
                        className="absolute inset-0 z-30 flex items-center justify-center bg-black/75 p-4"
                        role="presentation"
                        onClick={() => !offlineBusy && setConfirmDeleteLine(null)}
                    >
                        <div
                            role="dialog"
                            aria-modal="true"
                            aria-labelledby="crm-delete-offline-title"
                            className="w-full max-w-md rounded-lg border border-[#444] bg-[#252525] p-4 shadow-xl"
                            onClick={e => e.stopPropagation()}
                        >
                            <h2 id="crm-delete-offline-title" className="text-lg font-semibold text-white">
                                Удалить офлайн-покупку?
                            </h2>
                            <p className="mt-2 text-sm text-white/80">
                                Строка:{' '}
                                <span className="font-medium text-[var(--mint-bright)]">{confirmDeleteLine.label}</span>
                            </p>
                            <p className="mt-1 text-xs text-white/50">
                                Для позиции из каталога остаток на складе вернётся на сервере.
                            </p>
                            <div className="mt-4 flex flex-wrap justify-end gap-2">
                                <button
                                    type="button"
                                    disabled={offlineBusy}
                                    className="rounded border border-white/20 px-4 py-2 text-sm text-white/90 hover:bg-white/10 disabled:opacity-40"
                                    onClick={() => setConfirmDeleteLine(null)}
                                >
                                    Отмена
                                </button>
                                <button
                                    type="button"
                                    disabled={offlineBusy}
                                    className="rounded bg-red-600 px-4 py-2 text-sm font-semibold text-white hover:bg-red-500 disabled:opacity-40"
                                    onClick={() => void confirmDeleteOfflineLine()}
                                >
                                    {offlineBusy ? 'Удаление…' : 'Удалить'}
                                </button>
                            </div>
                        </div>
                    </div>
                )}
            </div>
    );

    if (embedded) {
        return panel
    }

    return (
        <div
            className="fixed inset-0 z-[10000] flex items-center justify-center bg-black/90 p-4"
            onClick={onClose}
        >
            {panel}
        </div>
    )
}
