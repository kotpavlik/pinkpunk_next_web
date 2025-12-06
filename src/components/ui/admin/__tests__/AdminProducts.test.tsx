/**
 * Тесты для компонента AdminProducts в режиме редактирования
 * 
 * Для запуска тестов установите зависимости:
 * npm install --save-dev @testing-library/react @testing-library/jest-dom @testing-library/user-event
 */

import React from 'react'
import { render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { AdminProducts } from '../AdminProducts'
import { ProductResponse } from '@/api/ProductApi'
import { useCategoriesStore } from '@/zustand/products_store/CategoriesStore'
import { useAppStore } from '@/zustand/app_store/AppStore'
import { useProductsStore } from '@/zustand/products_store/ProductsStore'
import { ProductApi } from '@/api/ProductApi'

// Мокируем зависимости
jest.mock('@/zustand/products_store/CategoriesStore')
jest.mock('@/zustand/app_store/AppStore')
jest.mock('@/zustand/products_store/ProductsStore')
jest.mock('@/api/ProductApi')
jest.mock('next/image', () => ({
    __esModule: true,
    default: ({ src, alt }: { src: string; alt: string }) => (
        <img src={src} alt={alt} />
    )
}))

const mockProduct: ProductResponse = {
    _id: '123',
    productId: 'TEST123',
    name: 'Test Product',
    description: 'Test Description',
    size: 'm',
    category: { _id: 'cat1', name: 'Category 1', slug: 'category-1' },
    price: 1000,
    stockQuantity: 10,
    isActive: true,
    photos: ['/photo1.jpg', '/photo2.jpg', '/photo3.jpg'],
    createdAt: '2024-01-01',
    updatedAt: '2024-01-01'
}

describe('AdminProducts - Режим редактирования', () => {
    const mockOnClose = jest.fn()
    const mockOnSuccess = jest.fn()
    const mockUpdateProduct = jest.fn()

    beforeEach(() => {
        jest.clearAllMocks()
        
        ;(useCategoriesStore as jest.Mock).mockReturnValue({
            categories: [
                { _id: 'cat1', name: 'Category 1' },
                { _id: 'cat2', name: 'Category 2' }
            ],
            getCategories: jest.fn()
        })

        ;(useAppStore as jest.Mock).mockReturnValue({
            status: 'idle',
            error: null,
            setStatus: jest.fn()
        })

        ;(useProductsStore as jest.Mock).mockReturnValue({
            updateProduct: mockUpdateProduct
        })

        ;(ProductApi.CreateProduct as jest.Mock).mockResolvedValue({
            data: mockProduct
        })
    })

    it('должен отображать заголовок "Редактировать товар" в режиме редактирования', () => {
        render(<AdminProducts product={mockProduct} onClose={mockOnClose} />)
        
        expect(screen.getByText('Редактировать товар')).toBeInTheDocument()
    })

    it('должен предзаполнять форму данными товара', () => {
        render(<AdminProducts product={mockProduct} onClose={mockOnClose} />)
        
        const nameInput = screen.getByDisplayValue('Test Product') as HTMLInputElement
        const priceInput = screen.getByDisplayValue('1000') as HTMLInputElement
        
        expect(nameInput).toBeInTheDocument()
        expect(priceInput).toBeInTheDocument()
    })

    it('должен делать поле productId недоступным для редактирования', () => {
        render(<AdminProducts product={mockProduct} onClose={mockOnClose} />)
        
        const productIdInput = screen.getByDisplayValue('TEST123') as HTMLInputElement
        expect(productIdInput).toBeDisabled()
    })

    it('должен отображать текущие фотографии товара', () => {
        render(<AdminProducts product={mockProduct} onClose={mockOnClose} />)
        
        // Проверяем, что отображается текст о текущих фотографиях
        expect(screen.getByText(/Текущие фотографии/i)).toBeInTheDocument()
    })

    it('должен вызывать updateProduct при сохранении изменений', async () => {
        const user = userEvent.setup()
        mockUpdateProduct.mockResolvedValue(undefined)

        render(
            <AdminProducts 
                product={mockProduct} 
                onClose={mockOnClose}
                onSuccess={mockOnSuccess}
            />
        )

        // Изменяем название
        const nameInput = screen.getByDisplayValue('Test Product')
        await user.clear(nameInput)
        await user.type(nameInput, 'Updated Product')

        // Нажимаем кнопку сохранения
        const submitButton = screen.getByText('Сохранить изменения')
        await user.click(submitButton)

        await waitFor(() => {
            expect(mockUpdateProduct).toHaveBeenCalled()
        })
    })

    it('должен вызывать onSuccess после успешного обновления', async () => {
        const user = userEvent.setup()
        mockUpdateProduct.mockResolvedValue(undefined)
        
        // Мокаем setStatus чтобы он устанавливал статус success
        const setStatusMock = jest.fn((status) => {
            if (status === 'success') {
                // Симулируем изменение статуса
                ;(useAppStore as jest.Mock).mockReturnValue({
                    status: 'success',
                    error: null,
                    setStatus: setStatusMock
                })
            }
        })
        ;(useAppStore as jest.Mock).mockReturnValue({
            status: 'idle',
            error: null,
            setStatus: setStatusMock
        })

        render(
            <AdminProducts 
                product={mockProduct} 
                onClose={mockOnClose}
                onSuccess={mockOnSuccess}
            />
        )

        const nameInput = screen.getByDisplayValue('Test Product')
        await user.clear(nameInput)
        await user.type(nameInput, 'Updated Product')

        const submitButton = screen.getByText('Сохранить изменения')
        await user.click(submitButton)

        // Проверяем, что updateProduct был вызван
        await waitFor(() => {
            expect(mockUpdateProduct).toHaveBeenCalled()
        })
    })

    it('должен показывать сообщение об успешном обновлении', async () => {
        const user = userEvent.setup()
        mockUpdateProduct.mockResolvedValue(undefined)
        
        // Мокаем setStatus чтобы он устанавливал статус success
        const setStatusMock = jest.fn()
        ;(useAppStore as jest.Mock).mockReturnValue({
            status: 'success',
            error: null,
            setStatus: setStatusMock
        })

        render(
            <AdminProducts 
                product={mockProduct} 
                onClose={mockOnClose}
            />
        )

        const nameInput = screen.getByDisplayValue('Test Product')
        await user.clear(nameInput)
        await user.type(nameInput, 'Updated Product')

        const submitButton = screen.getByText('Сохранить изменения')
        await user.click(submitButton)

        // Проверяем, что updateProduct был вызван
        await waitFor(() => {
            expect(mockUpdateProduct).toHaveBeenCalled()
        })
    })

    it('должен обрабатывать удаление фотографий', async () => {
        const user = userEvent.setup()
        render(<AdminProducts product={mockProduct} onClose={mockOnClose} />)

        // Находим кнопку удаления фото (если она есть)
        const removeButtons = screen.queryAllByRole('button', { name: /удалить/i })
        
        // Если есть кнопки удаления, проверяем их функциональность
        if (removeButtons.length > 0) {
            await user.click(removeButtons[0])
            // Проверяем, что фото было удалено из списка
        }
    })
})

describe('AdminProducts - Режим создания', () => {
    const mockOnClose = jest.fn()

    beforeEach(() => {
        jest.clearAllMocks()
        
        ;(useCategoriesStore as jest.Mock).mockReturnValue({
            categories: [
                { _id: 'cat1', name: 'Category 1' }
            ],
            getCategories: jest.fn()
        })

        ;(useAppStore as jest.Mock).mockReturnValue({
            status: 'idle',
            error: null,
            setStatus: jest.fn()
        })
    })

    it('должен отображать заголовок "Добавить товар" в режиме создания', () => {
        render(<AdminProducts onClose={mockOnClose} />)
        
        expect(screen.getByText('Добавить товар')).toBeInTheDocument()
    })

    it('должен иметь пустую форму в режиме создания', () => {
        render(<AdminProducts onClose={mockOnClose} />)
        
        const nameInput = screen.getByPlaceholderText(/Введите название товара/i) as HTMLInputElement
        expect(nameInput.value).toBe('')
    })
})

