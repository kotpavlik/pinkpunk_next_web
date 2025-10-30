import { create } from 'zustand';
import { immer } from 'zustand/middleware/immer';
import { useAppStore } from '../app_store/AppStore';
import { AxiosError } from 'axios';
import { CartApi, CartItemUI, CartStats, SyncCartResponse, ValidateCartResponse } from '@/api/CartApi';
import { HandleError } from '@/features/HandleError';


// Используем типы из CartApi
export type CartItem = CartItemUI;
export type { CartStats };

export type CartStateType = {
    cartId: string | null;
    items: CartItem[];
    stats: CartStats | null;
    isActive: boolean;
    lastUpdated: string | null;
    isLoading: boolean;
    error: string | null;
    isSyncing: boolean;
    isValidating: boolean;
    lastSyncResult: SyncCartResponse | null;
    lastValidationResult: ValidateCartResponse | null;

    // Actions
    getCart: (userId: string) => Promise<void>;
    addToCart: (userId: string, productId: string, quantity: number) => Promise<boolean>;
    updateCartItem: (userId: string, productId: string, quantity: number) => Promise<boolean>;
    removeFromCart: (userId: string, productId: string) => Promise<boolean>;
    clearCart: (userId: string) => Promise<boolean>;
    getCartStats: (userId: string) => Promise<void>;
    syncCart: () => Promise<SyncCartResponse | null>;
    validateCart: () => Promise<ValidateCartResponse | null>;
    setError: (error: string | null) => void;
    setLoading: (loading: boolean) => void;
};

