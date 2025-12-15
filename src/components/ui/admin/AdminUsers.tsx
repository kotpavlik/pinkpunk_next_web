'use client'

import { useEffect, useState } from 'react'
import { UserApi } from '@/api/UserApi'
import { UserType } from '@/zustand/user_store/UserStore'
import { useAppStore } from '@/zustand/app_store/AppStore'

const AdminUsers = () => {
    const [users, setUsers] = useState<UserType[]>([])
    const [selectedUser, setSelectedUser] = useState<UserType | null>(null)
    const [searchTerm, setSearchTerm] = useState('')
    const { status, setStatus } = useAppStore()
    const [showCopied, setShowCopied] = useState<string | null>(null)

    useEffect(() => {
        loadUsers()
    }, [])

    const loadUsers = async () => {
        try {
            setStatus('loading')
            const response = await UserApi.GetAllUsers()
            setUsers(response.data)
            setStatus('success')
        } catch (error) {
            console.error('Ошибка загрузки пользователей:', error)
            setStatus('failed')
        }
    }

    const copyToClipboard = (text: string, field: string) => {
        navigator.clipboard.writeText(text)
        setShowCopied(field)
        setTimeout(() => setShowCopied(null), 2000)
    }

    const formatDate = (date?: string) => {
        if (!date) return 'Нет данных'
        return new Date(date).toLocaleString('ru-RU', {
            year: 'numeric',
            month: '2-digit',
            day: '2-digit',
            hour: '2-digit',
            minute: '2-digit'
        })
    }

    const filteredUsers = users.filter(user => {
        const search = searchTerm.toLowerCase()
        return (
            user.username?.toLowerCase().includes(search) ||
            user.firstName?.toLowerCase().includes(search) ||
            user.lastName?.toLowerCase().includes(search) ||
            user.userId?.toString().includes(search) ||
            user.userPhoneNumber?.toLowerCase().includes(search)
        )
    })

    return (
        <div className="p-4 mt-4 bg-white/5 backdrop-blur-md border border-white/10 text-white">
            <div className="flex items-center justify-between mb-5">
                <h1 className="text-[var(--mint-bright)] text-xl font-bold font-durik">Пользователи</h1>
                <button
                    onClick={loadUsers}
                    className="relative inline-flex items-center justify-center px-4 py-2 bg-white/10 backdrop-blur-sm border border-white/20 text-white hover:bg-white/15 transition-all duration-200"
                    disabled={status === 'loading'}
                >
                    <svg className={`w-5 h-5 mr-2 ${status === 'loading' ? 'animate-spin' : ''}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                    </svg>
                    Обновить
                </button>
            </div>

            {/* Поиск */}
            <div className="mb-4">
                <input
                    type="text"
                    placeholder="Поиск по имени, username, ID или телефону..."
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    className="w-full bg-white/10 backdrop-blur-sm border border-white/20 p-3 text-white placeholder-white/50 focus:outline-none focus:border-[var(--mint-bright)] transition-all"
                />
            </div>

            {/* Статистика */}
            <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-3 mb-5">
                <div className="bg-white/10 backdrop-blur-sm border border-white/20 p-3">
                    <div className="text-xs text-white/60 mb-1">Всего пользователей</div>
                    <div className="text-2xl font-bold text-[var(--mint-bright)]">{users.length}</div>
                </div>
                <div className="bg-white/10 backdrop-blur-sm border border-white/20 p-3">
                    <div className="text-xs text-white/60 mb-1">Админы</div>
                    <div className="text-2xl font-bold text-[var(--pink-punk)]">{users.filter(u => u.isAdmin).length}</div>
                </div>
                <div className="bg-white/10 backdrop-blur-sm border border-white/20 p-3">
                    <div className="text-xs text-white/60 mb-1">Premium</div>
                    <div className="text-2xl font-bold text-[var(--mint-bright)]">{users.filter(u => u.isPremium).length}</div>
                </div>
                <div className="bg-white/10 backdrop-blur-sm border border-white/20 p-3">
                    <div className="text-xs text-white/60 mb-1">С телефоном</div>
                    <div className="text-2xl font-bold text-white">{users.filter(u => u.userPhoneNumber).length}</div>
                </div>
                <div className="bg-white/10 backdrop-blur-sm border border-white/20 p-3">
                    <div className="text-xs text-white/60 mb-1">Всего заказов</div>
                    <div className="text-2xl font-bold text-[var(--mint-bright)]">
                        {users.reduce((sum, u) => sum + (u.totalOrders || 0), 0)}
                    </div>
                </div>
                <div className="bg-white/10 backdrop-blur-sm border border-white/20 p-3">
                    <div className="text-xs text-white/60 mb-1">Общий доход</div>
                    <div className="text-lg md:text-xl font-bold text-[var(--mint-bright)] break-words">
                        {users.reduce((sum, u) => sum + (u.totalSpent || 0), 0).toFixed(2)} BYN
                    </div>
                </div>
            </div>

            {/* Список пользователей */}
            <div className="space-y-2 max-h-[600px] overflow-y-auto">
                {status === 'loading' ? (
                    <div className="text-center py-10 text-white/60">Загрузка пользователей...</div>
                ) : filteredUsers.length === 0 ? (
                    <div className="text-center py-10 text-white/60">
                        {searchTerm ? 'Пользователи не найдены' : 'Нет пользователей'}
                    </div>
                ) : (
                    filteredUsers.map(user => (
                        <div
                            key={user._id}
                            className="bg-white/10 backdrop-blur-sm border border-white/20 p-4 hover:border-[var(--mint-bright)] transition-all duration-200 cursor-pointer"
                            onClick={() => setSelectedUser(user)}
                        >
                            <div className="flex items-start justify-between gap-4">
                                <div className="flex-1 min-w-0">
                                    <div className="flex items-center gap-2 mb-2">
                                        {user.photo_url && (
                                            <img
                                                src={user.photo_url}
                                                alt={user.username || 'User'}
                                                className="w-10 h-10 rounded-full flex-shrink-0"
                                            />
                                        )}
                                        <div className="min-w-0 flex-1">
                                            <div className="font-semibold text-white flex items-center gap-2 flex-wrap">
                                                <span className="break-words">{user.firstName} {user.lastName}</span>
                                                {user.isAdmin && (
                                                    <span className="text-xs px-2 py-0.5 bg-[var(--pink-punk)] text-white rounded whitespace-nowrap">ADMIN</span>
                                                )}
                                                {user.isPremium && (
                                                    <span className="text-xs px-2 py-0.5 bg-[var(--mint-bright)] text-black rounded whitespace-nowrap">PREMIUM</span>
                                                )}
                                            </div>
                                            <div className="text-sm text-white/60 truncate">@{user.username || 'без username'}</div>
                                        </div>
                                    </div>
                                    <div className="grid grid-cols-1 md:grid-cols-2 gap-2 text-sm">
                                        <div className="text-white/70 break-words">
                                            <span className="text-white/50">ID:</span> {user.userId}
                                        </div>
                                        {user.userPhoneNumber && (
                                            <div className="text-white/70 break-words">
                                                <span className="text-white/50">Телефон:</span> {user.userPhoneNumber}
                                            </div>
                                        )}
                                        {user.totalOrders !== undefined && (
                                            <div className="text-white/70">
                                                <span className="text-white/50">Покупок:</span> <span className="text-[var(--mint-bright)] font-semibold">{user.totalOrders}</span>
                                            </div>
                                        )}
                                        {user.totalSpent !== undefined && (
                                            <div className="text-white/70 break-words">
                                                <span className="text-white/50">Потрачено:</span> <span className="text-[var(--mint-bright)] font-semibold">{user.totalSpent.toFixed(2)} BYN</span>
                                            </div>
                                        )}
                                        {user.lastActivity && (
                                            <div className="text-white/70 break-words">
                                                <span className="text-white/50">Последняя активность:</span> {formatDate(user.lastActivity)}
                                            </div>
                                        )}
                                    </div>
                                </div>
                                <button
                                    onClick={(e) => {
                                        e.stopPropagation()
                                        setSelectedUser(user)
                                    }}
                                    className="text-[var(--mint-bright)] hover:text-[var(--mint-bright)]/70 transition-colors"
                                >
                                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                                    </svg>
                                </button>
                            </div>
                        </div>
                    ))
                )}
            </div>

            {/* Модальное окно с деталями пользователя */}
            {selectedUser && (
                <div
                    className="fixed inset-0 z-[10000] flex items-center justify-center bg-black/60 backdrop-blur-md p-4"
                    onClick={() => setSelectedUser(null)}
                >
                    <div
                        className="relative w-full max-w-2xl bg-white/5 backdrop-blur-md border border-white/10 rounded-lg overflow-hidden max-h-[90vh] overflow-y-auto"
                        onClick={(e) => e.stopPropagation()}
                    >
                        <div className="sticky top-0 z-10 flex items-center justify-between p-4 border-b border-white/10 bg-white/5 backdrop-blur-md">
                            <h1 className="text-[var(--mint-bright)] text-xl font-bold font-durik">
                                Информация о пользователе
                            </h1>
                            <button
                                onClick={() => setSelectedUser(null)}
                                className="w-8 h-8 rounded-full flex items-center justify-center bg-white/10 hover:bg-white/20 backdrop-blur-sm border border-white/20 transition-colors"
                                aria-label="Закрыть"
                            >
                                <svg className="w-5 h-5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                                </svg>
                            </button>
                        </div>

                        <div className="p-6 space-y-4">
                            {/* Основная информация */}
                            <div className="flex items-start gap-4">
                                {selectedUser.photo_url && (
                                    <img
                                        src={selectedUser.photo_url}
                                        alt={selectedUser.username || 'User'}
                                        className="w-20 h-20 rounded-full flex-shrink-0"
                                    />
                                )}
                                <div className="flex-1 min-w-0">
                                    <h2 className="text-xl md:text-2xl font-bold text-white mb-2 break-words">
                                        {selectedUser.firstName} {selectedUser.lastName}
                                    </h2>
                                    <div className="flex gap-2 mb-2 flex-wrap">
                                        {selectedUser.isAdmin && (
                                            <span className="px-3 py-1 bg-[var(--pink-punk)] text-white text-sm rounded whitespace-nowrap">ADMIN</span>
                                        )}
                                        {selectedUser.isPremium && (
                                            <span className="px-3 py-1 bg-[var(--mint-bright)] text-black text-sm rounded whitespace-nowrap">PREMIUM</span>
                                        )}
                                        {selectedUser.owner && (
                                            <span className="px-3 py-1 bg-[var(--pink-punk)] text-white text-sm rounded whitespace-nowrap">OWNER</span>
                                        )}
                                    </div>
                                    <div className="text-white/70 truncate">@{selectedUser.username || 'без username'}</div>
                                </div>
                            </div>

                            {/* Детали */}
                            <div className="bg-white/10 backdrop-blur-sm border border-white/20 p-4">
                                <h3 className="text-lg font-bold text-[var(--mint-bright)] mb-4 flex items-center gap-2">
                                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                                    </svg>
                                    Детали
                                </h3>
                                
                                <div className="space-y-3">
                                    {/* MongoDB ID */}
                                    <div className="group bg-white/5 hover:bg-white/10 p-3 border border-white/10 hover:border-[var(--mint-bright)]/50 transition-all duration-200">
                                        <div className="flex items-center gap-2 mb-2">
                                            <svg className="w-4 h-4 text-[var(--mint-bright)]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 7h.01M7 3h5c.512 0 1.024.195 1.414.586l7 7a2 2 0 010 2.828l-7 7a2 2 0 01-2.828 0l-7-7A1.994 1.994 0 013 12V7a4 4 0 014-4z" />
                                            </svg>
                                            <span className="text-xs text-white/50 font-semibold uppercase tracking-wider">MongoDB ID</span>
                                        </div>
                                        <div className="flex items-start justify-between gap-3">
                                            <code className="text-sm text-white font-mono break-all flex-1">{selectedUser._id}</code>
                                            <button
                                                onClick={() => copyToClipboard(selectedUser._id || '', 'mongodb_id')}
                                                className="p-2 hover:bg-white/10 rounded-lg transition-all duration-200 flex-shrink-0 group-hover:scale-110"
                                                title="Копировать"
                                            >
                                                {showCopied === 'mongodb_id' ? (
                                                    <svg className="w-5 h-5 text-[var(--mint-bright)]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                                                    </svg>
                                                ) : (
                                                    <svg className="w-5 h-5 text-white/70" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z" />
                                                    </svg>
                                                )}
                                            </button>
                                        </div>
                                    </div>

                                    {/* Telegram ID */}
                                    <div className="group bg-white/5 hover:bg-white/10 p-3 border border-white/10 hover:border-[var(--mint-bright)]/50 transition-all duration-200">
                                        <div className="flex items-center gap-2 mb-2">
                                            <svg className="w-4 h-4 text-[var(--mint-bright)]" fill="currentColor" viewBox="0 0 24 24">
                                                <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm4.64 6.8c-.15 1.58-.8 5.42-1.13 7.19-.14.75-.42 1-.68 1.03-.58.05-1.02-.38-1.58-.75-.88-.58-1.38-.94-2.23-1.5-.99-.65-.35-1.01.22-1.59.15-.15 2.71-2.48 2.76-2.69a.2.2 0 00-.05-.18c-.06-.05-.14-.03-.21-.02-.09.02-1.49.95-4.22 2.79-.4.27-.76.41-1.08.4-.36-.01-1.04-.2-1.55-.37-.63-.2-1.12-.31-1.08-.66.02-.18.27-.36.74-.55 2.92-1.27 4.86-2.11 5.83-2.51 2.78-1.16 3.35-1.36 3.73-1.36.08 0 .27.02.39.12.1.08.13.19.14.27-.01.06.01.24 0 .38z"/>
                                            </svg>
                                            <span className="text-xs text-white/50 font-semibold uppercase tracking-wider">Telegram ID</span>
                                        </div>
                                        <div className="flex items-center justify-between gap-3">
                                            <span className="text-lg text-white font-semibold">{selectedUser.userId}</span>
                                            <button
                                                onClick={() => copyToClipboard(selectedUser.userId?.toString() || '', 'telegram_id')}
                                                className="p-2 hover:bg-white/10 rounded-lg transition-all duration-200 flex-shrink-0 group-hover:scale-110"
                                                title="Копировать"
                                            >
                                                {showCopied === 'telegram_id' ? (
                                                    <svg className="w-5 h-5 text-[var(--mint-bright)]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                                                    </svg>
                                                ) : (
                                                    <svg className="w-5 h-5 text-white/70" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z" />
                                                    </svg>
                                                )}
                                            </button>
                                        </div>
                                    </div>

                                    {/* Язык */}
                                    {selectedUser.languageCode && (
                                        <div className="bg-white/5 p-3 border border-white/10">
                                            <div className="flex items-center gap-2 mb-2">
                                                <svg className="w-4 h-4 text-[var(--mint-bright)]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 5h12M9 3v2m1.048 9.5A18.022 18.022 0 016.412 9m6.088 9h7M11 21l5-10 5 10M12.751 5C11.783 10.77 8.07 15.61 3 18.129" />
                                                </svg>
                                                <span className="text-xs text-white/50 font-semibold uppercase tracking-wider">Язык</span>
                                            </div>
                                            <span className="text-lg text-white font-semibold uppercase">{selectedUser.languageCode}</span>
                                        </div>
                                    )}

                                    {/* Телефон */}
                                    {selectedUser.userPhoneNumber && (
                                        <div className="group bg-white/5 hover:bg-white/10 p-3 border border-white/10 hover:border-[var(--mint-bright)]/50 transition-all duration-200">
                                            <div className="flex items-center gap-2 mb-2">
                                                <svg className="w-4 h-4 text-[var(--mint-bright)]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 5a2 2 0 012-2h3.28a1 1 0 01.948.684l1.498 4.493a1 1 0 01-.502 1.21l-2.257 1.13a11.042 11.042 0 005.516 5.516l1.13-2.257a1 1 0 011.21-.502l4.493 1.498a1 1 0 01.684.949V19a2 2 0 01-2 2h-1C9.716 21 3 14.284 3 6V5z" />
                                                </svg>
                                                <span className="text-xs text-white/50 font-semibold uppercase tracking-wider">Телефон</span>
                                            </div>
                                            <div className="flex items-center justify-between gap-3">
                                                <a href={`tel:${selectedUser.userPhoneNumber}`} className="text-lg text-white font-semibold hover:text-[var(--mint-bright)] transition-colors">
                                                    {selectedUser.userPhoneNumber}
                                                </a>
                                                <button
                                                    onClick={() => copyToClipboard(selectedUser.userPhoneNumber || '', 'phone')}
                                                    className="p-2 hover:bg-white/10 rounded-lg transition-all duration-200 flex-shrink-0 group-hover:scale-110"
                                                    title="Копировать"
                                                >
                                                    {showCopied === 'phone' ? (
                                                        <svg className="w-5 h-5 text-[var(--mint-bright)]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                                                        </svg>
                                                    ) : (
                                                        <svg className="w-5 h-5 text-white/70" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z" />
                                                        </svg>
                                                    )}
                                                </button>
                                            </div>
                                        </div>
                                    )}

                                    {/* Последняя активность */}
                                    {selectedUser.lastActivity && (
                                        <div className="bg-white/5 p-3 border border-white/10">
                                            <div className="flex items-center gap-2 mb-2">
                                                <svg className="w-4 h-4 text-[var(--mint-bright)]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                                                </svg>
                                                <span className="text-xs text-white/50 font-semibold uppercase tracking-wider">Последняя активность</span>
                                            </div>
                                            <span className="text-base text-white">{formatDate(selectedUser.lastActivity)}</span>
                                        </div>
                                    )}

                                    {/* Статус бота */}
                                    {selectedUser.hasStartedBot !== undefined && (
                                        <div className="bg-white/5 p-3 border border-white/10">
                                            <div className="flex items-center gap-2 mb-2">
                                                <svg className="w-4 h-4 text-[var(--mint-bright)]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9.75 17L9 20l-1 1h8l-1-1-.75-3M3 13h18M5 17h14a2 2 0 002-2V5a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
                                                </svg>
                                                <span className="text-xs text-white/50 font-semibold uppercase tracking-wider">Статус бота</span>
                                            </div>
                                            <div className="flex items-center gap-2">
                                                <div className={`w-2 h-2 rounded-full ${selectedUser.hasStartedBot ? 'bg-[var(--mint-bright)]' : 'bg-white/30'}`}></div>
                                                <span className={`text-base font-semibold ${selectedUser.hasStartedBot ? 'text-[var(--mint-bright)]' : 'text-white/50'}`}>
                                                    {selectedUser.hasStartedBot ? 'Запустил бота' : 'Не запускал бота'}
                                                </span>
                                            </div>
                                        </div>
                                    )}
                                </div>
                            </div>

                            {/* Статистика покупок */}
                            {(selectedUser.totalOrders !== undefined || selectedUser.totalSpent !== undefined) && (
                                <div className="bg-white/10 backdrop-blur-sm border border-white/20 p-4">
                                    <h3 className="text-lg font-bold text-[var(--mint-bright)] mb-4 flex items-center gap-2">
                                        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 11V7a4 4 0 00-8 0v4M5 9h14l1 12H4L5 9z" />
                                        </svg>
                                        Статистика покупок
                                    </h3>
                                    
                                    <div className="space-y-3">
                                        {selectedUser.totalOrders !== undefined && (
                                            <div className="bg-white/5 p-4 border border-white/10 text-center">
                                                <div className="flex items-center justify-center gap-2 mb-2">
                                                    <svg className="w-4 h-4 text-[var(--mint-bright)]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
                                                    </svg>
                                                    <span className="text-xs text-white/50 font-semibold uppercase tracking-wider">Количество заказов</span>
                                                </div>
                                                <div className="text-4xl font-bold text-white">{selectedUser.totalOrders}</div>
                                            </div>
                                        )}

                                        {selectedUser.totalSpent !== undefined && (
                                            <div className="bg-[var(--mint-bright)]/10 p-4 border border-[var(--mint-bright)]/30 text-center">
                                                <div className="flex items-center justify-center gap-2 mb-2">
                                                    <svg className="w-4 h-4 text-[var(--mint-bright)]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                                                    </svg>
                                                    <span className="text-xs text-white/50 font-semibold uppercase tracking-wider">Общая сумма покупок</span>
                                                </div>
                                                <div className="text-3xl font-bold text-[var(--mint-bright)] break-words">
                                                    {selectedUser.totalSpent.toFixed(2)} BYN
                                                </div>
                                            </div>
                                        )}

                                        {selectedUser.totalOrders !== undefined && selectedUser.totalOrders > 0 && selectedUser.totalSpent !== undefined && (
                                            <div className="bg-white/5 p-4 border border-white/10 text-center">
                                                <div className="flex items-center justify-center gap-2 mb-2">
                                                    <svg className="w-4 h-4 text-[var(--mint-bright)]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 7h6m0 10v-3m-3 3h.01M9 17h.01M9 14h.01M12 14h.01M15 11h.01M12 11h.01M9 11h.01M7 21h10a2 2 0 002-2V5a2 2 0 00-2-2H7a2 2 0 00-2 2v14a2 2 0 002 2z" />
                                                    </svg>
                                                    <span className="text-xs text-white/50 font-semibold uppercase tracking-wider">Средний чек</span>
                                                </div>
                                                <div className="text-2xl font-bold text-white">
                                                    {(selectedUser.totalSpent / selectedUser.totalOrders).toFixed(2)} BYN
                                                </div>
                                            </div>
                                        )}
                                    </div>
                                </div>
                            )}

                            {/* Адрес доставки */}
                            {selectedUser.shippingAddress && (
                                <div className="bg-white/10 backdrop-blur-sm border border-white/20 p-4">
                                    <h3 className="text-lg font-bold text-[var(--mint-bright)] mb-4 flex items-center gap-2">
                                        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" />
                                        </svg>
                                        Адрес доставки
                                    </h3>
                                    <div className="space-y-3">
                                        <div className="bg-white/5 p-3 border border-white/10">
                                            <div className="flex items-center gap-2 mb-2">
                                                <svg className="w-4 h-4 text-[var(--mint-bright)]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                                                </svg>
                                                <span className="text-xs text-white/50 font-semibold uppercase tracking-wider">Получатель</span>
                                            </div>
                                            <div className="text-base text-white break-words">{selectedUser.shippingAddress.fullName}</div>
                                        </div>

                                        <div className="bg-white/5 p-3 border border-white/10">
                                            <div className="flex items-center gap-2 mb-2">
                                                <svg className="w-4 h-4 text-[var(--mint-bright)]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 5a2 2 0 012-2h3.28a1 1 0 01.948.684l1.498 4.493a1 1 0 01-.502 1.21l-2.257 1.13a11.042 11.042 0 005.516 5.516l1.13-2.257a1 1 0 011.21-.502l4.493 1.498a1 1 0 01.684.949V19a2 2 0 01-2 2h-1C9.716 21 3 14.284 3 6V5z" />
                                                </svg>
                                                <span className="text-xs text-white/50 font-semibold uppercase tracking-wider">Контактный телефон</span>
                                            </div>
                                            <a href={`tel:${selectedUser.shippingAddress.phone}`} className="text-base text-white hover:text-[var(--mint-bright)] transition-colors break-words">
                                                {selectedUser.shippingAddress.phone}
                                            </a>
                                        </div>

                                        <div className="bg-white/5 p-3 border border-white/10">
                                            <div className="flex items-center gap-2 mb-2">
                                                <svg className="w-4 h-4 text-[var(--mint-bright)]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6" />
                                                </svg>
                                                <span className="text-xs text-white/50 font-semibold uppercase tracking-wider">Адрес</span>
                                            </div>
                                            <div className="text-base text-white break-words">{selectedUser.shippingAddress.address}</div>
                                        </div>

                                        <div className="grid grid-cols-2 gap-3">
                                            <div className="bg-white/5 p-3 border border-white/10">
                                                <div className="flex items-center gap-2 mb-2">
                                                    <svg className="w-4 h-4 text-[var(--mint-bright)]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" />
                                                    </svg>
                                                    <span className="text-xs text-white/50 font-semibold uppercase tracking-wider">Город</span>
                                                </div>
                                                <div className="text-base text-white break-words">{selectedUser.shippingAddress.city}</div>
                                            </div>

                                            <div className="bg-white/5 p-3 border border-white/10">
                                                <div className="flex items-center gap-2 mb-2">
                                                    <svg className="w-4 h-4 text-[var(--mint-bright)]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M20 13V6a2 2 0 00-2-2H6a2 2 0 00-2 2v7m16 0v5a2 2 0 01-2 2H6a2 2 0 01-2-2v-5m16 0h-2.586a1 1 0 00-.707.293l-2.414 2.414a1 1 0 01-.707.293h-3.172a1 1 0 01-.707-.293l-2.414-2.414A1 1 0 006.586 13H4" />
                                                    </svg>
                                                    <span className="text-xs text-white/50 font-semibold uppercase tracking-wider">Индекс</span>
                                                </div>
                                                <div className="text-base text-white break-words">{selectedUser.shippingAddress.postalCode}</div>
                                            </div>
                                        </div>

                                        <div className="bg-white/5 p-3 border border-white/10">
                                            <div className="flex items-center gap-2 mb-2">
                                                <svg className="w-4 h-4 text-[var(--mint-bright)]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3.055 11H5a2 2 0 012 2v1a2 2 0 002 2 2 2 0 012 2v2.945M8 3.935V5.5A2.5 2.5 0 0010.5 8h.5a2 2 0 012 2 2 2 0 104 0 2 2 0 012-2h1.064M15 20.488V18a2 2 0 012-2h3.064M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                                                </svg>
                                                <span className="text-xs text-white/50 font-semibold uppercase tracking-wider">Страна</span>
                                            </div>
                                            <div className="text-base text-white break-words">{selectedUser.shippingAddress.country}</div>
                                        </div>

                                        {selectedUser.shippingAddress.notes && (
                                            <div className="bg-[var(--mint-bright)]/5 p-3 border border-[var(--mint-bright)]/20">
                                                <div className="flex items-center gap-2 mb-2">
                                                    <svg className="w-4 h-4 text-[var(--mint-bright)]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                                                    </svg>
                                                    <span className="text-xs text-white/50 font-semibold uppercase tracking-wider">Примечания</span>
                                                </div>
                                                <div className="text-base text-white/90 break-words italic">{selectedUser.shippingAddress.notes}</div>
                                            </div>
                                        )}
                                    </div>
                                </div>
                            )}

                            {/* Рефералы */}
                            {selectedUser.my_referers && selectedUser.my_referers.length > 0 && (
                                <div className="bg-white/10 backdrop-blur-sm border border-white/20 p-4">
                                    <h3 className="text-lg font-bold text-[var(--mint-bright)] mb-4 flex items-center gap-2">
                                        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" />
                                        </svg>
                                        Рефералы
                                        <span className="ml-auto bg-[var(--mint-bright)] text-black text-sm font-bold px-3 py-1 rounded-full">
                                            {selectedUser.my_referers.length}
                                        </span>
                                    </h3>
                                    <div className="space-y-2">
                                        {selectedUser.my_referers.map((referral, index) => (
                                            <div key={index} className="bg-white/5 hover:bg-white/10 p-3 border border-white/10 hover:border-[var(--mint-bright)]/50 transition-all duration-200">
                                                <div className="flex items-center gap-3">
                                                    <div className="flex-shrink-0 w-8 h-8 bg-[var(--mint-bright)]/20 rounded-full flex items-center justify-center">
                                                        <span className="text-[var(--mint-bright)] font-bold text-sm">{index + 1}</span>
                                                    </div>
                                                    <div className="flex-1 min-w-0">
                                                        <div className="text-white font-semibold break-words">
                                                            {referral.firstName} {referral.lastName}
                                                        </div>
                                                        <div className="text-sm text-white/60 break-words">
                                                            @{referral.username || 'без username'}
                                                        </div>
                                                    </div>
                                                    <svg className="w-5 h-5 text-[var(--mint-bright)] flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                                                    </svg>
                                                </div>
                                            </div>
                                        ))}
                                    </div>
                                </div>
                            )}
                        </div>
                    </div>
                </div>
            )}
        </div>
    )
}

export default AdminUsers

