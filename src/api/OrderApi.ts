// ===== Базовые типы =====
export type OrderStatus = 'pending_confirmation' | 'confirmed' | 'paid' | 'completed' | 'cancelled';
export type PaymentMethod = 'card_online'| 'card_offline' | 'cash' | 'crypto' | 'bank_transfer';

// ===== Адрес доставки =====
export interface ShippingAddress {
    fullName: string;
    phone: string;
    address: string;
    city: string;
    postalCode: string;
    country: string;
    notes?: string;
}

// ===== Элемент заказа (снимок товара из корзины) =====
export interface OrderItem {
    product: {
        _id: string;
        name: string;
        price: number;
        size: string;
        description?: string;
        stockQuantity?: number;
        photos?: string[];
        category?: string;
        productId?: string;
    };
    quantity: number;
    price: number;               // цена на момент заказа
    size: string;
}

// ===== Полная модель заказа =====
export interface PinkPunkOrder {
    _id: string;
    orderNumber: string;
    userId: string;
    cart: string;                // ID корзины (строка)
    items: OrderItem[];          // Товары в заказе (снимок корзины)
    status: OrderStatus;
    userPhoneNumber: string;
    shippingAddress?: ShippingAddress;
    paymentMethod?: PaymentMethod;
    subtotal: number;
    shippingCost?: number;
    totalAmount: number;
    notes?: string;
    trackingNumber?: string;
    createdAt: string;            // ISO
    updatedAt: string;           // ISO
}

// ===== DTO для создания заказа =====

// Создание из корзины (CreateOrderFromCartDto)
export interface CreateOrderFromCartRequest {
    userId: string;
    cartId: string;
    userPhoneNumber: string;
    shippingCost?: number;
    notes?: string;
    shippingAddress?: ShippingAddress;  // опционально, но можно передать
    paymentMethod?: PaymentMethod;      // опционально, но можно передать
}

// Создание с полным адресом (CreateOrderDto) - не используется, есть только from-cart
// export interface CreateOrderRequest {
//     userId: string;
//     shippingAddress: ShippingAddress;
//     paymentMethod: PaymentMethod;
//     shippingCost: number;
//     notes?: string;
// }

// Ответ создания заказа (упрощенный формат)
export type CreateOrderResponse = PinkPunkOrder;

// ===== DTO для обновления статуса =====
export interface UpdateOrderStatusRequest {
    orderId: string;
    status: OrderStatus;
    trackingNumber?: string;
}

export type UpdateOrderStatusResponse = PinkPunkOrder;

// ===== DTO для получения заказов =====
export type GetOrderResponse = PinkPunkOrder;

// Список заказов возвращается как массив, не обёрнутый в { items, total }
export type ListOrdersResponse = PinkPunkOrder[];

// Ответ на удаление
export interface DeleteOrderResponse {
    message: string;
}

// ===== API методы =====
import { instance } from './Api';

export class OrderApi {
    // Создание заказа из корзины (единственный способ создания)
    static async createOrderFromCart(data: CreateOrderFromCartRequest): Promise<CreateOrderResponse> {
        const { data: res } = await instance.post<CreateOrderResponse>(`/orders/from-cart`, data);
        return res;
    }

    // Получение заказа по ID
    static async getOrder(orderId: string): Promise<GetOrderResponse> {
        const { data: res } = await instance.get<GetOrderResponse>(`/orders/${orderId}`);
        return res;
    }

    // Получить заказы пользователя (для пользователя)
    static async getUserOrders(userId: string): Promise<ListOrdersResponse> {
        const { data: res } = await instance.get<ListOrdersResponse>(`/orders/user/${userId}`);
        return res;
    }

    // Обновление статуса заказа
    // static async updateOrderStatus(data: UpdateOrderStatusRequest): Promise<UpdateOrderStatusResponse> {
    //     const { data: res } = await instance.put<UpdateOrderStatusResponse>(
    //         `/orders/${data.orderId}/status`,
    //         { status: data.status, trackingNumber: data.trackingNumber }
    //     );
    //     return res;
    // }

    // Отмена заказа
    static async cancelOrder(orderId: string): Promise<UpdateOrderStatusResponse> {
        const { data: res } = await instance.put<UpdateOrderStatusResponse>(`/orders/${orderId}/cancel`);
        return res;
    }

    // ===== Админские методы (отключено) =====
    // static async getAllOrders(): Promise<ListOrdersResponse> {
    //     const { data: res } = await instance.get<ListOrdersResponse>(`/orders`);
    //     return res;
    // }

    // static async getOrdersByStatus(status: OrderStatus): Promise<ListOrdersResponse> {
    //     const { data: res } = await instance.get<ListOrdersResponse>(`/orders/status/${status}`);
    //     return res;
    // }

    // static async getOrdersByUsername(username: string): Promise<ListOrdersResponse> {
    //     const { data: res } = await instance.get<ListOrdersResponse>(`/orders/admin/search/username`, { params: { username } });
    //     return res;
    // }

    static async getOrderByNumber(orderNumber: string): Promise<GetOrderResponse> {
        const { data: res } = await instance.get<GetOrderResponse>(`/orders/number/${orderNumber}`);
        return res;
    }

    static async getMyOrders(userId: string): Promise<ListOrdersResponse> {
        const { data: res } = await instance.get<ListOrdersResponse>(`/orders/my/${userId}`);
        return res;
    }

    // static async deleteOrder(orderId: string): Promise<DeleteOrderResponse> {
    //     const { data: res } = await instance.delete<DeleteOrderResponse>(`/orders/${orderId}`);
    //     return res;
    // }
}
