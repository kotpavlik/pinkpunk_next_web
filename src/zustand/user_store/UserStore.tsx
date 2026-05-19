
import { AxiosError } from "axios";
import { immer } from 'zustand/middleware/immer';
import { useAppStore } from '../app_store/AppStore';
import { create } from 'zustand';
import { HandleError } from "@/features/HandleError";
import { UserApi, TelegramLoginWidgetData, AuthLoginSuccessResponse } from "@/api/UserApi";
import { tokenManager } from "@/utils/TokenManager";
import { normalizeAuthTokensFromResponse } from "@/utils/normalizeAuthTokensPayload";
import { digitsToPlusE164, isPhoneDigitsProbablyValid, normalizePhoneDigits } from "@/utils/phoneNormalize";
import { resolveLinkAccountIdForTelegramWidget } from "@/utils/resolveLinkAccountId";

// Тип для данных от TelegramLoginWidget
export interface TelegramUser {
    id: number;
    first_name?: string;
    last_name?: string;
    username?: string;
    photo_url?: string;
    auth_date: number;
    hash: string;
}


export type ShippingAddress = {
    fullName: string;
    phone: string;
    street?: string;
    house?: string;
    apartment?: string;
    city: string;
    postalCode: string;
    country: string;
    notes?: string;
}

export type UserType = {
    _id?: string,
    /** Числовой id в Telegram — только если аккаунт связан с Telegram */
    telegramUserId?: number | null
    firstName?: string | undefined
    lastName?: string | undefined
    personalFirstName?: string | undefined
    personalLastName?: string | undefined
    email?: string | undefined
    username: string | undefined
    photo_url?: string | undefined // URL фотографии профиля пользователя (snake_case для совместимости)
    photoUrl?: string | undefined // URL фотографии профиля пользователя (camelCase от бэкенда)
    languageCode?: string | undefined // Код языка пользователя
    isPremium?: boolean | undefined
    isBot?: boolean | undefined
    isAdmin?: boolean | undefined // Флаг администратора
    owner?: boolean | undefined // Флаг владельца (приходит с бэкенда)
    my_ref_invite_id?: number | null
    my_referers?: Array<UserType>
    walletAddress?: string
    lastActivity?: string
    hasStartedBot?: boolean
    token?: string // JWT токен для аутентификации
    userPhoneNumber?: string // Номер телефона пользователя
    shippingAddress?: ShippingAddress // Адрес доставки
    totalOrders?: number // Общее количество заказов
    totalSpent?: number // Общая сумма потраченных средств
}

/** Сохранённый в LS профиль может содержать старое поле `userId` (Telegram) */
type LegacyStoredUser = Partial<UserType> & { userId?: number | null };

/**
 * Приводим ответ логина / legacy-хранилище к каноническому `telegramUserId`.
 * Бэкенд может временно слать telegram id как `userId`.
 */
export function normalizeUserProfileFromBackend(
    profile: Partial<UserType> & {
        userId?: number | null;
        accessToken?: string;
        refreshToken?: string;
        expiresIn?: number;
    },
): UserType {
    const telegramUserId =
        profile.telegramUserId !== undefined && profile.telegramUserId !== null
            ? profile.telegramUserId
            : profile.userId !== undefined && profile.userId !== null
                ? profile.userId
                : null;

    const restWide = { ...profile } as Record<string, unknown>;
    delete restWide.userId;
    delete restWide.accessToken;
    delete restWide.refreshToken;
    delete restWide.expiresIn;

    const core = restWide as Omit<UserType, 'username' | 'telegramUserId'> &
        Partial<Pick<UserType, 'username' | 'telegramUserId'>>;

    return {
        ...core,
        username: core.username ?? '',
        telegramUserId,
    };
}



