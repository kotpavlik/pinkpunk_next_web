/**
 * Тесты для ProductApi.UpdateProduct
 */

import { ProductApi, UpdateProductRequest } from '../ProductApi'
import { instance } from '../Api'

// Мокируем axios instance
jest.mock('../Api', () => ({
    instance: {
        patch: jest.fn(),
    }
}))

const mockedInstance = instance as jest.Mocked<typeof instance>

describe('ProductApi.UpdateProduct', () => {
    beforeEach(() => {
        jest.clearAllMocks()
    })

    it('должен отправлять FormData при наличии новых фото', async () => {
        const mockResponse = {
            data: {
                _id: '123',
                productId: 'TEST123',
                name: 'Test Product',
                description: 'Test Description',
                size: 'm',
                category: 'category-id',
                price: 1000,
                stockQuantity: 10,
                isActive: true,
                photos: ['photo1.jpg', 'photo2.jpg'],
                createdAt: '2024-01-01',
                updatedAt: '2024-01-02'
            }
        }

        const mockFile = new File(['test'], 'test.jpg', { type: 'image/jpeg' })
        const updateData: UpdateProductRequest = {
            name: 'Updated Product',
            price: 1500
        }

        mockedInstance.patch.mockResolvedValue(mockResponse as never)

        const result = await ProductApi.UpdateProduct('123', updateData, [mockFile])

        expect(mockedInstance.patch).toHaveBeenCalledWith(
            'products/123',
            expect.any(FormData),
            { headers: { 'Content-Type': 'multipart/form-data' } }
        )
        expect(result.data).toEqual(mockResponse.data)
    })

    it('должен отправлять JSON при отсутствии новых фото', async () => {
        const mockResponse = {
            data: {
                _id: '123',
                productId: 'TEST123',
                name: 'Updated Product',
                description: 'Updated Description',
                size: 'l',
                category: 'category-id',
                price: 2000,
                stockQuantity: 5,
                isActive: true,
                photos: ['photo1.jpg'],
                createdAt: '2024-01-01',
                updatedAt: '2024-01-02'
            }
        }

        const updateData: UpdateProductRequest = {
            name: 'Updated Product',
            price: 2000,
            stockQuantity: 5
        }

        mockedInstance.patch.mockResolvedValue(mockResponse as never)

        const result = await ProductApi.UpdateProduct('123', updateData)

        expect(mockedInstance.patch).toHaveBeenCalledWith(
            'products/123',
            expect.objectContaining({
                name: 'Updated Product',
                price: 2000,
                stockQuantity: 5
            }),
            { headers: { 'Content-Type': 'application/json' } }
        )
        expect(result.data).toEqual(mockResponse.data)
    })

    it('должен обрабатывать удаление фото через removePhotos', async () => {
        const mockResponse = {
            data: {
                _id: '123',
                productId: 'TEST123',
                name: 'Test Product',
                photos: ['photo1.jpg'],
                createdAt: '2024-01-01',
                updatedAt: '2024-01-02'
            }
        }

        const updateData: UpdateProductRequest = {
            name: 'Updated Product',
            removePhotos: ['photo2.jpg', 'photo3.jpg']
        }

        mockedInstance.patch.mockResolvedValue(mockResponse as never)

        await ProductApi.UpdateProduct('123', updateData)

        const callArgs = mockedInstance.patch.mock.calls[0]
        expect(callArgs[1]).toHaveProperty('removePhotos', ['photo2.jpg', 'photo3.jpg'])
    })

    it('должен корректно обрабатывать частичное обновление', async () => {
        const mockResponse = {
            data: {
                _id: '123',
                productId: 'TEST123',
                name: 'Partially Updated',
                price: 1500,
                stockQuantity: 10,
                isActive: true,
                photos: [],
                createdAt: '2024-01-01',
                updatedAt: '2024-01-02'
            }
        }

        const updateData: UpdateProductRequest = {
            name: 'Partially Updated',
            price: 1500
        }

        mockedInstance.patch.mockResolvedValue(mockResponse as never)

        const result = await ProductApi.UpdateProduct('123', updateData)

        expect(mockedInstance.patch).toHaveBeenCalledWith(
            'products/123',
            expect.objectContaining({
                name: 'Partially Updated',
                price: 1500
            }),
            { headers: { 'Content-Type': 'application/json' } }
        )
        expect(result.data.name).toBe('Partially Updated')
        expect(result.data.price).toBe(1500)
    })
})

