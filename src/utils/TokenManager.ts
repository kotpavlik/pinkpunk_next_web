/**
 * Улучшенный менеджер для работы с токенами авторизации
 * Управляет accessToken, refreshToken и их обновлением
 * 
 * ПАРАМЕТРЫ ТОКЕНОВ (от бэкенда):
 * - accessToken (JWT): живет 1 час (3600 секунд)
 * - refreshToken: живет 30 дней
 * 
 * УЛУЧШЕНИЯ v2.0:
 * ✅ Увеличен буфер обновления до 10 минут (вместо 5)
 * ✅ Убраны агрессивные alert() и window.location.reload()
 * ✅ Добавлена retry-логика с экспоненциальной задержкой
 * ✅ Добавлена event-система для уведомления UI
 * ✅ Токены не очищаются сразу при временных ошибках
 * ✅ Добавлено фоновое обновление токенов
 */

const ACCESS_TOKEN_KEY = 'pinkpunk_access_token';
const REFRESH_TOKEN_KEY = 'pinkpunk_refresh_token';
const EXPIRES_AT_KEY = 'pinkpunk_expires_at';
const EXPIRES_IN_KEY = 'pinkpunk_expires_in';
const DEVICE_ID_KEY = 'pinkpunk_device_id';

// Запас времени перед истечением токена (10 минут вместо 5)
// Токен живет 60 минут, обновляем на 50-й минуте
const TOKEN_REFRESH_BUFFER = 10 * 60 * 1000;

// Параметры retry-логики
const MAX_RETRY_ATTEMPTS = 3;
const RETRY_BASE_DELAY = 1000; // 1 секунда
const RETRY_MAX_DELAY = 10000; // 10 секунд

// Event types для уведомления UI
export type TokenEventType = 
    | 'TOKEN_EXPIRED'           // Токен истек, нужна повторная авторизация
    | 'TOKEN_REFRESHED'         // Токен успешно обновлен
    | 'TOKEN_REFRESH_FAILED'    // Не удалось обновить токен (временно)
    | 'SESSION_EXPIRED'         // Сессия истекла (нет активных сессий)
    | 'TELEGRAM_AUTH_EXPIRED'   // Telegram auth_date истек (15 дней)
    | 'NETWORK_ERROR';          // Сетевая ошибка при обновлении

export type TokenEventListener = (event: TokenEventType, data?: unknown) => void;

class TokenManager {
    private refreshPromise: Promise<string> | null = null;
    private backgroundRefreshTimer: NodeJS.Timeout | null = null;
    private eventListeners: Set<TokenEventListener> = new Set();
    private retryCount = 0;
    private isRefreshing = false;

    /**
     * Подписывается на события токенов
     */
    addEventListener(listener: TokenEventListener): () => void {
        this.eventListeners.add(listener);
        // Возвращаем функцию для отписки
        return () => this.eventListeners.delete(listener);
    }
    
    /**
     * Отправляет событие всем подписчикам
     */
    private emitEvent(event: TokenEventType, data?: unknown): void {
        console.log(`🔔 Token Event: ${event}`, data);
        this.eventListeners.forEach(listener => {
            try {
                listener(event, data);
            } catch (error) {
                console.error('Error in token event listener:', error);
            }
        });
    }

