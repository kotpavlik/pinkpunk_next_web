import { AxiosResponse } from "axios";
import { instance } from "./Api";
import { tokenManager } from "@/utils/TokenManager";

// Types for new auth system
export interface AdminLoginRequest {
    password: string;
    userData: Record<string, unknown>;
    deviceId: string;
    deviceInfo?: string;
}

export interface AdminLoginResponse {
    accessToken: string;
    refreshToken: string;
    expiresIn: number;
}

export interface RefreshRequest {
    refreshToken: string;
    deviceId: string;
}

export interface RefreshResponse {
    accessToken: string;
    refreshToken: string;
    expiresIn: number;
}

export interface LogoutRequest {
    deviceId: string;
}

export interface LogoutResponse {
    success: boolean;
}

export interface ValidateTokenResponse {
    valid: boolean;
    user: Record<string, unknown>;
}

export interface SessionInfo {
    jti: string;
    deviceId: string;
    deviceInfo?: string;
    createdAt: string;
    lastUsedAt: string;
    expiresAt: string;
}

export interface GetSessionsResponse {
    success: boolean;
    data: SessionInfo[];
    count: number;
}

export interface RevokeSessionRequest {
    jti: string;
}

export interface RevokeSessionResponse {
    success: boolean;
    message: string;
}

// Owner-specific interfaces
export interface AdminSessionData {
    userId: number;
    username: string;
    sessions: SessionInfo[];
}

export interface GetAllAdminSessionsResponse {
    success: boolean;
    data: AdminSessionData[];
    count: number;
    message: string;
}

export interface RevokeAnySessionRequest {
    targetUserId: number;
    jti: string;
}

export interface RevokeAnySessionResponse {
    success: boolean;
    message: string;
}

export interface RevokeAllAdminSessionsResponse {
    success: boolean;
    affected: number;
    message: string;
}

