
import { AxiosError } from "axios";
import { immer } from 'zustand/middleware/immer';
import { useAppStore } from '../app_store/AppStore';
import { create } from 'zustand';
import { HandleError } from "@/feauteres/HandleError";
import { UserApi } from "@/api/UserApi";
import { TokenManager } from "@/utils/tokenManager";


export type UserType = {
    _id?: string,
    userId: number | null
    firstName?: string | undefined
    lastName?: string | undefined
    username: string | undefined
    isPremium?: boolean | undefined
    isAdmin?: boolean | undefined // Флаг администратора
    owner?: boolean | undefined // Флаг владельца (приходит с бэкенда)
    my_ref_invite_id?: number | null
    my_referers?: Array<UserType>
    wallet_addres?: string
    lastActivity?: string
    hasStartedBot?: boolean
    token?: string // JWT токен для аутентификации
}
export type UserStateType = {
    user: UserType
    initialUser: (user: UserType) => void
    getReferals: (userId: number) => void
    setToken: (token: string) => void
    clearToken: () => void
    isAuthenticated: () => boolean
    setAdminStatus: (isAdmin: boolean) => void
    isAdmin: () => boolean
    checkTokenForAdmin: () => Promise<void>
}

export type GetReferalsType = {
    userId: number
}



// Legacy token functions (kept for backward compatibility)
const TOKEN_KEY = 'pinkpunk_jwt_token';

const saveTokenToStorage = (token: string) => {
    if (typeof window !== 'undefined') {
        localStorage.setItem(TOKEN_KEY, token);
    }
};

const getTokenFromStorage = (): string | null => {
    if (typeof window !== 'undefined') {
        return localStorage.getItem(TOKEN_KEY);
    }
    return null;
};

const removeTokenFromStorage = () => {
    if (typeof window !== 'undefined') {
        localStorage.removeItem(TOKEN_KEY);
    }
};

export const useUserStore = create<UserStateType>()(immer((set, get) => ({
    user: {
        _id: '',
        firstName: '',
        isPremium: false,
        isAdmin: false,
        lastName: '',
        userId: null,
        username: '',
        wallet_addres: '',
        my_referers: [],
        my_ref_invite_id: null,
        token: getTokenFromStorage() || undefined
    },
    initialUser: async (user: UserType) => {
        const { setStatus } = useAppStore.getState()
        const { user: currentUser } = get()

        // Не делаем запрос если пользователь уже инициализирован с тем же userId
        if (currentUser.userId && currentUser.userId === user.userId && currentUser._id) {
            return;
        }

        try {
            setStatus("loading")
            const UserRequest = await UserApi.InitialUser(user)

            // Сохраняем текущий isAdmin статус перед обновлением
            const currentIsAdmin = currentUser.isAdmin

            set(state => {
                state.user = UserRequest.data
                // Восстанавливаем isAdmin статус если он был установлен
                if (currentIsAdmin) {
                    state.user.isAdmin = currentIsAdmin
                }
                // Если есть токен, проверяем его валидность для установки isAdmin
                else if (state.user.token) {
                    // Здесь можно добавить проверку токена, но пока просто логируем
                }
            })
            setStatus("success")

            // Проверяем токен для установки isAdmin статуса
            const { checkTokenForAdmin } = get();
            await checkTokenForAdmin();
        } catch (error) {
            const err = error as Error | AxiosError
            HandleError(err)
            setStatus("failed")
        }

    },


    getReferals: async (userId: number) => {
        const { setStatus } = useAppStore.getState()
        try {
            setStatus("loading")
            if (userId) {
                const my_referals = await UserApi.GetReferals({ userId })
                if (my_referals !== undefined && my_referals.data !== undefined) {
                    set(state => { state.user.my_referers = my_referals.data })
                } else {
                    set(state => { state.user.my_referers = [] })
                }
                setStatus("success")

            }

        } catch (error) {
            const err = error as Error | AxiosError
            HandleError(err)
            setStatus("failed")
        }
    },

    setToken: (token: string) => {
        saveTokenToStorage(token);
        set(state => { state.user.token = token });
    },

    clearToken: () => {
        removeTokenFromStorage();
        set(state => { state.user.token = undefined });
    },

    isAuthenticated: () => {
        // Check both legacy token and new token system
        const { user } = get();
        return !!(user.token || TokenManager.isAuthenticated());
    },

    setAdminStatus: (isAdmin: boolean) => {
        set(state => {
            state.user.isAdmin = isAdmin;
        });
    },

    isAdmin: () => {
        const { user } = get();
        return !!user.isAdmin;
    },

    // Проверяем токен при инициализации для установки isAdmin
    checkTokenForAdmin: async () => {
        const { user } = get();
        const hasLegacyToken = !!user.token;
        const hasNewTokens = TokenManager.isAuthenticated();

        if (!hasLegacyToken && !hasNewTokens) {
            return;
        }

        try {
            // Импортируем AdminApi динамически чтобы избежать циклических зависимостей
            const { AdminApi } = await import('@/api/AdminApi');
            const response = await AdminApi.validateToken();

            if (response.data.valid) {
                // Используем isAdmin из ответа бэкенда
                const userData = response.data.user as { isAdmin?: boolean };
                const isAdminFromBackend = userData?.isAdmin || false;
                set(state => { state.user.isAdmin = isAdminFromBackend });
            } else {
                set(state => { state.user.isAdmin = false });
                // Clear tokens if validation failed
                if (hasNewTokens) {
                    TokenManager.clearTokens();
                }
            }

        } catch {
            // Clear tokens on validation error
            if (hasNewTokens) {
                TokenManager.clearTokens();
            }
        }
    }
}
)))