    /** 
     * Получает или создает deviceId (deploy for vercel)
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
            const timeUntilExpiry = Math.round((expiresAt - Date.now()) / 1000 / 60);

            localStorage.setItem(ACCESS_TOKEN_KEY, data.accessToken);
            localStorage.setItem(REFRESH_TOKEN_KEY, data.refreshToken);
            localStorage.setItem(EXPIRES_IN_KEY, String(data.expiresIn));
            localStorage.setItem(EXPIRES_AT_KEY, String(expiresAt));

            console.log('💾 Tokens saved successfully');
            console.log('  - Access token (first 20):', data.accessToken.substring(0, 20) + '...');
            console.log('  - Time until expiry:', timeUntilExpiry, 'minutes');
            console.log('  - Will refresh at:', new Date(expiresAt - TOKEN_REFRESH_BUFFER).toLocaleTimeString());

            // Сбрасываем счетчик retry при успешном сохранении
            this.retryCount = 0;

            // Запускаем фоновое обновление
            this.startBackgroundRefresh();
        } catch (error) {
            console.error('❌ Error saving tokens:', error);
        }
    }

    /**
     * Запускает фоновое обновление токена
     */
    private startBackgroundRefresh(): void {
        // Останавливаем предыдущий таймер, если есть
        this.stopBackgroundRefresh();

        if (typeof window === 'undefined') {
            return;
        }

        const expiresAt = parseInt(localStorage.getItem(EXPIRES_AT_KEY) || '0');
        if (!expiresAt) return;

        // Вычисляем время до обновления (за 10 минут до истечения)
        const timeUntilRefresh = expiresAt - TOKEN_REFRESH_BUFFER - Date.now();

        if (timeUntilRefresh > 0) {
            console.log(`⏰ Background refresh scheduled in ${Math.round(timeUntilRefresh / 1000 / 60)} minutes`);
            this.backgroundRefreshTimer = setTimeout(() => {
                this.refreshAccessToken().catch(error => {
                    console.error('Background refresh failed:', error);
                });
            }, timeUntilRefresh);
        }
    }

