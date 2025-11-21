import { AxiosError } from "axios";
import { immer } from 'zustand/middleware/immer';
import { useAppStore } from '../app_store/AppStore';
import { useUserStore } from '../user_store/UserStore';
import { create } from 'zustand';
import { HandleError } from "@/features/HandleError";
import { AdminApi } from "@/api/AdminApi";
import { tokenManager } from "@/utils/TokenManager";

import { SessionInfo, AdminSessionData } from "@/api/AdminApi";

export type AdminLoginType = {
    token: string,
    isCheckingToken: boolean,
    loginAdmin: (userDataForLogin: LoginDataType) => Promise<void>
    logoutAdmin: () => Promise<void>
    validateToken: () => Promise<boolean>
    getSessions: () => Promise<SessionInfo[]>
    revokeSession: (jti: string) => Promise<boolean>
    logoutAllDevices: () => Promise<void>
    // Owner-only methods
    getAllAdminSessions: () => Promise<AdminSessionData[]>
    revokeAnySession: (targetUserId: number, jti: string) => Promise<boolean>
    revokeAllAdminSessions: () => Promise<{ affected: number }>
}

export type LoginDataType = {
    password: string,
    userData: {
        userId: string,
        username: string,
        _id: string
    }
}

export const useAdminLoginStore = create<AdminLoginType>()(
    immer((set) => ({
        token: '',
        isCheckingToken: false,
        loginAdmin: async (userDataForLogin: LoginDataType) => {
            const { setStatus } = useAppStore.getState()
            const { setToken, setAdminStatus } = useUserStore.getState()
            try {
                setStatus("loading")

                // Use new login method with device-based authentication
                const response = await AdminApi.loginAdmin(userDataForLogin.password, userDataForLogin.userData)

                // Extract tokens from response
                const { accessToken, refreshToken, expiresIn } = response.data

                // Save tokens using TokenManager
                tokenManager.setTokens(accessToken, refreshToken, expiresIn)

                // Also save access token to legacy UserStore for backward compatibility
                setToken(accessToken)

                // Save token to local store for backward compatibility
                set(state => { state.token = accessToken })

                // Set admin status
                setAdminStatus(true)

                setStatus("success")
            } catch (error) {
                const err = error as Error | AxiosError
                HandleError(err)
                setStatus("failed")
                // Пробрасываем ошибку дальше, чтобы LoginForm мог её обработать
                throw error
            }

        },

        logoutAdmin: async () => {
            const { clearToken, setAdminStatus } = useUserStore.getState()

            try {
                // Use new logout method
                await AdminApi.logoutDevice()
            } catch {
                // Don't interrupt logout process
            }

            // Clear tokens using TokenManager
            tokenManager.clearTokens()

            // Clear token from local store
            set(state => { state.token = '' })

            // Clear token from main UserStore
            clearToken()

            // Reset admin status
            setAdminStatus(false)
        },

        validateToken: async (): Promise<boolean> => {
            // Check both legacy token and new token system
            const { token } = useUserStore.getState().user
            const hasNewTokens = tokenManager.isAuthenticated()

            if (!token && !hasNewTokens) {
                return false
            }

            set(state => { state.isCheckingToken = true })

            try {
                // Получаем токен с автоматическим refresh если нужно
                const currentAccessToken = await tokenManager.getAccessToken();
                
                if (!currentAccessToken && !token) {
                    return false;
                }

                const response = await AdminApi.validateToken()

                // Check if response contains valid: true
                if (response.data.valid) {
                    const { setAdminStatus } = useUserStore.getState()
                    setAdminStatus(true)

                    // Update local store with current access token
                    const finalToken = currentAccessToken || token || ''
                    set(state => { state.token = finalToken })

                    return true
                } else {
                    return false
                }
            } catch (error: unknown) {
                // Token is invalid, clear everything
                const errorResponse = (error as { response?: { status?: number; data?: unknown } })?.response

                // Check if this is a 401 error (invalid token)
                if (errorResponse?.status === 401) {
                    // Clear all tokens
                    tokenManager.clearTokens()
                    const { clearToken, setAdminStatus } = useUserStore.getState()
                    clearToken()
                    setAdminStatus(false)
                    set(state => { state.token = '' })
                }
                
                return false
            } finally {
                set(state => { state.isCheckingToken = false })
            }
        },

        getSessions: async (): Promise<SessionInfo[]> => {

            try {
                const response = await AdminApi.getSessions()
                return response.data.data // Бэкенд возвращает data, а не sessions
            } catch (error: unknown) {
                const errorMessage = error instanceof Error ? error.message : 'Unknown error'
                return []
            }
        },

        revokeSession: async (jti: string): Promise<boolean> => {

            try {
                await AdminApi.revokeSession(jti)
                return true
            } catch (error: unknown) {
                const errorMessage = error instanceof Error ? error.message : 'Unknown error'
                return false
            }
        },

        logoutAllDevices: async (): Promise<void> => {
            const { clearToken, setAdminStatus } = useUserStore.getState()

            try {
                await AdminApi.logoutAllDevices()
            } catch (error) {
            }

            // Clear tokens using TokenManager
            tokenManager.clearTokens()

            // Clear token from local store
            set(state => { state.token = '' })

            // Clear token from main UserStore
            clearToken()

            // Reset admin status
            setAdminStatus(false)

            // Redirect to home
            window.location.href = '/'
        },

        // ========== Owner-only methods ==========

        getAllAdminSessions: async (): Promise<AdminSessionData[]> => {

            try {
                const response = await AdminApi.getAllAdminSessions()
                return response.data.data
            } catch (error: unknown) {
                const errorMessage = error instanceof Error ? error.message : 'Unknown error'
                return []
            }
        },

        revokeAnySession: async (targetUserId: number, jti: string): Promise<boolean> => {

            try {
                await AdminApi.revokeAnySession(targetUserId, jti)
                return true
            } catch (error: unknown) {
                // Извлекаем детальную информацию об ошибке
                if (error && typeof error === 'object' && 'response' in error) {
                    const axiosError = error as { response?: { data?: { message?: string }, status?: number } }
                    const status = axiosError.response?.status
                    const message = axiosError.response?.data?.message

                    if (status === 403) {
                        // Access denied
                    } else if (message) {
                        // Failed to revoke
                    }
                }
                const errorMessage = error instanceof Error ? error.message : 'Unknown error'
                return false
            }
        },

        revokeAllAdminSessions: async (): Promise<{ affected: number }> => {

            try {
                const response = await AdminApi.revokeAllAdminSessions()
                return { affected: response.data.affected }
            } catch (error: unknown) {
                const errorMessage = error instanceof Error ? error.message : 'Unknown error'
                return { affected: 0 }
            }
        }
    }))
)
