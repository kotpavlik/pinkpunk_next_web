import { instance } from './Api';
import { AxiosError } from 'axios';

// Типы для корзины (соответствуют реальному API)
export interface ICartItem {
    _id: string; // ID элемента корзины
    product: {
        _id: string;
        productId: string;
        name: string;
        price: number;
        size?: string;
        description: string;
        stockQuantity: number;
        photos: string[];
        category: string;
        createdAt: string;
        updatedAt: string;
    };
    quantity: number;
    addedAt: string;
}

export interface IPinkPunkCart {
    _id: string;
    accountId?: string;
    /** @deprecated бэкенд после миграции отдаёт accountId */
    userId?: string;
    items: ICartItem[];
    totalItems: number;
    totalPrice: number;
    isActive: boolean;
    lastUpdated: string;
    createdAt: string;
    updatedAt: string;
    __v: number;
}

// Типы для API ответов (используем реальную структуру)
export type CartResponse = IPinkPunkCart;

// Типы для UI (используем реальные данные)
export interface CartItemUI {
    _id: string;
    product: {
        _id: string;
        productId: string;
        name: string;
        price: number;
        size?: string;
        description: string;
        stockQuantity: number;
        photos: string[];
        category: string;
    };
    quantity: number;
    addedAt: string;
}

export interface CartStats {
    totalItems: number;
    totalPrice: number;
}

// Типы для ошибок API
export interface StockError {
    message: string;
    error: string;
    statusCode: number;
}

export interface AddToCartRequest {
    accountId: string;
    productId: string;
    quantity: number;
}

export interface UpdateCartItemRequest {
    accountId: string;
    cartItemId: string;
    quantity: number;
}

export interface RemoveFromCartRequest {
    accountId: string;
    productId: string;
}

// === Типы для синхронизации и валидации корзины ===
export type CartChangeType = 'product_removed' | 'quantity_adjusted' | 'price_updated' | 'product_updated';

export interface CartChange {
    type: CartChangeType;
    cartItemId: string;
    productName: string;
    oldValue?: number;
    newValue?: number;
    message: string;
}

export interface SyncCartResponse {
    updatedCart: IPinkPunkCart;
    changes: CartChange[];
    message: string;
}

export interface ValidateCartResponse {
    isValid: boolean;
    changes: CartChange[];
    message: string;
}

// API функции для корзины
export const CartApi = {
    // Получить корзину пользователя
    async getCart(accountId: string): Promise<CartResponse> {
            const response = await instance.get(`cart/${accountId}`);
            return response.data;
    },

    // Добавить товар в корзину
    async addToCart(accountId: string, productId: string, quantity: number): Promise<CartResponse | StockError> {
        try {
            const response = await instance.post('cart/add', {
                accountId,
                productId,
                quantity
            });
            return response.data;
        } catch (error) {
                 // Если это ошибка недостатка товара, возвращаем её
            if (error instanceof Error && 'response' in error) {
                const axiosError = error as AxiosError;
                if (axiosError.response?.data && typeof axiosError.response.data === 'object' && axiosError.response.data !== null && 'statusCode' in axiosError.response.data && axiosError.response.data.statusCode === 400) {
                    return axiosError.response.data as StockError;
                }
            }
            
            return {
                _id: '',
                accountId,
                items: [],
                totalItems: 0,
                totalPrice: 0,
                isActive: true,
                lastUpdated: new Date().toISOString(),
                createdAt: new Date().toISOString(),
                updatedAt: new Date().toISOString(),
                __v: 0
            };
        }
        
    },

    // Обновить количество товара в корзине
    async updateCartItem(accountId: string, cartItemId: string, quantity: number): Promise<CartResponse | StockError> {
        try {
            const response = await instance.put('cart/update', {
                accountId,
                cartItemId,
                quantity
            });
            return response.data;
        } catch (error) {
            // Если это ошибка недостатка товара, возвращаем её
            if (error instanceof Error && 'response' in error) {
                const axiosError = error as AxiosError;
                if (axiosError.response?.data && typeof axiosError.response.data === 'object' && axiosError.response.data !== null && 'statusCode' in axiosError.response.data && axiosError.response.data.statusCode === 400) {
                    return axiosError.response.data as StockError;
                }
            }
            
            return {
                _id: '',
                accountId,
                items: [],
                totalItems: 0,
                totalPrice: 0,
                isActive: true,
                lastUpdated: new Date().toISOString(),
                createdAt: new Date().toISOString(),
                updatedAt: new Date().toISOString(),
                __v: 0
            };
        }
    },

    // Удалить товар из корзины
    async removeFromCart(accountId: string, cartItemId: string): Promise<CartResponse> {
        try {
            const response = await instance.delete('cart/remove', {
                data: {
                    accountId,
                    cartItemId
                }
            });
            return response.data;
        } catch {
            return {
                _id: '',
                accountId,
                items: [],
                totalItems: 0,
                totalPrice: 0,
                isActive: true,
                lastUpdated: new Date().toISOString(),
                createdAt: new Date().toISOString(),
                updatedAt: new Date().toISOString(),
                __v: 0
            };
        }
    },

    // Очистить корзину
    async clearCart(accountId: string): Promise<{ message: string }> {
        try {
            const response = await instance.delete(`cart/clear/${accountId}`);
            return response.data;
        } catch {
            return {
                message: 'Корзина очищена (mock)'
            };
        }
    },

    // Получить статистику корзины
    async getCartStats(accountId: string): Promise<CartStats> {
            const response = await instance.get(`cart/stats/${accountId}`);
            return response.data;
    },

    // Синхронизировать корзину с актуальными данными товаров
    async syncCart(cartId: string): Promise<SyncCartResponse> {
        try {
            const response = await instance.post(`cart/sync/${cartId}`);
            return response.data;
        } catch (error) {
            throw error;
        }
    },

    // Проверить актуальность корзины без изменения
    async validateCart(cartId: string): Promise<ValidateCartResponse> {
        try {
            const response = await instance.post(`cart/validate/${cartId}`);
            return response.data;
        } catch (error) {
            throw error;
        }
    }
};
