'use client'

import { useCallback, useEffect, useRef, useState, type RefObject } from 'react'
import type {
    AlfaOrderSession,
    AlfaPaymentFormInstance,
    AlfaPaymentFormOptions,
} from '@/types/alfa-web-sdk'

const SCRIPT_POLL_MS = 80
const SCRIPT_WAIT_MAX_MS = 30000

function waitForPaymentForm(): Promise<void> {
    return new Promise((resolve, reject) => {
        if (typeof window !== 'undefined' && typeof window.PaymentForm === 'function') {
            resolve()
            return
        }
        const start = Date.now()
        const id = window.setInterval(() => {
            if (typeof window.PaymentForm === 'function') {
                window.clearInterval(id)
                resolve()
            } else if (Date.now() - start > SCRIPT_WAIT_MAX_MS) {
                window.clearInterval(id)
                reject(new Error('Alfa PaymentForm: main.js не загрузился за отведённое время'))
            }
        }, SCRIPT_POLL_MS)
    })
}

const defaultDarkFieldStyles: NonNullable<AlfaPaymentFormOptions['styles']> = {
    base: {
        color: 'rgba(255,255,255,0.92)',
        padding: '0 12px',
        fontSize: '16px',
        fontFamily: 'ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, monospace',
    },
    focus: {
        color: '#ffffff',
    },
    disabled: {
        color: 'rgba(255,255,255,0.35)',
    },
    valid: {
        color: 'var(--mint-bright, #7dd3c0)',
    },
    invalid: {
        color: 'var(--pink-punk, #ff2b9c)',
    },
    placeholder: {
        base: { color: 'rgba(255,255,255,0.35)' },
        focus: { color: 'rgba(255,255,255,0.2)' },
    },
}

type UseAlfaPaymentFormArgs = {
    mdOrder: string | null | undefined
    panRef: RefObject<HTMLDivElement | null>
    expiryRef: RefObject<HTMLDivElement | null>
    cvcRef: RefObject<HTMLDivElement | null>
    apiContext?: string
    language?: string
    onFormValidate?: (isValid: boolean) => void
    /** После успешного `init()` — связки, сохранение карты (см. доку React SPA) */
    onOrderSession?: (session: AlfaOrderSession) => void
    styles?: AlfaPaymentFormOptions['styles']
}

export type UseAlfaPaymentFormResult = {
    /** Форма готова к вводу и к `doPayment` */
    isReady: boolean
    initError: string | null
    orderSession: AlfaOrderSession | null
    doPayment: (params?: Record<string, unknown>) => Promise<unknown>
    selectBinding: (bindingId: string | null) => void
}

export function useAlfaPaymentForm({
    mdOrder,
    panRef,
    expiryRef,
    cvcRef,
    apiContext = '/payment',
    language = 'ru',
    onFormValidate,
    onOrderSession,
    styles,
}: UseAlfaPaymentFormArgs): UseAlfaPaymentFormResult {
    const sdkRef = useRef<AlfaPaymentFormInstance | null>(null)
    const onOrderSessionRef = useRef(onOrderSession)
    const [isReady, setIsReady] = useState(false)
    const [initError, setInitError] = useState<string | null>(null)
    const [orderSession, setOrderSession] = useState<AlfaOrderSession | null>(null)

    onOrderSessionRef.current = onOrderSession

    const doPayment = useCallback(async (params?: Record<string, unknown>) => {
        const sdk = sdkRef.current
        if (!sdk) {
            throw new Error('Платёжная форма не готова')
        }
        return sdk.doPayment(params ?? {})
    }, [])

    const selectBinding = useCallback((bindingId: string | null) => {
        sdkRef.current?.selectBinding(bindingId)
    }, [])

    useEffect(() => {
        if (!mdOrder?.trim()) {
            setIsReady(false)
            setInitError(null)
            setOrderSession(null)
            return
        }

        const pan = panRef.current
        const expiry = expiryRef.current
        const cvc = cvcRef.current
        if (!pan || !expiry || !cvc) {
            return
        }

        let cancelled = false

        const run = async () => {
            setInitError(null)
            setIsReady(false)
            setOrderSession(null)

            try {
                await waitForPaymentForm()
            } catch (e) {
                if (!cancelled) {
                    setInitError(e instanceof Error ? e.message : 'Ошибка загрузки SDK')
                }
                return
            }
            if (cancelled) return

            sdkRef.current?.destroy()
            sdkRef.current = null

            const fieldStyles = styles ?? defaultDarkFieldStyles

            const options: AlfaPaymentFormOptions = {
                mdOrder: mdOrder.trim(),
                containerClassName: 'field-container',
                apiContext,
                language,
                autoFocus: true,
                showPanIcon: true,
                panIconStyle: {
                    height: '18px',
                    top: 'calc(50% - 9px)',
                    right: '10px',
                },
                onFormValidate,
                fields: {
                    pan: { container: pan },
                    expiry: { container: expiry },
                    cvc: { container: cvc },
                },
                styles: fieldStyles,
            }

            let form: AlfaPaymentFormInstance
            try {
                form = new window.PaymentForm(options)
            } catch (e) {
                if (!cancelled) {
                    setInitError(e instanceof Error ? e.message : 'Ошибка создания PaymentForm')
                }
                return
            }

            try {
                const { orderSession: session } = await form.init()
                if (cancelled) {
                    form.destroy()
                    return
                }
                sdkRef.current = form
                setOrderSession(session)
                onOrderSessionRef.current?.(session)
                setIsReady(true)
            } catch (e) {
                form.destroy()
                if (!cancelled) {
                    setInitError(e instanceof Error ? e.message : 'Ошибка init() платёжной формы')
                }
            }
        }

        void run()

        return () => {
            cancelled = true
            sdkRef.current?.destroy()
            sdkRef.current = null
            setIsReady(false)
            setOrderSession(null)
        }
    // eslint-disable-next-line react-hooks/exhaustive-deps -- стили/onOrderSession: стабильная тема; session callback снаружи при необходимости обернуть в useCallback
    }, [mdOrder, apiContext, language, onFormValidate, panRef, expiryRef, cvcRef])

    return {
        isReady,
        initError,
        orderSession,
        doPayment,
        selectBinding,
    }
}
