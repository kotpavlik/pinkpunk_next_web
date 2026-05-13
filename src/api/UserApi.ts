import { AxiosResponse } from "axios";
import { UserType } from "@/zustand/user_store/UserStore";
import { instance } from "./Api";

/** Ответ авторизации Telegram / телефон (общий контракт бэкенда) */
export type AuthLoginSuccessResponse = UserType & {
    accessToken: string;
    refreshToken: string;
    expiresIn: number;
};

export type PhoneRequestCodeSuccessResponse = {
    sent: boolean;
    /** Время жизни OTP-послания (на бэке сейчас 120 с). */
    ttlSeconds: number;
    maxAttempts: number;
    /** Кулдаун до следующего «Отправить код»; если не пришёл — считать 60 с по спеки. */
    resendCooldownSeconds?: number;
};

/** POST /auth/phone/request-code — только эти ключи (`forbidNonWhitelisted`). */
export type PhoneAuthRequestCodeBody = {
    phone: string;
    deviceId?: string;
    deviceInfo?: string;
};

/** POST /auth/phone/verify */
export type PhoneAuthVerifyBody = PhoneAuthRequestCodeBody & {
    code: string;
};

// Тип данных от TelegramLoginWidget
export interface TelegramLoginWidgetData {
    id: number;
    first_name?: string;
    last_name?: string;
    username?: string;
    photo_url?: string;
    auth_date: number;
    hash: string;
}




