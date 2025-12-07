/**
 * Тесты для компонента AdminProducts
 * 
 * Обновлено для работы с новой архитектурой с разделением ответственности
 */

import React from 'react'
import { render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { AdminProducts } from '../AdminProducts'
import { ProductResponse } from '@/api/ProductApi'
import { useCategoriesStore } from '@/zustand/products_store/CategoriesStore'
import { useAppStore } from '@/zustand/app_store/AppStore'
import { useProductForm } from '@/hooks/useProductForm'
import { useProductSubmission } from '@/hooks/useProductSubmission'

// Мокируем зависимости
jest.mock('@/zustand/products_store/CategoriesStore')
jest.mock('@/zustand/app_store/AppStore')
jest.mock('@/hooks/useProductForm')
jest.mock('@/hooks/useProductSubmission')
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
    const mockUpdateProductData = jest.fn()
    const mockSetForm = jest.fn()
    const mockSetErrors = jest.fn()
    const mockHandleChange = jest.fn()
    const mockHandleFiles = jest.fn()
    const mockHandleRemovePhoto = jest.fn()
    const mockValidateForm = jest.fn()

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

        ;(useProductForm as jest.Mock).mockReturnValue({
            form: {
                productId: 'TEST123',
                name: 'Test Product',
                description: 'Test Description',
                size: 'm',
                category: 'cat1',
                price: 1000,
                stockQuantity: 10,
                isActive: true,
                photos: []
            },
            setForm: mockSetForm,
            existingPhotos: ['/photo1.jpg', '/photo2.jpg', '/photo3.jpg'],
            photosToRemove: [],
            errors: {},
            setErrors: mockSetErrors,
            processingPhotos: false,
            isEditMode: true,
            validateForm: mockValidateForm,
            handleChange: mockHandleChange,
            handleFiles: mockHandleFiles,
            handleRemovePhoto: mockHandleRemovePhoto,
        })

        ;(useProductSubmission as jest.Mock).mockReturnValue({
            createProduct: jest.fn(),
            updateProductData: mockUpdateProductData
        })
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
        
        expect(screen.getByText(/Текущие фотографии/i)).toBeInTheDocument()
    })

    it('должен вызывать updateProductData при сохранении изменений', async () => {
        const user = userEvent.setup()
        mockUpdateProductData.mockResolvedValue({ success: true })
        mockValidateForm.mockResolvedValue({ isValid: true, errors: {} })

        render(
            <AdminProducts 
                product={mockProduct} 
                onClose={mockOnClose}
                onSuccess={mockOnSuccess}
            />
        )

        // Нажимаем кнопку сохранения
        const submitButton = screen.getByText('Сохранить изменения')
        await user.click(submitButton)

        await waitFor(() => {
            expect(mockValidateForm).toHaveBeenCalled()
            expect(mockUpdateProductData).toHaveBeenCalled()
        })
    })

    it('должен показывать ошибки валидации при невалидной форме', async () => {
        const user = userEvent.setup()
        mockValidateForm.mockResolvedValue({ 
            isValid: false, 
            errors: { name: 'Название обязательно' } 
        })

        render(<AdminProducts product={mockProduct} onClose={mockOnClose} />)

        const submitButton = screen.getByText('Сохранить изменения')
        await user.click(submitButton)

        await waitFor(() => {
            expect(mockValidateForm).toHaveBeenCalled()
            expect(mockSetErrors).toHaveBeenCalledWith({ name: 'Название обязательно' })
        })
    })

    it('должен обрабатывать ошибки при обновлении', async () => {
        const user = userEvent.setup()
        mockValidateForm.mockResolvedValue({ isValid: true, errors: {} })
        mockUpdateProductData.mockResolvedValue({ 
            success: false, 
            error: 'Ошибка обновления' 
        })

        render(<AdminProducts product={mockProduct} onClose={mockOnClose} />)

        const submitButton = screen.getByText('Сохранить изменения')
        await user.click(submitButton)

        await waitFor(() => {
            expect(mockSetErrors).toHaveBeenCalledWith(
                expect.objectContaining({ general: expect.stringContaining('Ошибка') })
            )
        })
    })
})

describe('AdminProducts - Режим создания', () => {
    const mockOnClose = jest.fn()
    const mockCreateProduct = jest.fn()
    const mockSetForm = jest.fn()
    const mockSetErrors = jest.fn()
    const mockHandleChange = jest.fn()
    const mockHandleFiles = jest.fn()
    const mockValidateForm = jest.fn()

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

        ;(useProductForm as jest.Mock).mockReturnValue({
            form: {
                productId: '',
                name: '',
                description: '',
                size: 's',
                category: '',
                price: 0,
                stockQuantity: 0,
                isActive: true,
                photos: []
            },
            setForm: mockSetForm,
            existingPhotos: [],
            photosToRemove: [],
            errors: {},
            setErrors: mockSetErrors,
            processingPhotos: false,
            isEditMode: false,
            validateForm: mockValidateForm,
            handleChange: mockHandleChange,
            handleFiles: mockHandleFiles,
            handleRemovePhoto: jest.fn(),
        })

        ;(useProductSubmission as jest.Mock).mockReturnValue({
            createProduct: mockCreateProduct,
            updateProductData: jest.fn()
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

    it('должен вызывать createProduct при создании товара', async () => {
        const user = userEvent.setup()
        mockCreateProduct.mockResolvedValue({ success: true })
        mockValidateForm.mockResolvedValue({ isValid: true, errors: {} })

        render(<AdminProducts onClose={mockOnClose} />)

        const submitButton = screen.getByText('Создать товар')
        await user.click(submitButton)

        await waitFor(() => {
            expect(mockValidateForm).toHaveBeenCalled()
            expect(mockCreateProduct).toHaveBeenCalled()
        })
    })

    it('должен показывать ошибки валидации при создании', async () => {
        const user = userEvent.setup()
        mockValidateForm.mockResolvedValue({ 
            isValid: false, 
            errors: { photos: 'Нужно выбрать минимум 3 фото' } 
        })

        render(<AdminProducts onClose={mockOnClose} />)

        const submitButton = screen.getByText('Создать товар')
        await user.click(submitButton)

        await waitFor(() => {
            expect(mockSetErrors).toHaveBeenCalledWith({ photos: 'Нужно выбрать минимум 3 фото' })
        })
    })
})
