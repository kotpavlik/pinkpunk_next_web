/**
 * Тесты для ProductsStore.updateProduct
 */

import { useProductsStore } from '../ProductsStore'
import { ProductApi, UpdateProductRequest, ProductResponse } from '@/api/ProductApi'
import * as AppStore from '@/zustand/app_store/AppStore'
// HandleError импортируется для мокирования, но не используется напрямую в тестах

// Мокируем зависимости
jest.mock('@/api/ProductApi', () => ({
    ProductApi: {
        UpdateProduct: jest.fn(),
    }
}))

jest.mock('@/zustand/app_store/AppStore', () => ({
    useAppStore: {
        getState: jest.fn(),
    }
}))

jest.mock('@/features/HandleError', () => ({
    HandleError: jest.fn(),
}))

describe('ProductsStore.updateProduct', () => {
    beforeEach(() => {
        jest.clearAllMocks()
        // Сброс store перед каждым тестом
        useProductsStore.setState({
            products: [],
            currentProduct: null
        })
    })

    it('должен обновлять товар в массиве products', async () => {
        const initialProduct: ProductResponse = {
            _id: '123',
            productId: 'TEST123',
            name: 'Original Product',
            description: 'Original Description',
            size: 'm',
            category: 'category-id',
            price: 1000,
            stockQuantity: 10,
            isActive: true,
            photos: ['photo1.jpg'],
            createdAt: '2024-01-01',
            updatedAt: '2024-01-01'
        }

        const updatedProduct: ProductResponse = {
            ...initialProduct,
            name: 'Updated Product',
            price: 1500,
            updatedAt: '2024-01-02'
        }

        // Устанавливаем начальное состояние
        useProductsStore.setState({
            products: [initialProduct]
        })

        const mockResponse = { data: updatedProduct }
        const setStatusMock = jest.fn()
        ;(ProductApi.UpdateProduct as jest.Mock).mockResolvedValue(mockResponse)
        ;(AppStore.useAppStore.getState as jest.Mock).mockReturnValue({
            setStatus: setStatusMock
        })

        await useProductsStore.getState().updateProduct('123', { name: 'Updated Product', price: 1500 })

        const state = useProductsStore.getState()
        expect(state.products[0].name).toBe('Updated Product')
        expect(state.products[0].price).toBe(1500)
    })

    it('должен обновлять currentProduct если редактируется текущий товар', async () => {
        const product: ProductResponse = {
            _id: '123',
            productId: 'TEST123',
            name: 'Original Product',
            description: 'Original Description',
            size: 'm',
            category: 'category-id',
            price: 1000,
            stockQuantity: 10,
            isActive: true,
            photos: ['photo1.jpg'],
            createdAt: '2024-01-01',
            updatedAt: '2024-01-01'
        }

        const updatedProduct: ProductResponse = {
            ...product,
            name: 'Updated Product',
            updatedAt: '2024-01-02'
        }

        useProductsStore.setState({
            products: [product],
            currentProduct: product
        })

        const mockResponse = { data: updatedProduct }
        const setStatusMock = jest.fn()
        ;(ProductApi.UpdateProduct as jest.Mock).mockResolvedValue(mockResponse)
        ;(AppStore.useAppStore.getState as jest.Mock).mockReturnValue({
            setStatus: setStatusMock
        })

        await useProductsStore.getState().updateProduct('123', { name: 'Updated Product' })

        const state = useProductsStore.getState()
        expect(state.currentProduct?.name).toBe('Updated Product')
    })

    it('должен обрабатывать ошибки и устанавливать статус failed', async () => {
        const product: ProductResponse = {
            _id: '123',
            productId: 'TEST123',
            name: 'Test Product',
            description: '',
            size: 'm',
            category: 'category-id',
            price: 1000,
            stockQuantity: 10,
            isActive: true,
            photos: [],
            createdAt: '2024-01-01',
            updatedAt: '2024-01-01'
        }

        useProductsStore.setState({
            products: [product]
        })

        const mockError = new Error('Update failed')
        ;(ProductApi.UpdateProduct as jest.Mock).mockRejectedValue(mockError)
        
        const setStatusMock = jest.fn()
        ;(AppStore.useAppStore.getState as jest.Mock).mockReturnValue({
            setStatus: setStatusMock
        })

        try {
            await useProductsStore.getState().updateProduct('123', { name: 'Updated' })
        } catch {
            // Ожидаем ошибку
        }

        expect(setStatusMock).toHaveBeenCalledWith('failed')
    })

    it('должен вызывать API с правильными параметрами', async () => {
        const product: ProductResponse = {
            _id: '123',
            productId: 'TEST123',
            name: 'Test Product',
            description: '',
            size: 'm',
            category: 'category-id',
            price: 1000,
            stockQuantity: 10,
            isActive: true,
            photos: [],
            createdAt: '2024-01-01',
            updatedAt: '2024-01-01'
        }

        useProductsStore.setState({
            products: [product]
        })

        const updateData: UpdateProductRequest = {
            name: 'Updated Name',
            price: 2000,
            stockQuantity: 5
        }

        const mockFile = new File(['test'], 'test.jpg', { type: 'image/jpeg' })
        const mockResponse = { data: { ...product, ...updateData } }
        const setStatusMock = jest.fn()
        
        ;(ProductApi.UpdateProduct as jest.Mock).mockResolvedValue(mockResponse)
        ;(AppStore.useAppStore.getState as jest.Mock).mockReturnValue({
            setStatus: setStatusMock
        })

        await useProductsStore.getState().updateProduct('123', updateData, [mockFile])

        expect(ProductApi.UpdateProduct).toHaveBeenCalledWith('123', updateData, [mockFile])
    })
})

