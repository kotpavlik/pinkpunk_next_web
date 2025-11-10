/**
 * Менеджер для работы с токенами авторизации
 * Управляет accessToken, refreshToken и их обновлением
 */

const ACCESS_TOKEN_KEY = 'pinkpunk_access_token';
const REFRESH_TOKEN_KEY = 'pinkpunk_refresh_token';
const EXPIRES_AT_KEY = 'pinkpunk_expires_at';
const EXPIRES_IN_KEY = 'pinkpunk_expires_in';
const DEVICE_ID_KEY = 'pinkpunk_device_id';

// Запас времени перед истечением токена (5 минут)
const TOKEN_REFRESH_BUFFER = 5 * 60 * 1000;

class TokenManager {
    private refreshPromise: Promise<string> | null = null;

    /**
     * Получает или создает deviceId
     */
    getOrCreateDeviceId(): string {
        if (typeof window === 'undefined') {
            return '';
        }

        let deviceId = localStorage.getItem(DEVICE_ID_KEY);
        if (!deviceId) {
            deviceId = `web-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
            localStorage.setItem(DEVICE_ID_KEY, deviceId);
        }
        return deviceId;
    }

    /**
     * Сохраняет токены после авторизации
     */
    saveTokens(data: {
        accessToken: string;
        refreshToken: string;
        expiresIn: number;
    }): void {
        if (typeof window === 'undefined') {
            return;
        }

        try {
            const expiresAt = Date.now() + data.expiresIn * 1000;

            localStorage.setItem(ACCESS_TOKEN_KEY, data.accessToken);
            localStorage.setItem(REFRESH_TOKEN_KEY, data.refreshToken);
            localStorage.setItem(EXPIRES_IN_KEY, String(data.expiresIn));
            localStorage.setItem(EXPIRES_AT_KEY, String(expiresAt));
        } catch {
            // Ошибка сохранения токенов
        }
    }

    /**
     * Получает access token (с автоматическим refresh при необходимости)
     */
    async getAccessToken(): Promise<string | null> {
        if (typeof window === 'undefined') {
            return null;
        }

        const accessToken = localStorage.getItem(ACCESS_TOKEN_KEY);
        const expiresAt = parseInt(localStorage.getItem(EXPIRES_AT_KEY) || '0');

        // Если нет токена вообще (первая авторизация), возвращаем null
        if (!accessToken) {
            return null;
        }

        // Проверяем, не истек ли токен (с запасом)
        if (Date.now() >= expiresAt - TOKEN_REFRESH_BUFFER) {
            // Токен истек или скоро истечет - обновляем, но только если есть refresh token
            const refreshToken = localStorage.getItem(REFRESH_TOKEN_KEY);
            if (!refreshToken) {
                return null;
            }

            try {
                const newToken = await this.refreshAccessToken();
                return newToken;
            } catch {
                return null;
            }
        }

        return accessToken;
    }

    /**
     * Получает access token без автоматического refresh
     */
    getAccessTokenSync(): string | null {
        if (typeof window === 'undefined') {
            return null;
        }
        return localStorage.getItem(ACCESS_TOKEN_KEY);
    }

    /**
     * Проверяет, истек ли access token
     */
    isAccessTokenExpired(): boolean {
        if (typeof window === 'undefined') {
            return true;
        }

        const expiresAt = parseInt(localStorage.getItem(EXPIRES_AT_KEY) || '0');
        return Date.now() >= expiresAt - TOKEN_REFRESH_BUFFER;
    }

    /**
     * Обновляет access token используя refresh token
     */
    async refreshAccessToken(): Promise<string> {
        // Если уже идет refresh, ждем его
        if (this.refreshPromise) {
            return await this.refreshPromise;
        }

        this.refreshPromise = this._doRefresh();

        try {
            const token = await this.refreshPromise;
            return token;
        } finally {
            this.refreshPromise = null;
        }
    }

    /**
     * Внутренний метод для выполнения refresh
     */
    private async _doRefresh(): Promise<string> {
        if (typeof window === 'undefined') {
            throw new Error('Window is not available');
        }

        const refreshToken = localStorage.getItem(REFRESH_TOKEN_KEY);
        const deviceId = this.getOrCreateDeviceId();

        if (!refreshToken) {
            this.clearTokens();
            throw new Error('No refresh token available. Please login again.');
        }

        try {
            const baseURL = process.env.NEXT_PUBLIC_BASE_URL || 'https://pinkpunknestbot-production.up.railway.app';
            
            const response = await fetch(`${baseURL}/auth/refresh`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({
                    refreshToken,
                    deviceId,
                }),
            });

            if (!response.ok) {
                const error = await response.json().catch(() => ({
                    message: 'Failed to refresh token',
                }));

                // Очищаем токены при ошибке
                this.clearTokens();

                if (response.status === 401) {
                    // Очищаем данные пользователя из UserStore
                    // Используем динамический импорт, чтобы избежать циклических зависимостей
                    if (typeof window !== 'undefined') {
                        import('@/zustand/user_store/UserStore').then(({ useUserStore }) => {
                            useUserStore.getState().clearToken();
                        });
                    }

                    if (error.message?.includes('Telegram authentication expired')) {
                        // Telegram auth_date истек (15 дней)
                        if (typeof window !== 'undefined') {
                            alert(
                                'Авторизация Telegram истекла (15 дней). Пожалуйста, авторизуйтесь заново.'
                            );
                        }
                    } else {
                        // Refresh token невалиден
                        if (typeof window !== 'undefined') {
                            alert('Сессия истекла. Пожалуйста, авторизуйтесь заново.');
                        }
                    }

                    // Перезагружаем страницу для повторной авторизации
                    if (typeof window !== 'undefined') {
                        window.location.reload();
                    }

                    throw new Error(error.message || 'Token refresh failed');
                }

                throw new Error(error.message || 'Failed to refresh token');
            }

            const data = await response.json();
            this.saveTokens(data);
            return data.accessToken;
        } catch (error) {
            this.clearTokens();
            throw error;
        }
    }

    /**
     * Очищает все токены
     */
    clearTokens(): void {
        if (typeof window === 'undefined') {
            return;
        }

        localStorage.removeItem(ACCESS_TOKEN_KEY);
        localStorage.removeItem(REFRESH_TOKEN_KEY);
        localStorage.removeItem(EXPIRES_AT_KEY);
        localStorage.removeItem(EXPIRES_IN_KEY);
        // deviceId не удаляем, он нужен для следующей авторизации
    }

    /**
     * Проверяет, авторизован ли пользователь
     */
    isAuthenticated(): boolean {
        if (typeof window === 'undefined') {
            return false;
        }

        const accessToken = localStorage.getItem(ACCESS_TOKEN_KEY);
        const refreshToken = localStorage.getItem(REFRESH_TOKEN_KEY);
        return !!(accessToken || refreshToken);
    }

    /**
     * Получает refresh token
     */
    getRefreshToken(): string | null {
        if (typeof window === 'undefined') {
            return null;
        }
        return localStorage.getItem(REFRESH_TOKEN_KEY);
    }
}

// Экспорт singleton
export const tokenManager = new TokenManager();

