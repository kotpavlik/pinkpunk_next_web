'use client'

import React, { useEffect, useCallback } from 'react';
import { useUserStore } from '@/zustand/user_store/UserStore';
import { AdminApi } from '@/api/AdminApi';
import { tokenManager } from '@/utils/TokenManager';
import { useRouter } from 'next/navigation';

interface AdminRouteGuardProps {
    children: React.ReactNode;
}

export const AdminRouteGuard: React.FC<AdminRouteGuardProps> = ({ children }) => {
    const isAdmin = useUserStore(state => state.user.isAdmin);
    const router = useRouter();

    // Функция проверки статуса админа
    const checkAdminStatus = useCallback(async () => {
        // Используем getAccessToken() вместо getAccessTokenSync()
        // это позволит автоматически обновить токен при необходимости
        const accessToken = await tokenManager.getAccessToken();

        if (!accessToken) {
            // Токена нет даже после попытки refresh
            console.log('🚫 No access token available after refresh attempt');
            useUserStore.getState().setAdminStatus(false);
            router.push('/');
            return;
        }

        try {
            // Добавляем таймаут для validateToken
            const validatePromise = AdminApi.validateToken();
            const timeoutPromise = new Promise((_, reject) =>
                setTimeout(() => reject(new Error('Validate timeout')), 10000) // Увеличили до 10 сек
            );

            const response = await Promise.race([validatePromise, timeoutPromise]) as Awaited<ReturnType<typeof AdminApi.validateToken>>;

            if (response.data.valid) {
                const userData = response.data.user as { isAdmin?: boolean, owner?: boolean };
                const isAdminFromBackend = userData?.isAdmin || false;
                const isOwnerFromBackend = userData?.owner || false;

                console.log('✅ Admin validation successful:', { isAdmin: isAdminFromBackend, isOwner: isOwnerFromBackend });

                useUserStore.getState().setAdminStatus(isAdminFromBackend);
                // @ts-expect-error optional method
                useUserStore.getState().setOwnerStatus?.(isOwnerFromBackend);
            } else {
                console.log('❌ Admin validation failed: token invalid');
                useUserStore.getState().setAdminStatus(false);
                // @ts-expect-error optional method
                useUserStore.getState().setOwnerStatus?.(false);
                tokenManager.clearTokens();
                router.push('/');
            }
        } catch (error: unknown) {
            const axiosError = error as { response?: { status: number } };

            console.error('⚠️ Admin validation error:', axiosError.response?.status || error);

            if (axiosError.response?.status === 401 || axiosError.response?.status === 403) {
                // Критическая ошибка авторизации
                console.log('🚨 Critical auth error, clearing tokens');
                useUserStore.getState().setAdminStatus(false);
                // @ts-expect-error optional method
                useUserStore.getState().setOwnerStatus?.(false);
                tokenManager.clearTokens();
                router.push('/');
            } else if (axiosError.response?.status === 404) {
                useUserStore.getState().setAdminStatus(false);
            } else {
                // Другие ошибки (сеть, таймаут) - не выкидываем пользователя
                console.log('⚠️ Temporary error, keeping user logged in');
            }
        }
    }, [router]);

    // 1. Первоначальная проверка при монтировании
    useEffect(() => {
        checkAdminStatus();
    }, [checkAdminStatus]);

    // 2. Периодическая проверка каждые 5 минут (только для админов)
    // Не нужно проверять слишком часто - токен обновляется автоматически
    useEffect(() => {
        if (!isAdmin) return;

        const interval = setInterval(() => {
            checkAdminStatus();
        }, 300000); // 5 минут

        return () => clearInterval(interval);
    }, [isAdmin, checkAdminStatus]);

    // 3. Проверка при возврате на вкладку
    useEffect(() => {
        const handleVisibilityChange = () => {
            if (document.visibilityState === 'visible' && isAdmin) {
                checkAdminStatus();
            }
        };

        document.addEventListener('visibilitychange', handleVisibilityChange);
        return () => document.removeEventListener('visibilitychange', handleVisibilityChange);
    }, [isAdmin, checkAdminStatus]);

    // 4. Проверка при фокусе окна
    useEffect(() => {
        const handleFocus = () => {
            if (isAdmin) {
                checkAdminStatus();
            }
        };

        window.addEventListener('focus', handleFocus);
        return () => window.removeEventListener('focus', handleFocus);
    }, [isAdmin, checkAdminStatus]);

    // 5. УБРАНО: Проверка при активности пользователя (клики, скролл)
    // Это слишком агрессивно и вызывает race conditions с обновлением токенов
    // TokenManager автоматически обновляет токены в фоне, дополнительные проверки не нужны

    return <>{children}</>;
};