export const UserApi = {
    async InitialUser(user: UserType): Promise<AxiosResponse> {
        const response = await instance.post<UserType, Promise<AxiosResponse>>('user/check_user', user)
        return response

    },

    async GetReferals(params: { telegramUserId: number }): Promise<AxiosResponse> {
        const response = await instance.post<{ telegramUserId: number }, Promise<AxiosResponse>>(
            'user/get_referals',
            params
        );
        return response;
    },

    /**
     * Валидирует Telegram Web App initData и создает/обновляет пользователя
     * @param initData - initData строка от Telegram Web App
     * @returns Promise с данными пользователя
     */
    async ValidateTelegramAuth(initData: string): Promise<AxiosResponse<UserType>> {
        const response = await instance.post<{ initData: string }, Promise<AxiosResponse<UserType>>>(
            'auth/telegram-validate',
            { initData }  
        )

        return response
    },

    /**
     * Валидирует данные от TelegramLoginWidget и создает/обновляет пользователя
     * @param telegramData - объект с данными от TelegramLoginWidget
     * @param deviceId - ID устройства (опционально)
     * @param deviceInfo - Информация об устройстве (опционально)
     * @returns Promise с данными пользователя и токенами
     */
    async ValidateTelegramLoginWidget(
        telegramData: TelegramLoginWidgetData,
        deviceId?: string,
        deviceInfo?: string
    ): Promise<AxiosResponse<Partial<AuthLoginSuccessResponse>>> {
        const body: TelegramLoginWidgetData & { deviceId?: string; deviceInfo?: string } = {
            ...telegramData,
        };

        if (deviceId) {
            body.deviceId = deviceId;
        }
        if (deviceInfo) {
            body.deviceInfo = deviceInfo;
        }

        const response = await instance.post<typeof body, Promise<AxiosResponse<Partial<AuthLoginSuccessResponse>>>>(
            'auth/telegram-login-widget',
            body
        );
        return response;
    },

    async RequestPhoneAuthCode(params: {
        phone: string;
        deviceId?: string;
        deviceInfo?: string;
    }): Promise<AxiosResponse<PhoneRequestCodeSuccessResponse>> {
        const body: PhoneAuthRequestCodeBody = {
            phone: params.phone.trim(),
        }
        const deviceId = params.deviceId?.trim()
        const deviceInfo = params.deviceInfo?.trim()
        if (deviceId) body.deviceId = deviceId
        if (deviceInfo) body.deviceInfo = deviceInfo

        const response = await instance.post<
            PhoneAuthRequestCodeBody,
            Promise<AxiosResponse<PhoneRequestCodeSuccessResponse>>
        >('auth/phone/request-code', body)
        return response
    },

    async VerifyPhoneAuth(params: {
        phone: string;
        code: string;
        deviceId?: string;
        deviceInfo?: string;
    }): Promise<AxiosResponse<Partial<AuthLoginSuccessResponse>>> {
        const body: PhoneAuthVerifyBody = {
            phone: params.phone.trim(),
            code: String(params.code).trim(),
        }
        const deviceId = params.deviceId?.trim()
        const deviceInfo = params.deviceInfo?.trim()
        if (deviceId) body.deviceId = deviceId
        if (deviceInfo) body.deviceInfo = deviceInfo

        const response = await instance.post<
            PhoneAuthVerifyBody,
            Promise<AxiosResponse<Partial<AuthLoginSuccessResponse>>>
        >('auth/phone/verify', body)
        return response
    },

    /**
     * Обновляет access token используя refresh token
     * @param refreshToken - refresh token
     * @param deviceId - ID устройства
     * @returns Promise с новыми токенами
     */
    async RefreshToken(refreshToken: string, deviceId: string): Promise<AxiosResponse<{
        accessToken: string;
        refreshToken: string;
        expiresIn: number;
    }>> {
        const response = await instance.post<
            { refreshToken: string; deviceId: string },
            Promise<AxiosResponse<{ accessToken: string; refreshToken: string; expiresIn: number }>>
        >('auth/refresh', {
            refreshToken,
            deviceId,
        });
        return response;
    },

    /**
     * Получает фото пользователя через Telegram Bot API
     * @param userId - Telegram user ID
     * @returns Promise с photo_url или null
     */
    async GetUserPhoto(userId: number): Promise<AxiosResponse<{ photo_url: string | null }>> {
        const response = await instance.post<
            { userId: number },
            Promise<AxiosResponse<{ photo_url: string | null }>>
        >('user/get-telegram-photo', { userId });
        return response;
    },

    /**
     * Обновляет контактную информацию пользователя.
     * @param data - объект с личными данными, телефоном и/или адресом доставки
     * @returns Promise с обновленными данными пользователя
     */
    async UpdateContactInfo(data: {
        personalFirstName?: string;
        personalLastName?: string;
        email?: string;
        userPhoneNumber?: string;
        shippingAddress?: {
            fullName: string;
            phone: string;
            street?: string;
            house?: string;
            apartment?: string;
            city: string;
            postalCode: string;
            country: string;
            notes?: string;
        };
    }): Promise<AxiosResponse<UserType>> {
        // Формируем тело запроса: отправляем только те данные, которые нужно обновить
        const requestBody: {
            personalFirstName?: string;
            personalLastName?: string;
            email?: string;
            userPhoneNumber?: string;
            shippingAddress?: {
                fullName: string;
                phone: string;
                street?: string;
                house?: string;
                apartment?: string;
                city: string;
                postalCode: string;
                country: string;
                notes?: string;
            };
        } = {};
        
        if (data.personalFirstName !== undefined) {
            requestBody.personalFirstName = data.personalFirstName;
        }

        if (data.personalLastName !== undefined) {
            requestBody.personalLastName = data.personalLastName;
        }

        if (data.email !== undefined) {
            requestBody.email = data.email;
        }

        if (data.userPhoneNumber !== undefined) {
            requestBody.userPhoneNumber = data.userPhoneNumber;
        }
        
        if (data.shippingAddress) {
            // Отправляем shippingAddress как вложенный объект
            requestBody.shippingAddress = {
                fullName: data.shippingAddress.fullName,
                phone: data.shippingAddress.phone,
                city: data.shippingAddress.city,
                postalCode: data.shippingAddress.postalCode,
                country: data.shippingAddress.country,
            };
            if (data.shippingAddress.street) {
                requestBody.shippingAddress.street = data.shippingAddress.street;
            }
            if (data.shippingAddress.house) {
                requestBody.shippingAddress.house = data.shippingAddress.house;
            }
            if (data.shippingAddress.apartment) {
                requestBody.shippingAddress.apartment = data.shippingAddress.apartment;
            }
            // Добавляем notes только если они есть
            if (data.shippingAddress.notes) {
                requestBody.shippingAddress.notes = data.shippingAddress.notes;
            }
        }
        
        const response = await instance.post<
            typeof requestBody,
            Promise<AxiosResponse<UserType>>
        >('user/update-contact-info', requestBody);
        return response;
    },

    /**
     * Получает список всех пользователей (только для администраторов)
     * @returns Promise с массивом всех пользователей
     */
    async GetAllUsers(): Promise<AxiosResponse<UserType[]>> {
        const response = await instance.get<UserType[], Promise<AxiosResponse<UserType[]>>>('user/all');
        return response;
    }

}