export type UserStateType = {
    user: UserType
    initialUser: (user: UserType) => void
    getReferals: (telegramUserId: number) => void
    setToken: (token: string) => void
    setUser: (user: UserType) => void
    clearToken: () => void
    isAuthenticated: () => boolean
    setAdminStatus: (isAdmin: boolean) => void
    isAdmin: () => boolean
    updateContactInfo: (data: {
        personalFirstName?: string;
        personalLastName?: string;
        email?: string;
        userPhoneNumber?: string;
        shippingAddress?: ShippingAddress;
    }) => Promise<{ success: boolean; error?: string }>
    checkTokenForAdmin: () => Promise<void>
    authenticateTelegramLoginWidget: (telegramUser: TelegramUser) => Promise<{ success: boolean; error?: string }>
    requestPhoneAuthCode: (
        phone: string,
    ) => Promise<
        | { success: true; codeTtlSeconds: number; resendCooldownSeconds: number }
        | { success: false; error?: string }
    >
    verifyPhoneAuth: (
        phone: string,
        code: string,
    ) => Promise<{ success: boolean; error?: string }>
}



// Legacy token functions (kept for backward compatibility)
const TOKEN_KEY = 'pinkpunk_jwt_token';
const USER_DATA_KEY = 'pinkpunk_user_data';

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

// Функции для сохранения и загрузки данных пользователя
const saveUserToStorage = (user: UserType) => {
    if (typeof window !== 'undefined') {
        try {
            // Не сохраняем токен в данных пользователя, он сохраняется отдельно
            const userWithoutToken = { ...user };
            delete userWithoutToken.token;
            localStorage.setItem(USER_DATA_KEY, JSON.stringify(userWithoutToken));
        } catch {
            // Ошибка сохранения данных пользователя
        }
    }
};

const getUserFromStorage = (): UserType | null => {
    if (typeof window !== 'undefined') {
        try {
            const userData = localStorage.getItem(USER_DATA_KEY);
            if (userData) {
                const parsed = JSON.parse(userData) as LegacyStoredUser;
                const user = normalizeUserProfileFromBackend(parsed);
                const token = getTokenFromStorage();
                return { ...user, token: token || undefined, isAdmin: false };
            }
        } catch {
            // Ошибка загрузки данных пользователя
        }
    }
    return null;
};

const removeUserFromStorage = () => {
    if (typeof window !== 'undefined') {
        localStorage.removeItem(USER_DATA_KEY);
    }
};

// Загружаем данные пользователя из localStorage при инициализации
const initialUserData = getUserFromStorage() || {
    _id: '',
    firstName: '',
    isPremium: false,
    isAdmin: false,
    lastName: '',
    telegramUserId: null,
    username: '',
    walletAddress: '',
    my_referers: [],
    my_ref_invite_id: null,
    token: getTokenFromStorage() || undefined,
    userPhoneNumber: undefined,
    shippingAddress: undefined
};

