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
        const accessToken = tokenManager.getAccessTokenSync();
        if (!accessToken) {
            useUserStore.getState().setAdminStatus(false);
            router.push('/');
            return;
        }

        try {
            // Добавляем таймаут для validateToken
            const validatePromise = AdminApi.validateToken();
            const timeoutPromise = new Promise((_, reject) =>
                setTimeout(() => reject(new Error('Validate timeout')), 5000)
            );

            const response = await Promise.race([validatePromise, timeoutPromise]) as Awaited<ReturnType<typeof AdminApi.validateToken>>;
            if (response.data.valid) {
                const userData = response.data.user as { isAdmin?: boolean, owner?: boolean };
                const isAdminFromBackend = userData?.isAdmin || false;
                const isOwnerFromBackend = userData?.owner || false;
                useUserStore.getState().setAdminStatus(isAdminFromBackend);
                // @ts-expect-error optional method
                useUserStore.getState().setOwnerStatus?.(isOwnerFromBackend);
            } else {
                useUserStore.getState().setAdminStatus(false);
                // @ts-expect-error optional method
                useUserStore.getState().setOwnerStatus?.(false);
                tokenManager.clearTokens();
                router.push('/');
            }
        } catch (error: unknown) {
            const axiosError = error as { response?: { status: number } };
            if (axiosError.response?.status === 401 || axiosError.response?.status === 403) {
                useUserStore.getState().setAdminStatus(false);
                // @ts-expect-error optional method
                useUserStore.getState().setOwnerStatus?.(false);
                tokenManager.clearTokens();
                router.push('/');
            } else if (axiosError.response?.status === 404) {
                useUserStore.getState().setAdminStatus(false);
            }
        }
    }, [router]);

    // 1. Первоначальная проверка при монтировании
    useEffect(() => {
        checkAdminStatus();
    }, [checkAdminStatus]);

    // 2. Периодическая проверка каждые 30 секунд (только для админов)
    useEffect(() => {
        if (!isAdmin) return;

        const interval = setInterval(() => {
            checkAdminStatus();
        }, 30000); // 30 секунд

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

    // 5. Проверка при активности пользователя (клики, скролл) - debounced
    useEffect(() => {
        if (!isAdmin) return;

        let timeoutId: NodeJS.Timeout;

        const debouncedCheck = () => {
            clearTimeout(timeoutId);
            timeoutId = setTimeout(() => {
                checkAdminStatus();
            }, 2000); // 2 секунды задержки
        };

        const events = ['click', 'scroll', 'keydown'];

        events.forEach(event => {
            document.addEventListener(event, debouncedCheck, { passive: true });
        });

        return () => {
            clearTimeout(timeoutId);
            events.forEach(event => {
                document.removeEventListener(event, debouncedCheck);
            });
        };
    }, [isAdmin, checkAdminStatus]);

    return <>{children}</>;
};

