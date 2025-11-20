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
            console.log('🗑️ Tokens cleared via TokenManager')

            // Clear token from local store
            set(state => { state.token = '' })
            console.log('🗑️ Token removed from AdminLoginStore')

            // Clear token from main UserStore
            clearToken()
            console.log('🗑️ Token removed from UserStore')

            // Reset admin status
            setAdminStatus(false)
            console.log('👤 Admin status reset to false')
        },

        validateToken: async (): Promise<boolean> => {
            console.log('🔍 Starting token validation...');

            // Check both legacy token and new token system
            const { token } = useUserStore.getState().user
            const hasNewTokens = tokenManager.isAuthenticated()

            if (!token && !hasNewTokens) {
                console.log('❌ No tokens available');
                return false
            }

            set(state => { state.isCheckingToken = true })

            try {
                // Получаем токен с автоматическим refresh если нужно
                const currentAccessToken = await tokenManager.getAccessToken();
                
                if (!currentAccessToken && !token) {
                    console.log('❌ Failed to get valid access token');
                    return false;
                }

                console.log('📡 Sending validation request to backend...');
                const response = await AdminApi.validateToken()

                // Check if response contains valid: true
                if (response.data.valid) {
                    const { setAdminStatus } = useUserStore.getState()
                    setAdminStatus(true)

                    // Update local store with current access token
                    const finalToken = currentAccessToken || token || ''
                    set(state => { state.token = finalToken })

                    console.log('✅ Admin status set to true after validation')
                    return true
                } else {
                    console.log('❌ Token validation returned invalid')
                    return false
                }
            } catch (error: unknown) {
                // Token is invalid, clear everything
                const errorMessage = error instanceof Error ? error.message : 'Unknown error'
                const errorResponse = (error as { response?: { status?: number; data?: unknown } })?.response

                console.log('❌ Token validation failed:')
                console.log('  - Error message:', errorMessage)
                console.log('  - Error status:', errorResponse?.status)
                console.log('  - Error data:', errorResponse?.data)

                // Check if this is a 401 error (invalid token)
                if (errorResponse?.status === 401) {
                    console.log('🚫 Token is invalid or expired (401), clearing authentication')
                    
                    // Clear all tokens
                    tokenManager.clearTokens()
                    const { clearToken, setAdminStatus } = useUserStore.getState()
                    clearToken()
                    setAdminStatus(false)
                    set(state => { state.token = '' })
                } else {
                    // Для других ошибок (сеть, таймаут) не очищаем токены
                    console.log('⚠️ Non-401 error, keeping tokens (might be temporary)');
                }
                
                return false
            } finally {
                set(state => { state.isCheckingToken = false })
            }
        },

        getSessions: async (): Promise<SessionInfo[]> => {
            console.log('📋 Getting user sessions...')

            try {
                const response = await AdminApi.getSessions()
                console.log(`✅ Found ${response.data.count} active sessions`)
                return response.data.data // Бэкенд возвращает data, а не sessions
            } catch (error: unknown) {
                const errorMessage = error instanceof Error ? error.message : 'Unknown error'
                console.log('❌ Failed to get sessions:', errorMessage)
                return []
            }
        },

        revokeSession: async (jti: string): Promise<boolean> => {
            console.log('🗑️ Revoking session:', jti)

            try {
                await AdminApi.revokeSession(jti)
                console.log('✅ Session revoked successfully')
                return true
            } catch (error: unknown) {
                const errorMessage = error instanceof Error ? error.message : 'Unknown error'
                console.log('❌ Failed to revoke session:', errorMessage)
                return false
            }
        },

        logoutAllDevices: async (): Promise<void> => {
            const { clearToken, setAdminStatus } = useUserStore.getState()
            console.log('🚪 Logging out all devices...')

            try {
                await AdminApi.logoutAllDevices()
                console.log('✅ All devices logged out successfully')
            } catch (error) {
                console.warn('⚠️ Failed to logout all devices from server:', error)
            }

            // Clear tokens using TokenManager
            tokenManager.clearTokens()
            console.log('🗑️ Tokens cleared via TokenManager')

            // Clear token from local store
            set(state => { state.token = '' })
            console.log('🗑️ Token removed from AdminLoginStore')

            // Clear token from main UserStore
            clearToken()
            console.log('🗑️ Token removed from UserStore')

            // Reset admin status
            setAdminStatus(false)
            console.log('👤 Admin status reset to false')

            // Redirect to home
            window.location.href = '/'
        },

        // ========== Owner-only methods ==========

        getAllAdminSessions: async (): Promise<AdminSessionData[]> => {
            console.log('👑 Getting all admin sessions (owner only)...')

            try {
                const response = await AdminApi.getAllAdminSessions()
                console.log(`✅ Found ${response.data.count} admins with sessions`)
                return response.data.data
            } catch (error: unknown) {
                const errorMessage = error instanceof Error ? error.message : 'Unknown error'
                console.log('❌ Failed to get all admin sessions:', errorMessage)
                return []
            }
        },

        revokeAnySession: async (targetUserId: number, jti: string): Promise<boolean> => {
            console.log(`👑 Revoking session for user ${targetUserId}, jti:`, jti)

            try {
                await AdminApi.revokeAnySession(targetUserId, jti)
                console.log('✅ Session revoked successfully')
                return true
            } catch (error: unknown) {
                // Извлекаем детальную информацию об ошибке
                if (error && typeof error === 'object' && 'response' in error) {
                    const axiosError = error as { response?: { data?: { message?: string }, status?: number } }
                    const status = axiosError.response?.status
                    const message = axiosError.response?.data?.message

                    if (status === 403) {
                        console.log('❌ Access denied: Cannot revoke owner sessions')
                    } else if (message) {
                        console.log('❌ Failed to revoke session:', message)
                    }
                }
                const errorMessage = error instanceof Error ? error.message : 'Unknown error'
                console.log('❌ Failed to revoke session:', errorMessage)
                return false
            }
        },

        revokeAllAdminSessions: async (): Promise<{ affected: number }> => {
            console.log('👑 Revoking all admin sessions (owner only)...')

            try {
                const response = await AdminApi.revokeAllAdminSessions()
                console.log(`✅ Successfully logged out ${response.data.affected} admin(s)`)
                return { affected: response.data.affected }
            } catch (error: unknown) {
                const errorMessage = error instanceof Error ? error.message : 'Unknown error'
                console.log('❌ Failed to revoke all admin sessions:', errorMessage)
                return { affected: 0 }
            }
        }
    }))
)
