/**
 * Alfa Bank Web SDK (multiframe main.js) — типы по документации PaymentForm / React SPA.
 */

type SdkFieldContainer = {
    container: Element | null
    onFocus?: (containerElement: HTMLElement) => void
    onBlur?: (containerElement: HTMLElement) => void
    onValidate?: (isValid: boolean, containerElement: HTMLElement) => void
}

export type AlfaPaymentFormOptions = {
    mdOrder: string
    fields: {
        pan: SdkFieldContainer
        expiry: SdkFieldContainer
        cvc: SdkFieldContainer
    }
    apiContext?: string
    language?: string
    autofocus?: boolean
    autoFocus?: boolean
    shouldMaskPan?: boolean
    shouldMaskExpiry?: boolean
    shouldMaskCvc?: boolean
    showPanIcon?: boolean
    panIconStyle?: Record<string, string>
    styles?: Record<string, unknown>
    customStyles?: Record<string, unknown>
    containerClassName?: string
    bindingPanFormat?: string
    onFormValidate?: (result: boolean) => void
}

/** Связка карты в сессии (после init) */
export type AlfaBindingInfo = {
    id: string
    pan: string
}

export type AlfaOrderSession = {
    bindings: AlfaBindingInfo[]
    bindingEnabled: boolean
}

/** Экземпляр после `new PaymentForm` — обязателен вызов `init()` (см. инструкцию React SPA). */
export type AlfaPaymentFormInstance = {
    init: () => Promise<{ orderSession: AlfaOrderSession }>
    doPayment: (params: Record<string, unknown>) => Promise<unknown>
    destroy: () => void
    selectBinding: (bindingId: string | null) => void
}

declare global {
    interface Window {
        PaymentForm: new (options: AlfaPaymentFormOptions) => AlfaPaymentFormInstance
    }
}