export const AdminApi = {
    /**
     * Admin login with device-based authentication
     * Возвращает пару токенов:
     * - accessToken: JWT (eyJ...) для API запросов, живет 1 час
     * - refreshToken: hex строка (64 символа) для обновления, живет 30 дней
     */
    async loginAdmin(password: string, userData: Record<string, unknown>): Promise<AxiosResponse<AdminLoginResponse>> {
        const deviceId = tokenManager.getDeviceId();
        const deviceInfo = tokenManager.getDeviceInfo();
        
        console.log('🔐 Admin login with device:', deviceId);
        
        const requestData: AdminLoginRequest = {
            password,
            userData,
            deviceId,
            deviceInfo
        };

        const response = await instance.post<AdminLoginResponse>('/auth/admin-login', requestData);
        
        console.log('✅ Login successful, received token pair');
        console.log('  - Access token:', response.data.accessToken.substring(0, 20) + '...');
        console.log('  - Refresh token:', response.data.refreshToken.substring(0, 20) + '...');
        
        return response;
    },

    /**
     * Refresh access token
     * ВАЖНО: Отправляет refreshToken (hex строку), НЕ accessToken (JWT)!
     * Возвращает НОВУЮ пару токенов (rotation)
     */
    async refreshToken(): Promise<AxiosResponse<RefreshResponse>> {
        const refreshToken = tokenManager.getRefreshToken();
        const deviceId = tokenManager.getDeviceId();

        if (!refreshToken) {
            throw new Error('No refresh token available');
        }

        console.log('🔄 Refreshing tokens with device:', deviceId);
        console.log('  - Using refresh token:', refreshToken.substring(0, 20) + '...');

        const requestData: RefreshRequest = {
            refreshToken,  // ← Hex строка (64 символа), НЕ JWT!
            deviceId
        };

        const response = await instance.post<RefreshResponse>('/auth/refresh', requestData);
        
        console.log('✅ Tokens refreshed successfully');
        console.log('  - New access token:', response.data.accessToken.substring(0, 20) + '...');
        console.log('  - New refresh token:', response.data.refreshToken.substring(0, 20) + '...');
        
        return response;
    },

    /**
     * Logout current device
     * Требует Authorization header с accessToken
     */
    async logoutDevice(): Promise<AxiosResponse<LogoutResponse>> {
        const deviceId = tokenManager.getDeviceId();
        
        console.log('🚪 Logging out device:', deviceId);
        
        const requestData: LogoutRequest = {
            deviceId
        };

        const response = await instance.post<LogoutResponse>('/auth/logout', requestData);
        
        console.log('✅ Device logged out successfully');
        
        return response;
    },

    /**
     * Logout all devices
     * Требует Authorization header с accessToken
     */
    async logoutAllDevices(): Promise<AxiosResponse<LogoutResponse>> {
        console.log('🚪 Logging out all devices');
        
        const response = await instance.post<LogoutResponse>('/auth/logout-all', {});
        
        console.log('✅ All devices logged out successfully');
        
        return response;
    },

    /**
     * Validate current access token
     * Использует accessToken (JWT) из заголовка Authorization
     */
    async validateToken(): Promise<AxiosResponse<ValidateTokenResponse>> {
        console.log('🔍 Validating access token');
        
        const response = await instance.get<ValidateTokenResponse>('/auth/validate-token');
        
        console.log('✅ Token is valid');
        
        return response;
    },

    /**
     * Get all active sessions for current user
     * Требует Authorization header с accessToken
     */
    async getSessions(): Promise<AxiosResponse<GetSessionsResponse>> {
        console.log('📋 Getting user sessions');
        
        const response = await instance.get<GetSessionsResponse>('/auth/sessions');
        
        console.log(`✅ Found ${response.data.count} active sessions`);
        
        return response;
    },

    /**
     * Revoke specific session by JTI
     * Требует Authorization header с accessToken
     */
    async revokeSession(jti: string): Promise<AxiosResponse<RevokeSessionResponse>> {
        console.log('🗑️ Revoking session:', jti);
        
        const requestData: RevokeSessionRequest = {
            jti
        };
        
        const response = await instance.post<RevokeSessionResponse>('/auth/revoke-session', requestData);
        
        console.log('✅ Session revoked successfully');
        
        return response;
    },

    // ========== Owner-only endpoints ==========

    /**
     * Get all admin sessions (only for owners)
     * Требует Authorization header с accessToken
     * Защищено OwnerGuard на бэкенде
     */
    async getAllAdminSessions(): Promise<AxiosResponse<GetAllAdminSessionsResponse>> {
        console.log('👑 Getting all admin sessions (owner only)');
        
        const response = await instance.get<GetAllAdminSessionsResponse>('/auth/owner/all-sessions');
        
        console.log(`✅ Found ${response.data.count} admins with sessions`);
        
        return response;
    },

    /**
     * Revoke any user's session by userId and JTI (only for owners)
     * Требует Authorization header с accessToken
     * Защищено OwnerGuard на бэкенде
     */
    async revokeAnySession(targetUserId: number, jti: string): Promise<AxiosResponse<RevokeAnySessionResponse>> {
        console.log(`👑 Revoking session for user ${targetUserId}, jti: ${jti}`);
        
        const requestData: RevokeAnySessionRequest = {
            targetUserId,
            jti
        };
        
        const response = await instance.post<RevokeAnySessionResponse>('/auth/owner/revoke-any-session', requestData);
        
        console.log('✅ Session revoked successfully');
        
        return response;
    },

    /**
     * Revoke all admin sessions (only for owners)
     * Требует Authorization header с accessToken
     * Защищено OwnerGuard на бэкенде
     * Не затрагивает сессии самих владельцев
     */
    async revokeAllAdminSessions(): Promise<AxiosResponse<RevokeAllAdminSessionsResponse>> {
        console.log('👑 Revoking all admin sessions (owner only)');
        
        const response = await instance.post<RevokeAllAdminSessionsResponse>('/auth/owner/revoke-all-admin-sessions', {});
        
        console.log(`✅ Successfully logged out ${response.data.affected} admin(s)`);
        
        return response;
    }
}