    /**
     * Останавливает фоновое обновление токена
     */
    private stopBackgroundRefresh(): void {
        if (this.backgroundRefreshTimer) {
            clearTimeout(this.backgroundRefreshTimer);
            this.backgroundRefreshTimer = null;
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
                this.emitEvent('TOKEN_EXPIRED');
                return null;
            }

            try {
                const newToken = await this.refreshAccessToken();
                return newToken;
            } catch (error) {
                console.error('Failed to refresh token in getAccessToken:', error);
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

        this.refreshPromise = this._doRefreshWithRetry();

        try {
            const token = await this.refreshPromise;
            return token;
        } finally {
            this.refreshPromise = null;
            this.isRefreshing = false;
        }
    }

    /**
     * Выполняет refresh с retry-логикой
     */
    private async _doRefreshWithRetry(): Promise<string> {
        this.isRefreshing = true;
        let lastError: Error | null = null;

        for (let attempt = 0; attempt < MAX_RETRY_ATTEMPTS; attempt++) {
            try {
                console.log(`🔄 Refresh attempt ${attempt + 1}/${MAX_RETRY_ATTEMPTS}`);
                const token = await this._doRefresh();
                
                // Успешно обновили - сбрасываем счетчик
                this.retryCount = 0;
                this.emitEvent('TOKEN_REFRESHED', { attempt: attempt + 1 });
                
                return token;
            } catch (error) {
                lastError = error as Error;
                
                // Проверяем тип ошибки
                const errorMessage = lastError.message || '';
                
                // Если это критическая ошибка (401), не делаем retry
                if (errorMessage.includes('Session expired') ||
                    errorMessage.includes('No active sessions') ||
                    errorMessage.includes('Telegram authentication expired') ||
                    errorMessage.includes('Invalid refresh token')) {
                    console.error('🚨 Critical auth error, stopping retry:', errorMessage);
                    break;
                }

                // Для остальных ошибок (сетевые и т.д.) делаем retry
                if (attempt < MAX_RETRY_ATTEMPTS - 1) {
                    const delay = Math.min(
                        RETRY_BASE_DELAY * Math.pow(2, attempt),
                        RETRY_MAX_DELAY
                    );
                    console.log(`⏳ Retrying in ${delay}ms...`);
                    this.emitEvent('TOKEN_REFRESH_FAILED', { attempt: attempt + 1, delay });
                    await new Promise(resolve => setTimeout(resolve, delay));
                }
            }
        }

        // Все попытки исчерпаны
        console.error('❌ All refresh attempts failed');
        throw lastError || new Error('Failed to refresh token after multiple attempts');
    }

    /**
     * Внутренний метод для выполнения refresh (одна попытка)
     */
    private async _doRefresh(): Promise<string> {
        if (typeof window === 'undefined') {
            throw new Error('Window is not available');
        }

        const refreshToken = localStorage.getItem(REFRESH_TOKEN_KEY);
        const deviceId = this.getOrCreateDeviceId();

        if (!refreshToken) {
            this.emitEvent('TOKEN_EXPIRED');
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

                if (response.status === 401) {
                    // Критическая ошибка авторизации
                    const errorMessage = error.message || '';
                    
                    // Очищаем токены только при критических ошибках
                    this.clearTokens();
                    
                    // Очищаем данные пользователя из UserStore
                    if (typeof window !== 'undefined') {
                        import('@/zustand/user_store/UserStore').then(({ useUserStore }) => {
                            useUserStore.getState().clearToken();
                        });
                    }

                    // Отправляем соответствующее событие вместо alert
                    if (errorMessage.includes('Telegram authentication expired')) {
                        this.emitEvent('TELEGRAM_AUTH_EXPIRED', { message: errorMessage });
                    } else if (
                        errorMessage.includes('No active sessions') ||
                        errorMessage.includes('Session expired') ||
                        errorMessage.includes('Invalid refresh token')
                    ) {
                        this.emitEvent('SESSION_EXPIRED', { message: errorMessage });
                    } else {
                        this.emitEvent('TOKEN_EXPIRED', { message: errorMessage });
                    }

                    throw new Error(errorMessage || 'Token refresh failed');
                }

                // Для других ошибок (5xx и т.д.) не очищаем токены
                throw new Error(error.message || 'Failed to refresh token');
            }

            const data = await response.json();
            
            console.log('✅ Refresh successful, saving new tokens');
            console.log('  - New access token (first 20 chars):', data.accessToken.substring(0, 20));
            console.log('  - Expires in:', data.expiresIn, 'seconds');
            
            this.saveTokens(data);
            
            console.log('💾 New tokens saved to localStorage');
            
            return data.accessToken;
        } catch (error) {
            // Если это сетевая ошибка (нет интернета и т.д.), НЕ очищаем токены
            if (error instanceof TypeError && error.message.includes('fetch')) {
                console.error('🌐 Network error during token refresh:', error);
                this.emitEvent('NETWORK_ERROR', { error: error.message });
                throw new Error('Network error: Please check your internet connection');
            }
            
            // Пробрасываем другие ошибки
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

        this.stopBackgroundRefresh();
        
        localStorage.removeItem(ACCESS_TOKEN_KEY);
        localStorage.removeItem(REFRESH_TOKEN_KEY);
        localStorage.removeItem(EXPIRES_AT_KEY);
        localStorage.removeItem(EXPIRES_IN_KEY);
        // deviceId не удаляем, он нужен для следующей авторизации
        
        console.log('🗑️ Tokens cleared');
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

    /**
     * Получает deviceId (алиас для getOrCreateDeviceId)
     */
    getDeviceId(): string {
        return this.getOrCreateDeviceId();
    }

    /**
     * Получает информацию об устройстве
     */
    getDeviceInfo(): string {
        if (typeof window === 'undefined') {
            return 'Unknown';
        }
        return navigator.userAgent || 'Unknown';
    }

    /**
     * Сохраняет токены (алиас для saveTokens с другим форматом)
     */
    setTokens(accessToken: string, refreshToken: string, expiresIn?: number): void {
        this.saveTokens({
            accessToken,
            refreshToken,
            expiresIn: expiresIn || 3600 // По умолчанию 1 час
        });
    }

    /**
     * Получает время до истечения токена в миллисекундах
     */
    getTimeUntilExpiry(): number {
        if (typeof window === 'undefined') {
            return 0;
        }

        const expiresAt = parseInt(localStorage.getItem(EXPIRES_AT_KEY) || '0');
        return Math.max(0, expiresAt - Date.now());
    }

    /**
     * Проверяет, идет ли сейчас обновление токена
     */
    isCurrentlyRefreshing(): boolean {
        return this.isRefreshing;
    }
}

// Экспорт singleton
export const tokenManager = new TokenManager();
