'use client'
import { create } from 'zustand';
import { immer } from 'zustand/middleware/immer';
import {
    OrderApi,
    PinkPunkOrder,
    CreateOrderFromCartRequest,
    CreateOrderResponse,
    OrderStatus,
    ShippingAddress,
    PaymentMethod
} from '@/api/OrderApi';
import { HandleError } from '@/features/HandleError';


// ===== Типы состояния =====
interface OrderState {
    // Данные
    orders: PinkPunkOrder[];              // Список заказов пользователя
    currentOrder: PinkPunkOrder | null;   // Текущий просматриваемый заказ
    allOrders: PinkPunkOrder[];           // Все заказы (для админа)

    // Состояния загрузки
    isLoading: boolean;
    isCreating: boolean;
    isUpdating: boolean;

    // Ошибки
    error: string | null;

    // ===== Действия пользователя =====

    // Создание заказа из корзины (единственный способ создания)
    createOrderFromCart: (data: CreateOrderFromCartRequest) => Promise<CreateOrderResponse>;

    // Получить заказы пользователя
    getUserOrders: (userId: string) => Promise<void>;

    // Получить мои заказы
    getMyOrders: (userId: string) => Promise<void>;

    // Получить заказ по ID
    getOrderById: (orderId: string) => Promise<PinkPunkOrder | null>;

    // Получить заказ по номеру
    getOrderByNumber: (orderNumber: string) => Promise<PinkPunkOrder | null>;

    // Отменить заказ
    cancelOrder: (orderId: string) => Promise<boolean>;

    // Обновить статус заказа
    updateOrderStatus: (orderId: string, status: OrderStatus, trackingNumber?: string) => Promise<boolean>;

    // Удалить заказ
    deleteOrder: (orderId: string) => Promise<boolean>;

    // ===== Админские действия =====

    // Получить все заказы
    getAllOrders: () => Promise<void>;

    // Получить заказы по статусу
    getOrdersByStatus: (status: OrderStatus) => Promise<void>;

    // Получить заказы по username
    getOrdersByUsername: (username: string) => Promise<void>;

    // // Обновить статус заказа
    // updateOrderStatus: (orderId: string, status: OrderStatus, trackingNumber?: string) => Promise<boolean>;

    // // Удалить заказ
    // deleteOrder: (orderId: string) => Promise<boolean>;

    // ===== Утилиты =====

    // Очистить текущий заказ
    clearCurrentOrder: () => void;

    // Очистить ошибку
    clearError: () => void;

    // Сбросить состояние
    reset: () => void;
}

const initialState = {
    orders: [],
    currentOrder: null,
    allOrders: [],
    isLoading: false,
    isCreating: false,
    isUpdating: false,
    error: null,
};

