/** Нормализует ввод / автоподстановку до цифр OTP нужной длины. */
export function normalizeSmsOtpCode(raw: string, length: number): string {
    return raw.replace(/\D/g, '').slice(0, length)
}

type OtpCredential = Credential & { code: string }

/** WebOTP (Chrome Android): SMS должен содержать строку вида `@yourdomain.com #1234`. */
export function listenForWebOtpSms(
    onCode: (code: string) => void,
    signal: AbortSignal,
): void {
    if (typeof window === 'undefined') return
    if (!('OTPCredential' in window)) return
    if (!navigator.credentials?.get) return

    void navigator.credentials
        .get({
            otp: { transport: ['sms'] },
            signal,
        } as CredentialRequestOptions)
        .then((cred) => {
            if (signal.aborted || !cred || !('code' in cred)) return
            const code = (cred as OtpCredential).code
            if (code) onCode(code)
        })
        .catch(() => {
            /* отмена, таймаут или неподходящий формат SMS */
        })
}