export const useUserStore = create<UserStateType>()(immer((set, get) => {
    const finishStorefrontAuthSession = async (
        responseData: Partial<AuthLoginSuccessResponse>,
    ) => {
        const tokens = normalizeAuthTokensFromResponse(responseData as unknown);
        if (!tokens) {
            throw new Error('Данные сессии не получены от бэкенда');
        }

        tokenManager.saveTokens(tokens);

        const userNormalized = normalizeUserProfileFromBackend(responseData);

        set(state => {
            state.user = userNormalized;
            if (state.user.isAdmin === undefined) {
                state.user.isAdmin = false;
            }
            saveUserToStorage(state.user);
        });

        await get().checkTokenForAdmin();
    };


    return {
        user: initialUserData,
        initialUser: async (user: UserType) => {
        const { setStatus } = useAppStore.getState()
        const { user: currentUser } = get()

        if (currentUser._id && user._id && currentUser._id === user._id) {
            return;
        }

        try {
            setStatus("loading")
            const UserRequest = await UserApi.InitialUser(user)

            set(state => {
                state.user = normalizeUserProfileFromBackend(UserRequest.data as LegacyStoredUser)
                // isAdmin устанавливается только из данных бэкенда
                // Если бэкенд не вернул isAdmin, устанавливаем false
                if (state.user.isAdmin === undefined) {
                    state.user.isAdmin = false
                }
                // Сохраняем данные пользователя в localStorage
                saveUserToStorage(state.user)
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


    getReferals: async (telegramUserIdParam: number) => {
        const { setStatus } = useAppStore.getState()
        try {
            setStatus("loading")
            if (telegramUserIdParam) {
                const my_referals = await UserApi.GetReferals({ telegramUserId: telegramUserIdParam })
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

    setUser: (userData: UserType) => {
        set(state => {
            state.user = { ...state.user, ...userData };
            saveUserToStorage(state.user);
        });
    },

    clearToken: () => {
        // Очищаем старые токены (legacy)
        removeTokenFromStorage();
        // Очищаем новые токены
        tokenManager.clearTokens();
        // Очищаем данные пользователя
        removeUserFromStorage();
        set(state => {
            state.user.token = undefined;
            // Сбрасываем данные пользователя
            state.user = {
                _id: '',
                firstName: '',
                isPremium: false,
                isAdmin: false,
                lastName: '',
                telegramUserId: null,
                username: '',
                walletAddress: '',
                my_referers: [],
                my_ref_invite_id: null,
            };
        });
    },

    isAuthenticated: () => {
        // Проверяем новые токены (accessToken/refreshToken) или legacy token
        const { user } = get();
        return tokenManager.isAuthenticated() || !!user.token;
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
        // Admin token system disabled: ensure isAdmin is false
        set(state => { state.user.isAdmin = false });
        return;
    },

    /**
     * Авторизация через TelegramLoginWidget
     * Валидирует данные от виджета и обновляет состояние пользователя
     * @param telegramUser - данные от TelegramLoginWidget
     * @returns Promise с результатом авторизации
     */
    authenticateTelegramLoginWidget: async (telegramUser: TelegramUser) => {
        try {
            if (!telegramUser.hash) {
                throw new Error('Hash is missing')
            }
            if (!telegramUser.auth_date) {
                throw new Error('Auth date is missing')
            }
            if (!telegramUser.id) {
                throw new Error('User ID is missing')
            }

            // Формируем объект для отправки на бэкенд
            const telegramData: TelegramLoginWidgetData = {
                id: telegramUser.id,
                auth_date: telegramUser.auth_date,
                hash: telegramUser.hash,
            }

            // Добавляем опциональные поля
            if (telegramUser.first_name) {
                telegramData.first_name = telegramUser.first_name
            }
            if (telegramUser.last_name) {
                telegramData.last_name = telegramUser.last_name
            }
            if (telegramUser.username) {
                telegramData.username = telegramUser.username
            }
            // Всегда отправляем photo_url на бэкенд, если он есть
            // Бэкенд сам определит, зашифрован ли он, и обработает соответственно
            if (telegramUser.photo_url) {
                telegramData.photo_url = telegramUser.photo_url
            }

            const deviceId = tokenManager.getOrCreateDeviceId()
            const deviceInfo = typeof navigator !== 'undefined' ? navigator.userAgent : undefined

            const linkAccountId = resolveLinkAccountIdForTelegramWidget(
                get().user._id,
                get().isAuthenticated(),
            )

            const response = await UserApi.ValidateTelegramLoginWidget(telegramData, {
                deviceId,
                deviceInfo,
                ...(linkAccountId ? { linkAccountId } : {}),
            })

            if (response.data) {
                await finishStorefrontAuthSession(response.data)
                return { success: true }
            } else {
                throw new Error('Данные пользователя не получены от бэкенда')
            }
        } catch (err) {
            const axiosError = err as AxiosError<{ message?: string; error?: string }>

            let errorMessage = 'Ошибка авторизации'
            let clearStoredAccountId = false

            if (axiosError.response) {
                const status = axiosError.response.status
                const data = axiosError.response.data
                const msg = data?.message ?? ''

                switch (status) {
                    case 400:
                        if (msg.includes('Hash is missing')) {
                            errorMessage = 'Ошибка: Отсутствует подпись. Пожалуйста, попробуйте еще раз.'
                        } else if (msg.includes('Auth date is missing')) {
                            errorMessage = 'Ошибка: Отсутствует дата авторизации. Пожалуйста, попробуйте еще раз.'
                        } else if (msg.includes('User ID is missing')) {
                            errorMessage = 'Ошибка: Отсутствует ID пользователя. Пожалуйста, попробуйте еще раз.'
                        } else if (msg.includes('linkAccountId') && msg.includes('valid MongoDB ObjectId')) {
                            errorMessage = 'Ошибка привязки аккаунта. Войдите по SMS и попробуйте снова.'
                            clearStoredAccountId = true
                        } else if (msg.includes('User not found')) {
                            errorMessage = 'Сессия устарела. Войдите по номеру телефона и повторите привязку Telegram.'
                            clearStoredAccountId = true
                        } else if (msg.includes('already linked to another Telegram')) {
                            errorMessage =
                                'Этот профиль уже привязан к другому Telegram. Войдите в нужный аккаунт Telegram или используйте другой номер.'
                        } else {
                            errorMessage = msg || 'Невалидные данные. Пожалуйста, попробуйте еще раз.'
                        }
                        break
                    case 401:
                        // Обработка различных ошибок 401
                        if (data?.message?.includes('expired')) {
                            errorMessage = 'Сессия истекла. Пожалуйста, авторизуйтесь заново.'
                        } else if (data?.message?.includes('signature') || data?.message?.includes('Invalid signature')) {
                            errorMessage = 'Ошибка безопасности. Пожалуйста, попробуйте еще раз.'
                        } else {
                            errorMessage = data?.message || 'Ошибка авторизации. Пожалуйста, попробуйте еще раз.'
                        }
                        break
                    default:
                        errorMessage = data?.message || data?.error || 'Произошла ошибка. Пожалуйста, попробуйте позже.'
                }
            } else if (err instanceof Error) {
                // Обработка ошибок валидации на фронтенде
                if (err.message.includes('Hash is missing')) {
                    errorMessage = 'Ошибка: Отсутствует подпись. Пожалуйста, попробуйте еще раз.'
                } else if (err.message.includes('Auth date is missing')) {
                    errorMessage = 'Ошибка: Отсутствует дата авторизации. Пожалуйста, попробуйте еще раз.'
                } else if (err.message.includes('User ID is missing')) {
                    errorMessage = 'Ошибка: Отсутствует ID пользователя. Пожалуйста, попробуйте еще раз.'
                } else {
                    errorMessage = err.message
                }
            } else if (axiosError.message) {
                errorMessage = axiosError.message
            }

            if (clearStoredAccountId) {
                set(state => {
                    state.user._id = ''
                    saveUserToStorage(state.user)
                })
            }

            return { success: false, error: errorMessage }
        }
    },

    requestPhoneAuthCode: async (phone: string) => {
        const trimmed = phone.trim()
        if (!trimmed) {
            return { success: false, error: 'Введите номер телефона' }
        }
        const digits = normalizePhoneDigits(trimmed)
        if (!isPhoneDigitsProbablyValid(digits)) {
            return {
                success: false,
                error: 'Проверьте номер телефона (нужно от 9 до 15 цифр после нормализации).',
            }
        }
        const phoneForApi = digitsToPlusE164(digits)
        const deviceId = tokenManager.getOrCreateDeviceId().trim()
        if (!deviceId) {
            return {
                success: false,
                error: 'Не удалось определить устройство. Обновите страницу и попробуйте снова.',
            }
        }
        try {
            const deviceInfo = typeof navigator !== 'undefined' ? navigator.userAgent : undefined
            const res = await UserApi.RequestPhoneAuthCode({
                phone: phoneForApi,
                deviceId,
                ...(deviceInfo ? { deviceInfo } : {}),
            })
            const data = res.data
            const codeTtlSeconds =
                typeof data?.ttlSeconds === 'number' && Number.isFinite(data.ttlSeconds) ? data.ttlSeconds : 120
            const resendCooldownSeconds =
                typeof data?.resendCooldownSeconds === 'number' &&
                Number.isFinite(data.resendCooldownSeconds)
                    ? data.resendCooldownSeconds
                    : 60
            return { success: true, codeTtlSeconds, resendCooldownSeconds }
        } catch (err) {
            const axiosError = err as AxiosError<{ message?: string; error?: string } | string>
            let errorMessage = 'Не удалось отправить код. Попробуйте позже.'
            if (axiosError.response) {
                const status = axiosError.response.status
                const rawData = axiosError.response.data
                const text =
                    typeof rawData === 'string'
                        ? rawData.trim()
                        : rawData && typeof rawData === 'object' && !Array.isArray(rawData) && 'message' in rawData
                          ? String((rawData as { message?: string }).message ?? '').trim()
                          : ''
                if (status === 429 && text) {
                    errorMessage = text
                } else if (status === 400) {
                    errorMessage = text || 'Проверьте номер телефона и попробуйте ещё раз.'
                } else if (status === 502) {
                    errorMessage = 'Сервис SMS временно недоступен. Попробуйте позже.'
                } else if (text) {
                    errorMessage = text
                }
            } else if (err instanceof Error && err.message) {
                errorMessage = err.message
            }
            return { success: false, error: errorMessage }
        }
    },

    verifyPhoneAuth: async (phone: string, code: string) => {
        const trimmedPhoneRaw = phone.trim()
        if (!trimmedPhoneRaw) {
            return { success: false, error: 'Введите номер телефона' }
        }
        const phoneDigits = normalizePhoneDigits(trimmedPhoneRaw)
        if (!isPhoneDigitsProbablyValid(phoneDigits)) {
            return {
                success: false,
                error: 'Проверьте номер телефона (нужно от 9 до 15 цифр после нормализации).',
            }
        }
        const phoneForApi = digitsToPlusE164(phoneDigits)
        const trimmedCode = code.trim()
        if (!/^\d{4}$/.test(trimmedCode)) {
            return { success: false, error: 'Введите 4 цифры кода из SMS' }
        }
        const deviceId = tokenManager.getOrCreateDeviceId().trim()
        if (!deviceId) {
            return {
                success: false,
                error: 'Не удалось определить устройство. Обновите страницу и попробуйте снова.',
            }
        }
        try {
            const deviceInfo = typeof navigator !== 'undefined' ? navigator.userAgent : undefined
            const response = await UserApi.VerifyPhoneAuth({
                phone: phoneForApi,
                code: trimmedCode,
                deviceId,
                ...(deviceInfo ? { deviceInfo } : {}),
            })
            if (response.data) {
                await finishStorefrontAuthSession(response.data as Partial<AuthLoginSuccessResponse>)
            } else {
                throw new Error('Пустой ответ сервера')
            }
            return { success: true }
        } catch (err) {
            const axiosError = err as AxiosError<unknown>
            let errorMessage =
                'Не удалось войти. Проверьте код и попробуйте снова.'
            const payload = axiosError.response?.data
            if (typeof payload === 'string' && payload.trim()) {
                errorMessage = payload.trim()
            } else if (payload && typeof payload === 'object' && !Array.isArray(payload)) {
                const msg = 'message' in payload ? (payload as { message?: string }).message : undefined
                if (typeof msg === 'string' && msg.trim()) {
                    errorMessage = msg.trim()
                }
            } else if (err instanceof Error && err.message && !err.message.includes('Данные сессии')) {
                errorMessage = err.message
            }
            return { success: false, error: errorMessage }
        }
    },

    /**
     * Обновляет контактную информацию пользователя (телефон и/или адрес доставки)
     * @param data - объект с userPhoneNumber и/или shippingAddress
     * @returns Promise с результатом операции
     */
    updateContactInfo: async (data: {
        userPhoneNumber?: string;
        shippingAddress?: ShippingAddress;
    }) => {
        try {
            const response = await UserApi.UpdateContactInfo(data);

            if (response.data) {
                // Сервер возвращает { message: string, user: { userId, userPhoneNumber/shippingAddress } }
                const responseData = response.data as UserType & {
                    message?: string;
                    user?: {
                        userId?: number;
                        userPhoneNumber?: string;
                        shippingAddress?: ShippingAddress;
                    };
                };

                // Извлекаем обновленные данные из ответа
                const updatedData: Partial<UserType> = {};

                if (data.userPhoneNumber !== undefined) {
                    // Приоритет: responseData.user.userPhoneNumber > responseData.userPhoneNumber > data.userPhoneNumber
                    if (responseData.user?.userPhoneNumber) {
                        updatedData.userPhoneNumber = responseData.user.userPhoneNumber;
                    } else if ((responseData as UserType).userPhoneNumber) {
                        updatedData.userPhoneNumber = (responseData as UserType).userPhoneNumber;
                    } else {
                        updatedData.userPhoneNumber = data.userPhoneNumber;
                    }
                }

                if (data.shippingAddress !== undefined) {
                    // Приоритет: responseData.user.shippingAddress > responseData.shippingAddress > data.shippingAddress
                    if (responseData.user?.shippingAddress) {
                        updatedData.shippingAddress = responseData.user.shippingAddress;
                    } else if ((responseData as UserType).shippingAddress) {
                        updatedData.shippingAddress = (responseData as UserType).shippingAddress;
                    } else {
                        updatedData.shippingAddress = data.shippingAddress;
                    }
                }

                // Обновляем UserStore с новыми данными
                set(state => {
                    state.user = { ...state.user, ...updatedData };
                    saveUserToStorage(state.user);
                });

                return { success: true };
            }

            return { success: false, error: 'Не удалось обновить контактную информацию' };
        } catch (err) {
            const axiosError = err as AxiosError<{ message?: string; error?: string }>;
            let errorMessage = 'Ошибка при обновлении контактной информации';

            if (axiosError.response) {
                const data = axiosError.response.data;
                const status = axiosError.response.status;

                switch (status) {
                    case 400:
                        // Пытаемся извлечь детали ошибки валидации
                        const errorDetails = data?.message || data?.error || 'Невалидные данные. Пожалуйста, проверьте введенные данные.';
                        errorMessage = Array.isArray(errorDetails)
                            ? errorDetails.join(', ')
                            : errorDetails;
                        break;
                    case 401:
                        errorMessage = 'Сессия истекла. Пожалуйста, авторизуйтесь заново.';
                        // Очищаем токены и данные пользователя при 401
                        tokenManager.clearTokens();
                        set(state => {
                            removeUserFromStorage();
                            state.user = {
                                _id: '',
                                firstName: '',
                                isPremium: false,
                                isAdmin: false,
                                lastName: '',
                                telegramUserId: null,
                                username: '',
                                walletAddress: '',
                                my_referers: [],
                                my_ref_invite_id: null,
                                token: undefined,
                                userPhoneNumber: undefined,
                                shippingAddress: undefined
                            };
                        });
                        break;
                    default:
                        errorMessage = data?.message || data?.error || 'Произошла ошибка. Пожалуйста, попробуйте позже.';
                }
            } else if (axiosError instanceof Error) {
                errorMessage = axiosError.message;
            }

            HandleError(err);
            return { success: false, error: errorMessage };
        }
    },
    };
}));
