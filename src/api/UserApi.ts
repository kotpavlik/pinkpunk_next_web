import { AxiosResponse } from "axios";
import { GetReferalsType, UserType } from "@/zustand/user_store/UserStore";
import { instance } from "./Api";

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
        console.log(response)
        return response

    },

    async GetReferals(userId: GetReferalsType): Promise<AxiosResponse> {
        const response = await instance.post<number, Promise<AxiosResponse>>('user/get_referals', userId)
        return response
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
    ): Promise<AxiosResponse<UserType & { accessToken?: string; refreshToken?: string; expiresIn?: number }>> {
        const body: TelegramLoginWidgetData & { deviceId?: string; deviceInfo?: string } = {
            ...telegramData,
        };

        if (deviceId) {
            body.deviceId = deviceId;
        }
        if (deviceInfo) {
            body.deviceInfo = deviceInfo;
        }

        const response = await instance.post<
            typeof body,
            Promise<AxiosResponse<UserType & { accessToken?: string; refreshToken?: string; expiresIn?: number }>>
        >('auth/telegram-login-widget', body);
        console.log(response)
        return response;
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
     * Обновляет контактную информацию пользователя (телефон и/или адрес доставки)
     * @param data - объект с userPhoneNumber и/или shippingAddress
     * @returns Promise с обновленными данными пользователя
     */
    async UpdateContactInfo(data: {
        userPhoneNumber?: string;
        shippingAddress?: {
            fullName: string;
            phone: string;
            address: string;
            city: string;
            postalCode: string;
            country: string;
            notes?: string;
        };
    }): Promise<AxiosResponse<UserType>> {
        // Формируем тело запроса: отправляем только те данные, которые нужно обновить
        const requestBody: {
            userPhoneNumber?: string;
            shippingAddress?: {
                fullName: string;
                phone: string;
                address: string;
                city: string;
                postalCode: string;
                country: string;
                notes?: string;
            };
        } = {};
        
        if (data.userPhoneNumber !== undefined) {
            requestBody.userPhoneNumber = data.userPhoneNumber;
        }
        
        if (data.shippingAddress) {
            // Отправляем shippingAddress как вложенный объект
            requestBody.shippingAddress = {
                fullName: data.shippingAddress.fullName,
                phone: data.shippingAddress.phone,
                address: data.shippingAddress.address,
                city: data.shippingAddress.city,
                postalCode: data.shippingAddress.postalCode,
                country: data.shippingAddress.country,
            };
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
    }

}