export const useCartStore = create<CartStateType>()(
    immer((set) => ({
        cartId: null,
        items: [],
        stats: null,
        isActive: true,
        lastUpdated: null,
        isLoading: false,
        error: null,
        isSyncing: false,
        isValidating: false,
        lastSyncResult: null,
        lastValidationResult: null,

        getCart: async (userId: string) => {
            const { setStatus } = useAppStore.getState();
            try {
                setStatus("loading");
                set((state) => {
                    state.isLoading = true;
                    state.error = null;
                });

                const response = await CartApi.getCart(userId);

                set((state) => {
                    // Используем ВСЕ данные из API - они уже полные!
                    state.cartId = response._id;
                    state.items = response.items.map((item) => ({
                        _id: item._id,
                        product: {
                            _id: item.product._id,
                            productId: item.product.productId,
                            name: item.product.name,
                            price: item.product.price,
                            size: item.product.size,
                            description: item.product.description,
                            stockQuantity: item.product.stockQuantity,
                            photos: item.product.photos,
                            category: item.product.category
                        },
                        quantity: item.quantity,
                        addedAt: item.addedAt
                    }));
                    state.stats = {
                        totalItems: response.totalItems,
                        totalPrice: response.totalPrice
                    };
                    state.isActive = response.isActive;
                    state.lastUpdated = response.lastUpdated;
                    state.isLoading = false;
                });

                setStatus("success");
            } catch (error) {
                const err = error as Error | AxiosError;
                HandleError(err);
                set((state) => {
                    state.error = err.message;
                    state.isLoading = false;
                });
                setStatus("failed");
            }
        },

        addToCart: async (userId: string, productId: string, quantity: number) => {
            const { setStatus } = useAppStore.getState();
            try {
                setStatus("loading");
                set((state) => {
                    state.isLoading = true;
                    state.error = null;
                });

                const response = await CartApi.addToCart(userId, productId, quantity);

                // Проверяем, если это ошибка недостатка товара на складе
                if ('statusCode' in response && response.statusCode === 400) {
                    console.log('⚠️ Недостаточно товара на складе:', response.message);
                    set((state) => {
                        state.isLoading = false;
                        state.error = null; // Не показываем ошибку пользователю
                    });
                    setStatus("failed");
                    return false; // Просто возвращаем false без показа ошибки
                }

                // API возвращает полную корзину, обновляем состояние
                if ('items' in response) {
                    set((state) => {
                        // Используем ВСЕ данные из API - они уже полные!
                        state.cartId = response._id;
                        state.items = response.items.map((item) => ({
                            _id: item._id,
                            product: {
                                _id: item.product._id,
                                productId: item.product.productId,
                                name: item.product.name,
                                price: item.product.price,
                                size: item.product.size,
                                description: item.product.description,
                                stockQuantity: item.product.stockQuantity,
                                photos: item.product.photos,
                                category: item.product.category
                            },
                            quantity: item.quantity,
                            addedAt: item.addedAt
                        }));
                        state.stats = {
                            totalItems: response.totalItems,
                            totalPrice: response.totalPrice
                        };
                        state.isActive = response.isActive;
                        state.lastUpdated = response.lastUpdated;
                        state.isLoading = false;
                    });
                }

                setStatus("success");
                return true;
            } catch (error) {
                const err = error as Error | AxiosError;

                // Для всех остальных ошибок показываем их
                HandleError(err);
                set((state) => {
                    state.error = err.message;
                    state.isLoading = false;
                });
                setStatus("failed");
                return false;
            }
        },

        updateCartItem: async (userId: string, cartItemId: string, quantity: number) => {
            const { setStatus } = useAppStore.getState();
            try {
                setStatus("loading");
                set((state) => {
                    state.isLoading = true;
                    state.error = null;
                });

                const response = await CartApi.updateCartItem(userId, cartItemId, quantity);

                // Проверяем, если это ошибка недостатка товара на складе
                if ('statusCode' in response && response.statusCode === 400) {
                    console.log('⚠️ Недостаточно товара на складе:', response.message);
                    set((state) => {
                        state.isLoading = false;
                        state.error = null; // Не показываем ошибку пользователю
                    });
                    setStatus("failed");
                    return false; // Просто возвращаем false без показа ошибки
                }

                // API возвращает полную корзину, обновляем состояние
                if ('items' in response) {
                    set((state) => {
                        state.cartId = response._id;
                        state.items = response.items.map((item) => ({
                            _id: item._id,
                            product: {
                                _id: item.product._id,
                                productId: item.product.productId,
                                name: item.product.name,
                                price: item.product.price,
                                size: item.product.size,
                                description: item.product.description,
                                stockQuantity: item.product.stockQuantity,
                                photos: item.product.photos,
                                category: item.product.category
                            },
                            quantity: item.quantity,
                            addedAt: item.addedAt
                        }));
                        state.stats = {
                            totalItems: response.totalItems,
                            totalPrice: response.totalPrice
                        };
                        state.isActive = response.isActive;
                        state.lastUpdated = response.lastUpdated;
                        state.isLoading = false;
                    });

                    setStatus("success");
                    return true;
                }

                // Если response не содержит items, это ошибка
                setStatus("failed");
                return false;
            } catch (error) {
                const err = error as Error | AxiosError;
                // Для всех остальных ошибок показываем их
                HandleError(err);
                set((state) => {
                    state.error = err.message;
                    state.isLoading = false;
                });
                setStatus("failed");
                return false;
            }
        },

        removeFromCart: async (userId: string, cartItemId: string) => {
            const { setStatus } = useAppStore.getState();
            try {
                setStatus("loading");
                set((state) => {
                    state.isLoading = true;
                    state.error = null;
                });

                const response = await CartApi.removeFromCart(userId, cartItemId);

                // API возвращает полную корзину, обновляем состояние
                set((state) => {
                    state.cartId = response._id;
                    state.items = response.items.map((item) => ({
                        _id: item._id,
                        product: {
                            _id: item.product._id,
                            productId: item.product.productId,
                            name: item.product.name,
                            price: item.product.price,
                            size: item.product.size,
                            description: item.product.description,
                            stockQuantity: item.product.stockQuantity,
                            photos: item.product.photos,
                            category: item.product.category
                        },
                        quantity: item.quantity,
                        addedAt: item.addedAt
                    }));
                    state.stats = {
                        totalItems: response.totalItems,
                        totalPrice: response.totalPrice
                    };
                    state.isActive = response.isActive;
                    state.lastUpdated = response.lastUpdated;
                    state.isLoading = false;
                });

                setStatus("success");
                return true;
            } catch (error) {
                const err = error as Error | AxiosError;
                HandleError(err);
                set((state) => {
                    state.error = err.message;
                    state.isLoading = false;
                });
                setStatus("failed");
                return false;
            }
        },

        clearCart: async (userId: string) => {
            const { setStatus } = useAppStore.getState();
            try {
                setStatus("loading");
                set((state) => {
                    state.isLoading = true;
                    state.error = null;
                });

                const response = await CartApi.clearCart(userId);

                // API возвращает только сообщение, очищаем корзину вручную
                if (response.message === "Корзина очищена") {
                    set((state) => {
                        state.items = [];
                        state.stats = {
                            totalItems: 0,
                            totalPrice: 0
                        };
                        state.isActive = true;
                        state.lastUpdated = new Date().toISOString();
                        state.isLoading = false;
                    });
                }
                setStatus("success");
                return true;
            } catch (error) {
                const err = error as Error | AxiosError;
                HandleError(err);
                set((state) => {
                    state.error = err.message;
                    state.isLoading = false;
                });
                setStatus("failed");
                return false;
            }
        },

        getCartStats: async (userId: string) => {
            const { setStatus } = useAppStore.getState();
            try {
                setStatus("loading");
                set((state) => {
                    state.isLoading = true;
                    state.error = null;
                });

                const response = await CartApi.getCartStats(userId);

                set((state) => {
                    state.stats = response;
                    state.isLoading = false;
                });

                setStatus("success");
            } catch (error) {
                const err = error as Error | AxiosError;
                HandleError(err);
                set((state) => {
                    state.error = err.message;
                    state.isLoading = false;
                });
                setStatus("failed");
            }
        },

        setError: (error: string | null) => {
            set((state) => {
                state.error = error;
            });
        },

        setLoading: (loading: boolean) => {
            set((state) => {
                state.isLoading = loading;
            });
        },

        // Синхронизация корзины с актуальными данными товаров
        syncCart: async () => {
            const state = useCartStore.getState();
            if (!state.cartId) {
                return null;
            }

            try {
                set((state) => {
                    state.isSyncing = true;
                    state.error = null;
                });

                const syncResponse = await CartApi.syncCart(state.cartId);

                // Обновляем корзину с актуальными данными
                set((state) => {
                    state.items = syncResponse.updatedCart.items.map(item => ({
                        _id: item._id,
                        product: {
                            _id: item.product._id,
                            productId: item.product.productId,
                            name: item.product.name,
                            price: item.product.price,
                            size: item.product.size,
                            description: item.product.description,
                            stockQuantity: item.product.stockQuantity,
                            photos: item.product.photos,
                            category: item.product.category
                        },
                        quantity: item.quantity,
                        addedAt: item.addedAt
                    }));
                    state.stats = {
                        totalItems: syncResponse.updatedCart.totalItems,
                        totalPrice: syncResponse.updatedCart.totalPrice
                    };
                    state.lastUpdated = syncResponse.updatedCart.lastUpdated;
                    state.isSyncing = false;
                    state.lastSyncResult = syncResponse;
                });

                return syncResponse;
            } catch (error) {
                const errorMessage = HandleError(error);
                set((state) => {
                    state.error = errorMessage;
                    state.isSyncing = false;
                });
                return null;
            }
        },

        // Валидация корзины без изменения
        validateCart: async () => {
            const state = useCartStore.getState();
            if (!state.cartId) {
                return null;
            }

            try {
                set((state) => {
                    state.isValidating = true;
                    state.error = null;
                });

                const validationResponse = await CartApi.validateCart(state.cartId);

                set((state) => {
                    state.isValidating = false;
                    state.lastValidationResult = validationResponse;
                });

                return validationResponse;
            } catch (error) {
                const errorMessage = HandleError(error);
                set((state) => {
                    state.error = errorMessage;
                    state.isValidating = false;
                });
                return null;
            }
        }
    }))
);
