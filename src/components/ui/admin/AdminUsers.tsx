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
                    <div className="text-xl font-bold text-[var(--mint-bright)]">
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
                                <div className="flex-1">
                                    <div className="flex items-center gap-2 mb-2">
                                        {user.photo_url && (
                                            <img
                                                src={user.photo_url}
                                                alt={user.username || 'User'}
                                                className="w-10 h-10 rounded-full"
                                            />
                                        )}
                                        <div>
                                            <div className="font-semibold text-white flex items-center gap-2">
                                                {user.firstName} {user.lastName}
                                                {user.isAdmin && (
                                                    <span className="text-xs px-2 py-0.5 bg-[var(--pink-punk)] text-white rounded">ADMIN</span>
                                                )}
                                                {user.isPremium && (
                                                    <span className="text-xs px-2 py-0.5 bg-[var(--mint-bright)] text-black rounded">PREMIUM</span>
                                                )}
                                            </div>
                                            <div className="text-sm text-white/60">@{user.username || 'без username'}</div>
                                        </div>
                                    </div>
                                    <div className="grid grid-cols-1 md:grid-cols-2 gap-2 text-sm">
                                        <div className="text-white/70">
                                            <span className="text-white/50">ID:</span> {user.userId}
                                        </div>
                                        {user.userPhoneNumber && (
                                            <div className="text-white/70">
                                                <span className="text-white/50">Телефон:</span> {user.userPhoneNumber}
                                            </div>
                                        )}
                                        {user.totalOrders !== undefined && (
                                            <div className="text-white/70">
                                                <span className="text-white/50">Покупок:</span> <span className="text-[var(--mint-bright)] font-semibold">{user.totalOrders}</span>
                                            </div>
                                        )}
                                        {user.totalSpent !== undefined && (
                                            <div className="text-white/70">
                                                <span className="text-white/50">Потрачено:</span> <span className="text-[var(--mint-bright)] font-semibold">{user.totalSpent.toFixed(2)} BYN</span>
                                            </div>
                                        )}
                                        {user.lastActivity && (
                                            <div className="text-white/70">
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
                                        className="w-20 h-20 rounded-full"
                                    />
                                )}
                                <div className="flex-1">
                                    <h2 className="text-2xl font-bold text-white mb-2">
                                        {selectedUser.firstName} {selectedUser.lastName}
                                    </h2>
                                    <div className="flex gap-2 mb-2">
                                        {selectedUser.isAdmin && (
                                            <span className="px-3 py-1 bg-[var(--pink-punk)] text-white text-sm rounded">ADMIN</span>
                                        )}
                                        {selectedUser.isPremium && (
                                            <span className="px-3 py-1 bg-[var(--mint-bright)] text-black text-sm rounded">PREMIUM</span>
                                        )}
                                        {selectedUser.owner && (
                                            <span className="px-3 py-1 bg-gradient-to-r from-[var(--pink-punk)] to-[var(--mint-bright)] text-white text-sm rounded">OWNER</span>
                                        )}
                                    </div>
                                    <div className="text-white/70">@{selectedUser.username || 'без username'}</div>
                                </div>
                            </div>

                            {/* Детали */}
                            <div className="bg-white/10 backdrop-blur-sm border border-white/20 p-4 space-y-3">
                                <h3 className="text-lg font-bold text-[var(--mint-bright)] mb-3">Детали</h3>
                                
                                {/* ID с кнопкой копирования */}
                                <div className="flex items-center justify-between">
                                    <span className="text-white/50">MongoDB ID:</span>
                                    <div className="flex items-center gap-2">
                                        <span className="text-white font-mono text-sm">{selectedUser._id}</span>
                                        <button
                                            onClick={() => copyToClipboard(selectedUser._id || '', 'mongodb_id')}
                                            className="p-1 hover:bg-white/10 rounded transition-colors"
                                            title="Копировать"
                                        >
                                            {showCopied === 'mongodb_id' ? (
                                                <span className="text-[var(--mint-bright)] text-xs">✓</span>
                                            ) : (
                                                <svg className="w-4 h-4 text-white/50" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z" />
                                                </svg>
                                            )}
                                        </button>
                                    </div>
                                </div>

                                <div className="flex items-center justify-between">
                                    <span className="text-white/50">Telegram ID:</span>
                                    <div className="flex items-center gap-2">
                                        <span className="text-white">{selectedUser.userId}</span>
                                        <button
                                            onClick={() => copyToClipboard(selectedUser.userId?.toString() || '', 'telegram_id')}
                                            className="p-1 hover:bg-white/10 rounded transition-colors"
                                            title="Копировать"
                                        >
                                            {showCopied === 'telegram_id' ? (
                                                <span className="text-[var(--mint-bright)] text-xs">✓</span>
                                            ) : (
                                                <svg className="w-4 h-4 text-white/50" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z" />
                                                </svg>
                                            )}
                                        </button>
                                    </div>
                                </div>

                                {selectedUser.languageCode && (
                                    <div className="flex items-center justify-between">
                                        <span className="text-white/50">Язык:</span>
                                        <span className="text-white">{selectedUser.languageCode}</span>
                                    </div>
                                )}

                                {selectedUser.userPhoneNumber && (
                                    <div className="flex items-center justify-between">
                                        <span className="text-white/50">Телефон:</span>
                                        <div className="flex items-center gap-2">
                                            <span className="text-white">{selectedUser.userPhoneNumber}</span>
                                            <button
                                                onClick={() => copyToClipboard(selectedUser.userPhoneNumber || '', 'phone')}
                                                className="p-1 hover:bg-white/10 rounded transition-colors"
                                                title="Копировать"
                                            >
                                                {showCopied === 'phone' ? (
                                                    <span className="text-[var(--mint-bright)] text-xs">✓</span>
                                                ) : (
                                                    <svg className="w-4 h-4 text-white/50" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z" />
                                                    </svg>
                                                )}
                                            </button>
                                        </div>
                                    </div>
                                )}

                                {selectedUser.lastActivity && (
                                    <div className="flex items-center justify-between">
                                        <span className="text-white/50">Последняя активность:</span>
                                        <span className="text-white">{formatDate(selectedUser.lastActivity)}</span>
                                    </div>
                                )}

                                {selectedUser.hasStartedBot !== undefined && (
                                    <div className="flex items-center justify-between">
                                        <span className="text-white/50">Запустил бота:</span>
                                        <span className={selectedUser.hasStartedBot ? 'text-[var(--mint-bright)]' : 'text-white/50'}>
                                            {selectedUser.hasStartedBot ? 'Да' : 'Нет'}
                                        </span>
                                    </div>
                                )}
                            </div>

                            {/* Статистика покупок */}
                            {(selectedUser.totalOrders !== undefined || selectedUser.totalSpent !== undefined) && (
                                <div className="bg-white/10 backdrop-blur-sm border border-white/20 p-4 space-y-3">
                                    <h3 className="text-lg font-bold text-[var(--mint-bright)] mb-3">Статистика покупок</h3>
                                    
                                    {selectedUser.totalOrders !== undefined && (
                                        <div className="flex items-center justify-between">
                                            <span className="text-white/50">Количество заказов:</span>
                                            <span className="text-white text-2xl font-bold">{selectedUser.totalOrders}</span>
                                        </div>
                                    )}

                                    {selectedUser.totalSpent !== undefined && (
                                        <div className="flex items-center justify-between">
                                            <span className="text-white/50">Общая сумма покупок:</span>
                                            <span className="text-[var(--mint-bright)] text-2xl font-bold">
                                                {selectedUser.totalSpent.toFixed(2)} BYN
                                            </span>
                                        </div>
                                    )}

                                    {selectedUser.totalOrders !== undefined && selectedUser.totalOrders > 0 && selectedUser.totalSpent !== undefined && (
                                        <div className="flex items-center justify-between pt-2 border-t border-white/20">
                                            <span className="text-white/50">Средний чек:</span>
                                            <span className="text-white font-semibold">
                                                {(selectedUser.totalSpent / selectedUser.totalOrders).toFixed(2)} BYN
                                            </span>
                                        </div>
                                    )}
                                </div>
                            )}

                            {/* Адрес доставки */}
                            {selectedUser.shippingAddress && (
                                <div className="bg-white/10 backdrop-blur-sm border border-white/20 p-4">
                                    <h3 className="text-lg font-bold text-[var(--mint-bright)] mb-3">Адрес доставки</h3>
                                    <div className="space-y-2 text-white/70">
                                        <div><span className="text-white/50">Имя:</span> {selectedUser.shippingAddress.fullName}</div>
                                        <div><span className="text-white/50">Телефон:</span> {selectedUser.shippingAddress.phone}</div>
                                        <div><span className="text-white/50">Адрес:</span> {selectedUser.shippingAddress.address}</div>
                                        <div><span className="text-white/50">Город:</span> {selectedUser.shippingAddress.city}</div>
                                        <div><span className="text-white/50">Индекс:</span> {selectedUser.shippingAddress.postalCode}</div>
                                        <div><span className="text-white/50">Страна:</span> {selectedUser.shippingAddress.country}</div>
                                        {selectedUser.shippingAddress.notes && (
                                            <div><span className="text-white/50">Примечания:</span> {selectedUser.shippingAddress.notes}</div>
                                        )}
                                    </div>
                                </div>
                            )}

                            {/* Рефералы */}
                            {selectedUser.my_referers && selectedUser.my_referers.length > 0 && (
                                <div className="bg-white/10 backdrop-blur-sm border border-white/20 p-4">
                                    <h3 className="text-lg font-bold text-[var(--mint-bright)] mb-3">
                                        Рефералы ({selectedUser.my_referers.length})
                                    </h3>
                                    <div className="space-y-2">
                                        {selectedUser.my_referers.map((referral, index) => (
                                            <div key={index} className="flex items-center gap-2 text-white/70">
                                                <span className="text-white/50">{index + 1}.</span>
                                                <span>{referral.firstName} {referral.lastName}</span>
                                                <span className="text-white/50">@{referral.username}</span>
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

