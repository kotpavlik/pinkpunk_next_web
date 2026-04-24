'use client'

import React, { useRef, useState, useCallback } from 'react'
import { useAlfaPaymentForm } from '@/hooks/useAlfaPaymentForm'
import type { AlfaOrderSession } from '@/types/alfa-web-sdk'

type AlfaMultiframeCardFormProps = {
    /** Идентификатор заказа в шлюзе (после регистрации заказа на бэкенде). Без него SDK не инициализируется. */
    mdOrder?: string | null
    enableBindings?: boolean
    apiContext?: string
    language?: string
    onFormValidate?: (isValid: boolean) => void
    /** После успешного `init()` — связки, UI сохранения карты (как в примере React из доки) */
    onOrderSession?: (session: AlfaOrderSession) => void
}

/**
 * Форма оплаты Alfa multiframe: `new PaymentForm` → **`init()`** → ввод → **`doPayment()`** (инструкция React SPA).
 * Скрипт `main.js` — в `app/order/layout.tsx`.
 */
export default function AlfaMultiframeCardForm({
    mdOrder = null,
    enableBindings = false,
    apiContext,
    language = 'ru',
    onFormValidate,
    onOrderSession,
}: AlfaMultiframeCardFormProps) {
    const panRef = useRef<HTMLDivElement>(null)
    const expiryRef = useRef<HTMLDivElement>(null)
    const cvcRef = useRef<HTMLDivElement>(null)

    const { isReady, initError, doPayment } = useAlfaPaymentForm({
        mdOrder,
        panRef,
        expiryRef,
        cvcRef,
        apiContext,
        language,
        onFormValidate,
        onOrderSession,
    })

    const [payBusy, setPayBusy] = useState(false)

    const handlePay = useCallback(async () => {
        setPayBusy(true)
        try {
            await doPayment({})
        } catch {
            // Ошибку можно вывести в #error или toast — по интеграции с бэком
        } finally {
            setPayBusy(false)
        }
    }, [doPayment])

    return (
        <div className="mt-4 space-y-4 rounded-lg border border-white/10 bg-black/20 p-4">
            <p className="text-xs text-white/50">
                Данные карты вводятся в защищённых полях банка (на сервер магазина не передаются).
            </p>

            {!mdOrder?.trim() && (
                <p className="text-xs text-amber-200/90">
                    Поля карты активируются после получения идентификатора заказа (mdOrder) от бэкенда при регистрации
                    оплаты.
                </p>
            )}

            {initError && (
                <p className="text-sm text-[var(--pink-punk)]" role="alert">
                    {initError}
                </p>
            )}

            {enableBindings && (
                <div id="select-binding-container" className="hidden">
                    <label htmlFor="select-binding" className="mb-1 block text-sm text-white/80">
                        Способ оплаты
                    </label>
                    <select
                        id="select-binding"
                        className="w-full border border-white/20 bg-white/10 px-3 py-2 text-white focus:outline-none focus:ring-2 focus:ring-[var(--mint-dark)]"
                        aria-label="Выбор сохранённой карты или новой карты"
                        defaultValue="new_card"
                    >
                        <option value="new_card">Оплатить новой картой</option>
                    </select>
                </div>
            )}

            <div className="space-y-4">
                <div>
                    <label htmlFor="pan" className="mb-1 block text-sm font-medium text-white/80">
                        Номер карты
                    </label>
                    <div
                        ref={panRef}
                        id="pan"
                        className="min-h-[48px] w-full rounded border border-white/20 bg-white/10 px-3 py-2"
                    />
                </div>

                <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                    <div>
                        <label htmlFor="expiry" className="mb-1 block text-sm font-medium text-white/80">
                            Срок действия
                        </label>
                        <div
                            ref={expiryRef}
                            id="expiry"
                            className="min-h-[48px] w-full rounded border border-white/20 bg-white/10 px-3 py-2"
                        />
                    </div>
                    <div>
                        <label htmlFor="cvc" className="mb-1 block text-sm font-medium text-white/80">
                            CVC / CVV
                        </label>
                        <div
                            ref={cvcRef}
                            id="cvc"
                            className="min-h-[48px] w-full rounded border border-white/20 bg-white/10 px-3 py-2"
                        />
                    </div>
                </div>
            </div>

            {enableBindings && (
                <label id="save-card-container" className="flex cursor-pointer items-center gap-2 text-sm text-white/80">
                    <input
                        id="save-card"
                        type="checkbox"
                        className="rounded border-white/30 bg-white/10 text-[var(--mint-dark)] focus:ring-[var(--mint-dark)]"
                    />
                    Сохранить карту
                </label>
            )}

            <button
                id="pay"
                type="button"
                disabled={!isReady || payBusy || !mdOrder?.trim()}
                onClick={handlePay}
                className="flex w-full items-center justify-center gap-2 rounded bg-[var(--mint-dark)] px-4 py-3 font-semibold text-white transition-colors hover:bg-[var(--green)] disabled:cursor-not-allowed disabled:bg-gray-600"
            >
                <span
                    id="pay-spinner"
                    className={`h-4 w-4 animate-spin rounded-full border-2 border-white border-t-transparent ${payBusy ? '' : 'hidden'}`}
                    aria-hidden
                />
                <span>{payBusy ? 'Оплата…' : 'Оплатить'}</span>
            </button>

            <div id="error" className="hidden text-center text-sm text-[var(--pink-punk)]" role="alert" />
        </div>
    )
}
