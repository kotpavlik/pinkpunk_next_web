'use client'

import React, { useEffect, useState, useCallback } from 'react';
import { useOrderStore } from '@/zustand/order_store/OrderStore';
import { OrderCard } from '@/components/ui/shared/OrderCard';
import { OrderStatus } from '@/api/OrderApi';

export const AdminWorkWithUserOrders = () => {
    const { allOrders, currentOrder, isLoading, error, getAllOrders, getOrdersByStatus, getOrderByNumber, getOrdersByUsername } = useOrderStore();

    const [hasLoaded, setHasLoaded] = useState(false);
    const [filterStatus, setFilterStatus] = useState<OrderStatus | 'all'>('all');
    const [searchQuery, setSearchQuery] = useState('');
    const [searchType, setSearchType] = useState<'orderNumber' | 'username'>('orderNumber');
    const [isSearchByNumber, setIsSearchByNumber] = useState(false);

    useEffect(() => {
        if (!hasLoaded) {
            getAllOrders();
            setHasLoaded(true);
        }
    }, [hasLoaded, getAllOrders]);

    const handleRefresh = useCallback(() => {
        if (filterStatus === 'all') {
            getAllOrders();
        } else {
            getOrdersByStatus(filterStatus);
        }
    }, [filterStatus, getAllOrders, getOrdersByStatus]);

    const handleFilterChange = useCallback((status: OrderStatus | 'all') => {
        setFilterStatus(status);
        setSearchQuery('');
        setIsSearchByNumber(false);
        if (status === 'all') {
            getAllOrders();
        } else {
            getOrdersByStatus(status);
        }
    }, [getAllOrders, getOrdersByStatus]);

    const handleSearch = useCallback(async () => {
        if (!searchQuery.trim()) {
            setIsSearchByNumber(false);
            if (filterStatus === 'all') {
                getAllOrders();
            } else {
                getOrdersByStatus(filterStatus);
            }
            return;
        }

        if (searchType === 'orderNumber') {
            setIsSearchByNumber(true);
            await getOrderByNumber(searchQuery.trim());
        } else {
            setIsSearchByNumber(false);
            await getOrdersByUsername(searchQuery.trim());
        }

        setSearchQuery('');
    }, [searchQuery, searchType, filterStatus, getAllOrders, getOrdersByStatus, getOrderByNumber, getOrdersByUsername]);

    const handleShowAllOrders = useCallback(() => {
        setSearchQuery('');
        setIsSearchByNumber(false);
        setFilterStatus('all');
        getAllOrders();
    }, [getAllOrders]);

    return (
        <div className="min-h-screen flex flex-col p-4 pb-24">
            <div className=" mx-auto flex flex-col w-full">
                <div className="mb-4 flex-shrink-0">
                    <h1 className="text-[var(--mint-bright)] text-2xl font-durik font-bold mb-2">Управление заказами</h1>
                    <p className="text-white/60 text-sm">
                        Всего заказов: {allOrders.length}
                    </p>
                </div>

                <div className="bg-white/5 backdrop-blur-md border border-white/10 p-4 mb-4 flex-shrink-0">
                    <div className="flex gap-2 mb-2">
                        <button
                            onClick={() => setSearchType('orderNumber')}
                            className={`p-2 transition-colors flex-shrink-0 ${searchType === 'orderNumber'
                                ? 'bg-[var(--mint-bright)] text-black'
                                : 'bg-white/5 text-white/70 hover:text-white'
                                }`}
                            title="Поиск по номеру заказа"
                        >
                            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 20l4-16m2 16l4-16M6 9h14M4 15h14" />
                            </svg>
                        </button>
                        <button
                            onClick={() => setSearchType('username')}
                            className={`p-2 transition-colors flex-shrink-0 ${searchType === 'username'
                                ? 'bg-[var(--mint-bright)] text-black'
                                : 'bg-white/5 text-white/70 hover:text-white'
                                }`}
                            title="Поиск по username"
                        >
                            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                            </svg>
                        </button>
                        <input
                            type="text"
                            value={searchQuery}
                            onChange={(e) => setSearchQuery(e.target.value)}
                            onKeyDown={(e) => e.key === 'Enter' && handleSearch()}
                            placeholder={searchType === 'orderNumber' ? 'Номер заказа...' : 'Username...'}
                            className="flex-1 min-w-0 px-3 py-2 bg-white/5 border border-white/10 text-white placeholder-white/40 focus:outline-none focus:border-[var(--mint-bright)] text-sm"
                        />
                        <button
                            onClick={handleSearch}
                            disabled={isLoading}
                            className="p-2 bg-[var(--pink-punk)] text-white transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex-shrink-0 hover:opacity-90"
                            title="Найти"
                        >
                            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                            </svg>
                        </button>
                    </div>

                    <div className="flex gap-2 flex-wrap">
                        <button
                            onClick={handleShowAllOrders}
                            className="px-3 py-2 bg-[var(--mint-bright)] text-black transition-colors text-sm font-medium flex items-center gap-1 hover:opacity-90"
                            title="Все заказы"
                        >
                            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
                            </svg>
                            Все
                        </button>

                        <button
                            onClick={() => handleFilterChange('pending_confirmation')}
                            className={`p-2 transition-colors ${filterStatus === 'pending_confirmation'
                                ? 'bg-[var(--mint-bright)] text-black'
                                : 'bg-white/5 text-white/70 hover:text-white'
                                }`}
                            title="Ожидают подтверждения"
                        >
                            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                            </svg>
                        </button>

                        <button
                            onClick={() => handleFilterChange('confirmed')}
                            className={`p-2 transition-colors ${filterStatus === 'confirmed'
                                ? 'bg-[var(--mint-bright)] text-black'
                                : 'bg-white/5 text-white/70 hover:text-white'
                                }`}
                            title="Подтверждены"
                        >
                            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                            </svg>
                        </button>

                        <button
                            onClick={() => handleFilterChange('paid')}
                            className={`p-2 transition-colors ${filterStatus === 'paid'
                                ? 'bg-[var(--mint-bright)] text-black'
                                : 'bg-white/5 text-white/70 hover:text-white'
                                }`}
                            title="Оплачены"
                        >
                            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 10h18M7 15h1m4 0h1m-7 4h12a3 3 0 003-3V8a3 3 0 00-3-3H6a3 3 0 00-3 3v8a3 3 0 003 3z" />
                            </svg>
                        </button>

                        <button
                            onClick={() => handleFilterChange('completed')}
                            className={`p-2 transition-colors ${filterStatus === 'completed'
                                ? 'bg-[var(--mint-bright)] text-black'
                                : 'bg-white/5 text-white/70 hover:text-white'
                                }`}
                            title="Завершены"
                        >
                            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                            </svg>
                        </button>

                        <button
                            onClick={() => handleFilterChange('cancelled')}
                            className={`p-2 transition-colors ${filterStatus === 'cancelled'
                                ? 'bg-[var(--pink-punk)] text-white'
                                : 'bg-white/5 text-white/70 hover:text-white'
                                }`}
                            title="Отменены"
                        >
                            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                            </svg>
                        </button>

                        <button
                            onClick={handleRefresh}
                            disabled={isLoading}
                            className="p-2 bg-white/5 text-white/70 hover:text-white transition-colors disabled:opacity-50 disabled:cursor-not-allowed ml-auto border border-white/10"
                            title="Обновить"
                        >
                            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                            </svg>
                        </button>
                    </div>
                </div>

                {isLoading && (
                    <div className="flex justify-center items-center py-8">
                        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-[var(--mint-bright)]"></div>
                    </div>
                )}

                {error && !isLoading && (
                    <div className="bg-[var(--pink-punk)]/10 border border-[var(--pink-punk)] p-4 text-[var(--pink-punk)]">
                        <p className="font-semibold">Ошибка загрузки заказов</p>
                        <p className="text-sm">{error}</p>
                    </div>
                )}

                {!isLoading && !error && (
                    <div className="flex-1 min-h-0 flex flex-col">
                        {isSearchByNumber && currentOrder && (
                            <div className="flex-1 overflow-y-auto scrollbar-thin scrollbar-thumb-[var(--pink-punk)] scrollbar-track-white/5">
                                <OrderCard
                                    order={currentOrder}
                                    onDeleted={() => {
                                        setIsSearchByNumber(false);
                                        setFilterStatus('all');
                                        getAllOrders();
                                    }}
                                />
                            </div>
                        )}

                        {isSearchByNumber && !currentOrder && (
                            <div className="flex-1 flex items-center justify-center">
                                <div className="text-center py-8 bg-white/5 backdrop-blur-md border border-white/10">
                                    <p className="text-white/60 text-lg mb-2">🔍</p>
                                    <p className="text-white/60">
                                        Заказ с номером &quot;{searchQuery}&quot; не найден
                                    </p>
                                </div>
                            </div>
                        )}

                        {!isSearchByNumber && allOrders.length > 0 && (
                            <div
                                className="flex-1 overflow-y-auto  scrollbar-thin scrollbar-thumb-[var(--pink-punk)] scrollbar-track-white/5"
                                style={{ WebkitOverflowScrolling: 'touch' }}
                            >
                                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                                    {allOrders.map((order) => (
                                        <OrderCard
                                            key={order._id}
                                            order={order}
                                            onDeleted={handleRefresh}
                                        />
                                    ))}
                                </div>
                            </div>
                        )}

                        {!isSearchByNumber && allOrders.length === 0 && hasLoaded && (
                            <div className="flex-1 flex items-center justify-center">
                                <div className="text-center py-8 bg-white/5 backdrop-blur-md border border-white/10">
                                    <p className="text-white/60 text-lg mb-2">📦</p>
                                    <p className="text-white/60">
                                        {filterStatus === 'all'
                                            ? 'Заказов пока нет'
                                            : `Нет заказов со статусом "${filterStatus}"`
                                        }
                                    </p>
                                </div>
                            </div>
                        )}
                    </div>
                )}
            </div>
        </div>
    );
};