export const useOrderStore = create<OrderState>()(
    immer((set) => ({
        ...initialState,

        // ===== Создание заказа из корзины (единственный способ) =====
        createOrderFromCart: async (data: CreateOrderFromCartRequest) => {
            set((state) => {
                state.isCreating = true;
                state.error = null;
            });

            try {
                const order = await OrderApi.createOrderFromCart(data);

                set((state) => {
                    state.isCreating = false;
                    state.orders.unshift(order);
                    state.currentOrder = order;
                });

                return order;
            } catch (error) {
                const errorMessage = HandleError(error);
                set((state) => {
                    state.error = errorMessage;
                    state.isCreating = false;
                });

                // Пробрасываем ошибку дальше
                throw error;
            }
        },

        // ===== Получить заказы пользователя =====
        getUserOrders: async (userId: string) => {
            console.log('🏪 OrderStore.getUserOrders вызван с userId:', userId)
            console.log('🌐 Вызываем OrderApi.getUserOrders(userId)')
            console.log('📡 API запрос: GET /orders/user/' + userId)

            set((state) => {
                state.isLoading = true;
                state.error = null;
            });

            try {
                const orders = await OrderApi.getUserOrders(userId);
                console.log('📦 OrderApi.getUserOrders вернул:', orders)
                console.log('📊 Количество заказов:', orders.length)

                set((state) => {
                    state.orders = orders;
                    state.isLoading = false;
                });
                console.log('✅ Заказы сохранены в store')
            } catch (error) {
                console.error('❌ Ошибка в OrderStore.getUserOrders:', error)
                const errorMessage = HandleError(error);
                set((state) => {
                    state.error = errorMessage;
                    state.isLoading = false;
                });
            }
        },

        // ===== Получить мои заказы =====
        getMyOrders: async (userId: string) => {
            console.log('🏪 OrderStore.getMyOrders вызван с userId:', userId)
            console.log('🌐 Вызываем OrderApi.getMyOrders(userId)')
            console.log('📡 API запрос: GET /orders/my/' + userId)

            set((state) => {
                state.isLoading = true;
                state.error = null;
            });

            try {
                const orders = await OrderApi.getMyOrders(userId);
                console.log('📦 OrderApi.getMyOrders вернул:', orders)
                console.log('📊 Количество заказов:', orders.length)
                console.log('📊 Тип orders:', typeof orders)
                console.log('📊 Array.isArray(orders):', Array.isArray(orders))

                set((state) => {
                    console.log('💾 Сохраняем заказы в store. Старое количество:', state.orders.length)
                    state.orders = orders;
                    state.isLoading = false;
                    console.log('💾 Новое количество заказов в store:', state.orders.length)
                });
                console.log('✅ Заказы сохранены в store')
            } catch (error) {
                console.error('❌ Ошибка в OrderStore.getMyOrders:', error)
                const errorMessage = HandleError(error);
                set((state) => {
                    state.error = errorMessage;
                    state.isLoading = false;
                });
            }
        },

        // ===== Получить заказ по ID =====
        getOrderById: async (orderId: string) => {
            set((state) => {
                state.isLoading = true;
                state.error = null;
            });

            try {
                const order = await OrderApi.getOrder(orderId);

                set((state) => {
                    state.currentOrder = order;
                    state.isLoading = false;
                });

                return order;
            } catch (error) {
                const errorMessage = HandleError(error);
                set((state) => {
                    state.error = errorMessage;
                    state.isLoading = false;
                });
                return null;
            }
        },

        // ===== Получить заказ по номеру =====
        getOrderByNumber: async (orderNumber: string) => {
            set((state) => {
                state.isLoading = true;
                state.error = null;
            });

            try {
                const order = await OrderApi.getOrderByNumber(orderNumber);

                set((state) => {
                    state.currentOrder = order;
                    state.isLoading = false;
                });

                return order;
            } catch (error) {
                const errorMessage = HandleError(error);
                set((state) => {
                    state.error = errorMessage;
                    state.isLoading = false;
                });
                return null;
            }
        },

        // ===== Отменить заказ =====
        cancelOrder: async (orderId: string) => {
            set((state) => {
                state.isUpdating = true;
                state.error = null;
            });

            try {
                const updatedOrder = await OrderApi.cancelOrder(orderId);

                set((state) => {
                    // Обновляем в списке заказов
                    const index = state.orders.findIndex((o: PinkPunkOrder) => o._id === orderId);
                    if (index !== -1) {
                        state.orders[index] = updatedOrder;
                    }

                    // Обновляем текущий заказ
                    if (state.currentOrder?._id === orderId) {
                        state.currentOrder = updatedOrder;
                    }

                    state.isUpdating = false;
                });

                return true;
            } catch (error) {
                const errorMessage = HandleError(error);
                set((state) => {
                    state.error = errorMessage;
                    state.isUpdating = false;
                });
                return false;
            }
        },

        // ===== АДМИНСКИЕ МЕТОДЫ =====

        // Получить все заказы
        getAllOrders: async () => {
            set((state) => {
                state.isLoading = true;
                state.error = null;
            });

            try {
                const orders = await OrderApi.getAllOrders();

                set((state) => {
                    state.allOrders = orders;
                    state.isLoading = false;
                });
            } catch (error) {
                const errorMessage = HandleError(error);
                set((state) => {
                    state.error = errorMessage;
                    state.isLoading = false;
                });
            }
        },

        // Получить заказы по статусу
        getOrdersByStatus: async (status: OrderStatus) => {
            set((state) => {
                state.isLoading = true;
                state.error = null;
            });

            try {
                const orders = await OrderApi.getOrdersByStatus(status);

                set((state) => {
                    state.allOrders = orders;
                    state.isLoading = false;
                });
            } catch (error) {
                const errorMessage = HandleError(error);
                set((state) => {
                    state.error = errorMessage;
                    state.isLoading = false;
                });
            }
        },

        // Получить заказы по username
        getOrdersByUsername: async (username: string) => {
            set((state) => {
                state.isLoading = true;
                state.error = null;
            });

            try {
                const orders = await OrderApi.getOrdersByUsername(username);

                set((state) => {
                    state.allOrders = orders;
                    state.isLoading = false;
                });
            } catch (error) {
                const errorMessage = HandleError(error);
                set((state) => {
                    state.error = errorMessage;
                    state.isLoading = false;
                });
            }
        },

        // Обновить статус заказа
        updateOrderStatus: async (orderId: string, status: OrderStatus, trackingNumber?: string) => {
            set((state) => {
                state.isUpdating = true;
                state.error = null;
            });

            try {
                const updatedOrder = await OrderApi.updateOrderStatus({
                    orderId,
                    status,
                    trackingNumber
                });

                set((state) => {
                    // Обновляем в orders
                    const userIndex = state.orders.findIndex(o => o._id === orderId);
                    if (userIndex !== -1) {
                        state.orders[userIndex] = updatedOrder;
                    }

                    // Обновляем текущий заказ
                    if (state.currentOrder?._id === orderId) {
                        state.currentOrder = updatedOrder;
                    }

                    state.isUpdating = false;
                });

                return true;
            } catch (error) {
                const errorMessage = HandleError(error);
                set((state) => {
                    state.error = errorMessage;
                    state.isUpdating = false;
                });
                return false;
            }
        },

        // Удалить заказ
        deleteOrder: async (orderId: string) => {
            set((state) => {
                state.isUpdating = true;
                state.error = null;
            });

            try {
                await OrderApi.deleteOrder(orderId);

                set((state) => {
                    // Удаляем из orders
                    state.orders = state.orders.filter(o => o._id !== orderId);

                    // Очищаем текущий заказ если он был удален
                    if (state.currentOrder?._id === orderId) {
                        state.currentOrder = null;
                    }

                    state.isUpdating = false;
                });

                return true;
            } catch (error) {
                const errorMessage = HandleError(error);
                set((state) => {
                    state.error = errorMessage;
                    state.isUpdating = false;
                });
                return false;
            }
        },

        // ===== УТИЛИТЫ =====

        clearCurrentOrder: () => {
            set((state) => {
                state.currentOrder = null;
            });
        },

        clearError: () => {
            set((state) => {
                state.error = null;
            });
        },

        reset: () => {
            set(initialState);
        },
    }))
);

// ===== Экспорт типов =====
export type {
    PinkPunkOrder,
    CreateOrderFromCartRequest,
    OrderStatus,
    ShippingAddress,
    PaymentMethod
};

