'use client'

import React, { useState, useEffect } from 'react';
import { useAdminLoginStore } from '@/zustand/admin_login_store/AdminLoginStore';
import { useUserStore } from '@/zustand/user_store/UserStore';
import { SessionInfo, AdminSessionData } from '@/api/AdminApi';
import { tokenManager } from '@/utils/TokenManager';

type ViewMode = 'my-sessions' | 'all-sessions';

export const SessionManager: React.FC = () => {
    const [viewMode, setViewMode] = useState<ViewMode>('my-sessions');
    const [mySessions, setMySessions] = useState<SessionInfo[]>([]);
    const [allAdminSessions, setAllAdminSessions] = useState<AdminSessionData[]>([]);
    const [isLoading, setIsLoading] = useState(false);
    const [showConfirmModal, setShowConfirmModal] = useState(false);
    const [selectedSession, setSelectedSession] = useState<SessionInfo | null>(null);
    const [selectedUserId, setSelectedUserId] = useState<number | null>(null);
    const [errorMessage, setErrorMessage] = useState<string>('');
    const [successMessage, setSuccessMessage] = useState<string>('');

    const { getSessions, revokeSession, logoutAllDevices, getAllAdminSessions, revokeAnySession, revokeAllAdminSessions } = useAdminLoginStore();
    const { user } = useUserStore();

    const currentDeviceId = tokenManager.getDeviceId();

    // Проверяем: owner должен быть админом И иметь флаг owner
    const isOwner = user.isAdmin === true && (user as { owner?: boolean }).owner === true;

    useEffect(() => {
        if (errorMessage) {
            const timer = setTimeout(() => setErrorMessage(''), 5000);
            return () => clearTimeout(timer);
        }
    }, [errorMessage]);

    useEffect(() => {
        if (successMessage) {
            const timer = setTimeout(() => setSuccessMessage(''), 3000);
            return () => clearTimeout(timer);
        }
    }, [successMessage]);

    const loadMySessions = async () => {
        setIsLoading(true);
        setErrorMessage('');
        try {
            const data = await getSessions();
            setMySessions(data);
        } catch (error) {
            const errorMsg = error instanceof Error ? error.message : 'Не удалось загрузить сессии';
            setErrorMessage(`Ошибка загрузки: ${errorMsg}`);
            setMySessions([]);
        } finally {
            setIsLoading(false);
        }
    };

    const loadAllAdminSessions = async () => {
        if (!isOwner) return;
        setIsLoading(true);
        setErrorMessage('');
        try {
            const data = await getAllAdminSessions();
            setAllAdminSessions(data);
        } catch (error) {
            const errorMsg = error instanceof Error ? error.message : 'Не удалось загрузить сессии админов';
            setErrorMessage(`Ошибка загрузки: ${errorMsg}`);
            setAllAdminSessions([]);
        } finally {
            setIsLoading(false);
        }
    };

    useEffect(() => {
        loadMySessions();
        if (isOwner) {
            loadAllAdminSessions();
        }
    }, [isOwner]);

    useEffect(() => {
        if (viewMode === 'my-sessions') {
            loadMySessions();
        } else if (viewMode === 'all-sessions' && isOwner) {
            loadAllAdminSessions();
        }
    }, [viewMode]);

    const handleRevokeClick = (session: SessionInfo, userId?: number) => {
        setSelectedSession(session);
        setSelectedUserId(userId || null);
        setShowConfirmModal(true);
    };

    const handleConfirmRevoke = async () => {
        if (!selectedSession) return;

        let success = false;
        setErrorMessage('');

        try {
            if (viewMode === 'all-sessions' && selectedUserId !== null && isOwner) {
                success = await revokeAnySession(selectedUserId, selectedSession.jti);
                if (success) {
                    setSuccessMessage('✅ Сессия успешно завершена');
                    await loadAllAdminSessions();
                } else {
                    setErrorMessage('❌ Не удалось завершить сессию. Возможно, это сессия другого владельца.');
                }
            } else {
                success = await revokeSession(selectedSession.jti);
                if (success) {
                    setSuccessMessage('✅ Сессия успешно завершена');
                    await loadMySessions();
                    if (selectedSession.deviceId === currentDeviceId) {
                        tokenManager.clearTokens();
                        window.location.href = '/';
                    }
                } else {
                    setErrorMessage('❌ Не удалось завершить сессию');
                }
            }
        } catch (error) {
            const errorMsg = error instanceof Error ? error.message : 'Неизвестная ошибка';
            setErrorMessage(`❌ Ошибка: ${errorMsg}`);
        }

        setShowConfirmModal(false);
        setSelectedSession(null);
        setSelectedUserId(null);
    };

    const handleCancelRevoke = () => {
        setShowConfirmModal(false);
        setSelectedSession(null);
        setSelectedUserId(null);
    };

    const handleLogoutMySessions = async () => {
        if (!confirm('Вы точно хотите завершить все свои сессии? Вы будете разлогинены!')) {
            return;
        }

        setErrorMessage('');
        try {
            await logoutAllDevices();
            setSuccessMessage('✅ Все ваши сессии завершены');
        } catch (error) {
            const errorMsg = error instanceof Error ? error.message : 'Неизвестная ошибка';
            setErrorMessage(`❌ Ошибка завершения сессий: ${errorMsg}`);
        }
    };

    const handleLogoutAllSessions = async () => {
        if (!isOwner) return;
        if (!confirm('⚠️ ВЫ ТОЧНО ХОТИТЕ ЗАВЕРШИТЬ ВСЕ СЕССИИ ВСЕХ АДМИНОВ? Это критическое действие!')) {
            return;
        }

        setErrorMessage('');
        try {
            const result = await revokeAllAdminSessions();
            if (result.affected > 0) {
                setSuccessMessage(`✅ Успешно разлогинено ${result.affected} админов. Владельцы не затронуты.`);
            } else {
                setSuccessMessage('ℹ️ Нет активных сессий админов для завершения');
            }

            if (viewMode === 'all-sessions') {
                await loadAllAdminSessions();
            } else {
                await loadMySessions();
            }
        } catch (error) {
            const errorMsg = error instanceof Error ? error.message : 'Неизвестная ошибка';
            setErrorMessage(`❌ Ошибка завершения всех сессий: ${errorMsg}`);
        }
    };

    const formatDate = (dateString: string) => {
        const date = new Date(dateString);
        return date.toLocaleString('ru-RU', {
            day: '2-digit',
            month: '2-digit',
            year: 'numeric',
            hour: '2-digit',
            minute: '2-digit'
        });
    };

    const getDeviceName = (deviceInfo?: string) => {
        if (!deviceInfo) return 'Неизвестное устройство';
        if (deviceInfo.includes('iPhone')) return '📱 iPhone';
        if (deviceInfo.includes('iPad')) return '📱 iPad';
        if (deviceInfo.includes('Android')) return '📱 Android';
        if (deviceInfo.includes('Macintosh')) return '💻 Mac';
        if (deviceInfo.includes('Windows')) return '💻 Windows';
        if (deviceInfo.includes('Linux')) return '💻 Linux';
        return '🖥️ Устройство';
    };

    if (isLoading) {
        return (
            <div className="p-8 text-center">
                <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-[var(--mint-bright)] mx-auto mb-4"></div>
                <p className="text-white/60">Загрузка сессий...</p>
            </div>
        );
    }

    return (
        <div className="p-6">
            {errorMessage && (
                <div className="fixed inset-0 flex items-center justify-center z-50 pointer-events-none">
                    <div className="pointer-events-auto max-w-md w-full mx-4 p-4 bg-[var(--pink-punk)]/30 backdrop-blur-sm border border-[var(--pink-punk)] shadow-lg flex items-start gap-3 animate-fade-in">
                        <span className="text-[var(--pink-punk)] text-2xl">❌</span>
                        <div className="flex-1">
                            <p className="text-white text-sm font-semibold">{errorMessage}</p>
                        </div>
                        <button
                            onClick={() => setErrorMessage('')}
                            className="text-white/70 hover:text-white transition-colors"
                            aria-label="Закрыть"
                        >
                            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                            </svg>
                        </button>
                    </div>
                </div>
            )}

            {successMessage && (
                <div className="fixed inset-0 flex items-center justify-center z-50 pointer-events-none">
                    <div className="pointer-events-auto max-w-md w-full mx-4 p-4 bg-[var(--mint-bright)]/30 backdrop-blur-sm border border-[var(--mint-bright)] shadow-lg flex items-start gap-3 animate-fade-in">
                        <span className="text-[var(--mint-bright)] text-2xl">✅</span>
                        <div className="flex-1">
                            <p className="text-white text-sm font-semibold">{successMessage}</p>
                        </div>
                        <button
                            onClick={() => setSuccessMessage('')}
                            className="text-white/70 hover:text-white transition-colors"
                            aria-label="Закрыть"
                        >
                            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                            </svg>
                        </button>
                    </div>
                </div>
            )}

            {isOwner && (
                <div className="mb-4 space-y-2">
                    <div className="grid grid-cols-2 gap-2">
                        <button
                            onClick={() => setViewMode('my-sessions')}
                            className={`py-2 px-3 text-sm font-semibold transition-colors ${viewMode === 'my-sessions'
                                ? 'bg-[var(--mint-bright)] text-black'
                                : 'bg-white/5 text-white/70 hover:text-white border border-white/10'
                                }`}
                        >
                            📋 Мои ({mySessions.length})
                        </button>
                        <button
                            onClick={() => setViewMode('all-sessions')}
                            className={`py-2 px-3 text-sm font-semibold transition-colors ${viewMode === 'all-sessions'
                                ? 'bg-[var(--mint-bright)] text-black'
                                : 'bg-white/5 text-white/70 hover:text-white border border-white/10'
                                }`}
                        >
                            👑 Все ({allAdminSessions.reduce((sum, admin) => sum + admin.sessions.length, 0)})
                        </button>
                    </div>

                    <div className="grid grid-cols-2 gap-2">
                        <button
                            onClick={handleLogoutMySessions}
                            disabled={mySessions.length === 0}
                            className="py-2 px-3 text-sm bg-[var(--pink-punk)] text-white font-semibold hover:opacity-90 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                        >
                            🚪 Завершить мои
                        </button>
                        <button
                            onClick={handleLogoutAllSessions}
                            className="py-2 px-3 text-sm bg-[var(--pink-punk)] text-white font-semibold hover:opacity-90 transition-colors"
                        >
                            ⚠️ Завершить ВСЕ
                        </button>
                    </div>
                </div>
            )}

            {!isOwner && (
                <div className="mb-4">
                    <button
                        onClick={handleLogoutMySessions}
                        disabled={mySessions.length === 0}
                        className="w-full py-2 px-3 text-sm bg-[var(--pink-punk)] text-white font-semibold hover:opacity-90 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                        Завершить все сессии
                    </button>
                </div>
            )}

            {viewMode === 'my-sessions' ? (
                !mySessions || mySessions.length === 0 ? (
                    <p className="text-white/60 text-center py-8">
                        Нет активных сессий
                    </p>
                ) : (
                    <div className="space-y-3">
                        {mySessions.map((session) => {
                            const isCurrent = session.deviceId === currentDeviceId;
                            return (
                                <div
                                    key={session.jti}
                                    className={`p-4 border ${isCurrent
                                        ? 'border-[var(--mint-bright)] bg-[var(--mint-bright)]/10'
                                        : 'border-white/10 bg-white/5 backdrop-blur-md'
                                        }`}
                                >
                                    <div className="flex justify-between items-start">
                                        <div className="flex-1">
                                            <div className="flex items-center gap-2 mb-2">
                                                <span className="text-lg text-white">
                                                    {getDeviceName(session.deviceInfo)}
                                                </span>
                                                {isCurrent && (
                                                    <span className="px-2 py-0.5 bg-[var(--mint-bright)] text-black text-xs font-bold">
                                                        Текущая
                                                    </span>
                                                )}
                                            </div>
                                            <div className="text-sm text-white/60 space-y-1">
                                                <div>
                                                    <span className="text-white/40">Открыта:</span>{' '}
                                                    <span className="text-white">{formatDate(session.createdAt)}</span>
                                                </div>
                                                <div>
                                                    <span className="text-white/40">Последняя активность:</span>{' '}
                                                    <span className="text-white">{formatDate(session.lastUsedAt)}</span>
                                                </div>
                                            </div>
                                        </div>
                                        <button
                                            onClick={() => handleRevokeClick(session)}
                                            className="ml-4 p-2 text-[var(--pink-punk)] hover:opacity-80 transition-colors"
                                            title="Закрыть сессию"
                                        >
                                            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                                            </svg>
                                        </button>
                                    </div>
                                </div>
                            );
                        })}
                    </div>
                )
            ) : (
                !allAdminSessions || allAdminSessions.length === 0 ? (
                    <p className="text-white/60 text-center py-8">
                        Нет активных админских сессий
                    </p>
                ) : (
                    <div className="space-y-6">
                        {allAdminSessions.map((admin) => (
                            <div key={admin.userId} className="border border-white/10 p-4 bg-white/5 backdrop-blur-md">
                                <h3 className="text-lg font-bold text-[var(--mint-bright)] mb-3 font-durik">
                                    👤 @{admin.username}
                                    <span className="text-sm text-white/60 ml-2">
                                        (ID: {admin.userId})
                                    </span>
                                    <span className="text-sm text-white/60 ml-2">
                                        — {admin.sessions.length} {admin.sessions.length === 1 ? 'сессия' : 'сессий'}
                                    </span>
                                </h3>
                                <div className="space-y-3">
                                    {admin.sessions.map((session) => {
                                        const isCurrent = session.deviceId === currentDeviceId;
                                        return (
                                            <div
                                                key={session.jti}
                                                className={`p-4 border ${isCurrent
                                                    ? 'border-[var(--mint-bright)] bg-[var(--mint-bright)]/10'
                                                    : 'border-white/10 bg-white/5 backdrop-blur-md'
                                                    }`}
                                            >
                                                <div className="flex justify-between items-start">
                                                    <div className="flex-1">
                                                        <div className="flex items-center gap-2 mb-2">
                                                            <span className="text-lg text-white">
                                                                {getDeviceName(session.deviceInfo)}
                                                            </span>
                                                            {isCurrent && (
                                                                <span className="px-2 py-0.5 bg-[var(--mint-bright)] text-black text-xs font-bold">
                                                                    Текущая
                                                                </span>
                                                            )}
                                                        </div>
                                                        <div className="text-sm text-white/60 space-y-1">
                                                            <div>
                                                                <span className="text-white/40">Открыта:</span>{' '}
                                                                <span className="text-white">{formatDate(session.createdAt)}</span>
                                                            </div>
                                                            <div>
                                                                <span className="text-white/40">Последняя активность:</span>{' '}
                                                                <span className="text-white">{formatDate(session.lastUsedAt)}</span>
                                                            </div>
                                                        </div>
                                                    </div>
                                                    <button
                                                        onClick={() => handleRevokeClick(session, admin.userId)}
                                                        className="ml-4 p-2 text-[var(--pink-punk)] hover:opacity-80 transition-colors"
                                                        title="Закрыть сессию"
                                                    >
                                                        <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                                                        </svg>
                                                    </button>
                                                </div>
                                            </div>
                                        );
                                    })}
                                </div>
                            </div>
                        ))}
                    </div>
                )
            )}

            {showConfirmModal && selectedSession && (
                <div className="fixed inset-0 bg-black/70 flex items-center justify-center z-50 p-4">
                    <div className="bg-white/5 backdrop-blur-md p-6 max-w-md w-full border border-white/10">
                        <h3 className="text-xl font-bold text-[var(--mint-bright)] mb-4 font-durik">
                            Завершить сессию?
                        </h3>
                        <p className="text-white/70 mb-2">
                            Вы точно хотите завершить эту сессию?
                        </p>
                        <div className="bg-white/5 backdrop-blur-md p-3 mb-6 border border-white/10">
                            <div className="text-sm text-white/60 space-y-1">
                                <div>
                                    <span className="text-white/40">Устройство:</span>{' '}
                                    <span className="text-white">{getDeviceName(selectedSession.deviceInfo)}</span>
                                </div>
                                <div>
                                    <span className="text-white/40">Открыта:</span>{' '}
                                    <span className="text-white">{formatDate(selectedSession.createdAt)}</span>
                                </div>
                            </div>
                        </div>
                        {selectedSession.deviceId === currentDeviceId && (
                            <div className="bg-[var(--pink-punk)]/10 border border-[var(--pink-punk)] p-3 mb-4">
                                <p className="text-[var(--pink-punk)] text-sm">
                                    ⚠️ Это ваша текущая сессия! Вы будете разлогинены.
                                </p>
                            </div>
                        )}
                        <div className="flex gap-3">
                            <button
                                onClick={handleCancelRevoke}
                                className="flex-1 py-2 px-4 bg-white/5 text-white/70 hover:text-white transition-colors border border-white/10"
                            >
                                Отмена
                            </button>
                            <button
                                onClick={handleConfirmRevoke}
                                className="flex-1 py-2 px-4 bg-[var(--pink-punk)] text-white font-bold hover:opacity-90 transition-colors"
                            >
                                Завершить
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};

