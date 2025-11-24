
import { AxiosError } from "axios";
import { immer } from 'zustand/middleware/immer';
import { useAppStore } from '../app_store/AppStore';
import { create } from 'zustand';
import { HandleError } from "@/features/HandleError";
import { UserApi, TelegramLoginWidgetData } from "@/api/UserApi";
import { tokenManager } from "@/utils/TokenManager";
import { isEncryptedTelegramPhotoUrl } from "@/components/ui/shared/TelegramLoginWidget";

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
    address: string;
    city: string;
    postalCode: string;
    country: string;
    notes?: string;
}

export type UserType = {
    _id?: string,
    userId: number | null
    firstName?: string | undefined
    lastName?: string | undefined
    username: string | undefined
    photo_url?: string | undefined // URL фотографии профиля пользователя (snake_case для совместимости)
    photoUrl?: string | undefined // URL фотографии профиля пользователя (camelCase от бэкенда)
    languageCode?: string | undefined // Код языка пользователя
    isPremium?: boolean | undefined
    isAdmin?: boolean | undefined // Флаг администратора
    owner?: boolean | undefined // Флаг владельца (приходит с бэкенда)
    my_ref_invite_id?: number | null
    my_referers?: Array<UserType>
    wallet_addres?: string
    lastActivity?: string
    hasStartedBot?: boolean
    token?: string // JWT токен для аутентификации
    userPhoneNumber?: string // Номер телефона пользователя
    shippingAddress?: ShippingAddress // Адрес доставки
}
export type UserStateType = {
    user: UserType
    initialUser: (user: UserType) => void
    getReferals: (userId: number) => void
    setToken: (token: string) => void
    setUser: (user: UserType) => void
    clearToken: () => void
    isAuthenticated: () => boolean
    setAdminStatus: (isAdmin: boolean) => void
    isAdmin: () => boolean
    updateContactInfo: (data: {
        userPhoneNumber?: string;
        shippingAddress?: ShippingAddress;
    }) => Promise<{ success: boolean; error?: string }>
    checkTokenForAdmin: () => Promise<void>
    authenticateTelegramLoginWidget: (telegramUser: TelegramUser) => Promise<{ success: boolean; error?: string }>
}

export type GetReferalsType = {
    userId: number
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
                const user = JSON.parse(userData) as UserType;
                // Восстанавливаем токен из отдельного хранилища
                const token = getTokenFromStorage();
                // isAdmin не загружаем из localStorage, он должен приходить только с бэкенда
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
    userId: null,
    username: '',
    wallet_addres: '',
    my_referers: [],
    my_ref_invite_id: null,
    token: getTokenFromStorage() || undefined,
    userPhoneNumber: undefined,
    shippingAddress: undefined
};

export const useUserStore = create<UserStateType>()(immer((set, get) => ({
    user: initialUserData,
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

            set(state => {
                state.user = UserRequest.data
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
                userId: null,
                username: '',
                wallet_addres: '',
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
        const { setStatus } = useAppStore.getState()

        try {
            setStatus('loading')

            // Проверяем обязательные поля перед отправкой
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

            // Получаем deviceId и deviceInfo для отправки на бэкенд
            const deviceId = tokenManager.getOrCreateDeviceId()
            const deviceInfo = typeof navigator !== 'undefined' ? navigator.userAgent : undefined

            // Отправляем данные на бэкенд для валидации
            const response = await UserApi.ValidateTelegramLoginWidget(telegramData, deviceId, deviceInfo)

            if (response.data) {
                // Сохраняем токены, если они пришли от бэкенда
                if (response.data.accessToken && response.data.refreshToken && response.data.expiresIn) {
                    tokenManager.saveTokens({
                        accessToken: response.data.accessToken,
                        refreshToken: response.data.refreshToken,
                        expiresIn: response.data.expiresIn,
                    })
                }

                // Обновляем UserStore напрямую с данными от бэкенда
                // Не вызываем initialUser, так как данные уже получены от бэкенда

                // Удаляем токены из данных пользователя перед сохранением
                const userData = { ...response.data };
                delete (userData as { accessToken?: string; refreshToken?: string; expiresIn?: number }).accessToken;
                delete (userData as { accessToken?: string; refreshToken?: string; expiresIn?: number }).refreshToken;
                delete (userData as { accessToken?: string; refreshToken?: string; expiresIn?: number }).expiresIn;

                set(state => {
                    state.user = userData
                    // isAdmin устанавливается только из данных бэкенда
                    // Если бэкенд не вернул isAdmin, устанавливаем false
                    if (state.user.isAdmin === undefined) {
                        state.user.isAdmin = false
                    }
                    // Сохраняем данные пользователя в localStorage
                    saveUserToStorage(state.user)
                })

                // Проверяем токен для установки isAdmin статуса
                const { checkTokenForAdmin } = get()
                await checkTokenForAdmin()

                // После успешной авторизации пытаемся получить фото через Bot API
                // если photo_url отсутствует в данных от виджета или была зашифрованной ссылкой
                const isEncryptedPhoto = telegramUser.photo_url ? isEncryptedTelegramPhotoUrl(telegramUser.photo_url) : false
                if ((!telegramData.photo_url && !userData.photo_url) || isEncryptedPhoto) {
                    try {
                        const photoResponse = await UserApi.GetUserPhoto(telegramUser.id)
                        const photoUrl = photoResponse.data?.photo_url
                        if (photoUrl) {
                            // Обновляем photo_url в userData (преобразуем null в undefined)
                            userData.photo_url = photoUrl || undefined
                            
                            // Обновляем в state
                            set(state => {
                                state.user.photo_url = photoUrl || undefined
                                saveUserToStorage(state.user)
                            })
                        }
                    } catch (err) {
                        // Игнорируем ошибку получения фото - не критично
                        // Фото может быть недоступно из-за настроек приватности
                        console.log('Could not fetch user photo:', err)
                    }
                }

                setStatus('success')
                return { success: true }
            } else {
                throw new Error('Данные пользователя не получены от бэкенда')
            }
        } catch (err) {
            const axiosError = err as AxiosError<{ message?: string; error?: string }>

            let errorMessage = 'Ошибка авторизации'

            if (axiosError.response) {
                const status = axiosError.response.status
                const data = axiosError.response.data

                switch (status) {
                    case 400:
                        // Обработка различных ошибок 400
                        if (data?.message?.includes('Hash is missing')) {
                            errorMessage = 'Ошибка: Отсутствует подпись. Пожалуйста, попробуйте еще раз.'
                        } else if (data?.message?.includes('Auth date is missing')) {
                            errorMessage = 'Ошибка: Отсутствует дата авторизации. Пожалуйста, попробуйте еще раз.'
                        } else if (data?.message?.includes('User ID is missing')) {
                            errorMessage = 'Ошибка: Отсутствует ID пользователя. Пожалуйста, попробуйте еще раз.'
                        } else {
                            errorMessage = data?.message || 'Невалидные данные. Пожалуйста, попробуйте еще раз.'
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

            setStatus('failed')
            HandleError(err)

            return { success: false, error: errorMessage }
        }
    },

    /**
     * Обновляет access token используя refresh token
     * @returns Promise с новым access token или null при ошибке
     */
    refreshAccessToken: async () => {
        try {
            const newAccessToken = await tokenManager.refreshAccessToken();
            return newAccessToken;
        } catch {
            // При ошибке refresh токены уже очищены в TokenManager
            return null;
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
                                userId: null,
                                username: '',
                                wallet_addres: '',
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
    }
}
)))