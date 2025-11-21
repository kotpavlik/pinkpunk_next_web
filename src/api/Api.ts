import axios, { AxiosError, InternalAxiosRequestConfig } from "axios";
import { tokenManager } from "@/utils/TokenManager";

export const instance = axios.create({
    baseURL: process.env.NEXT_PUBLIC_BASE_URL || 'https://pinkpunknestbot-production.up.railway.app',
    withCredentials: true,
});

// Интерцептор для добавления access token к запросам
instance.interceptors.request.use(
    async (config: InternalAxiosRequestConfig & { _skipAuth?: boolean }) => {
        // Если токен уже установлен вручную (для повторного запроса после refresh), не перезаписываем его
        if (config.headers?.Authorization || config._skipAuth) {
            return config;
        }

        // Получаем access token (с автоматическим refresh при необходимости)
        const accessToken = await tokenManager.getAccessToken();

        if (accessToken && config.headers) {
            // Убеждаемся, что токен передается в правильном формате: Bearer <token>
            config.headers.Authorization = `Bearer ${accessToken}`;
        }

        return config;
    },
    (error) => {
        return Promise.reject(error);
    }
);

// Интерцептор для обработки ошибок и автоматического refresh
instance.interceptors.response.use(
    (response) => {
        return response;
    },
    async (error: AxiosError) => {
        const originalRequest = error.config as InternalAxiosRequestConfig & { 
            _retry?: boolean; 
            _refreshAttempted?: boolean;
        };

        // Если получили 401 и еще не пытались обновить токен
        if (error.response?.status === 401 && !originalRequest._retry && !originalRequest._refreshAttempted) {
            originalRequest._retry = true;
            originalRequest._refreshAttempted = true;

            try {
                // Пробуем обновить токен
                const newAccessToken = await tokenManager.refreshAccessToken();

                if (newAccessToken && originalRequest.headers) {
                    // Убеждаемся, что токен передается в правильном формате: Bearer <token>
                    originalRequest.headers.Authorization = `Bearer ${newAccessToken}`;
                    // Устанавливаем флаг, чтобы интерцептор запроса не перезаписывал токен
                    (originalRequest as InternalAxiosRequestConfig & { _skipAuth?: boolean })._skipAuth = true;

                    // Повторяем запрос с новым токеном
                    const retryResponse = await instance(originalRequest);
                    return retryResponse;
                }
            } catch {
                // НЕ очищаем токены при ошибке refresh!
                // TokenManager сам решит, критическая это ошибка или временная
                // И сам очистит токены если нужно (через event-систему)
                // Здесь просто пробрасываем ошибку
            }
        }

        return Promise.reject(error);
    }
);




