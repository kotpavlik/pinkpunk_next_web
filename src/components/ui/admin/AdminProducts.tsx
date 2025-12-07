'use client'

import { useState, useEffect, useCallback } from "react";
import { useCategoriesStore } from "@/zustand/products_store/CategoriesStore";
import { ProductResponse } from "@/api/ProductApi";
import { ClothingSize } from "@/zustand/products_store/ProductsStore";
import { useAppStore } from "@/zustand/app_store/AppStore";
import Image from 'next/image';
import { useProductForm } from "@/hooks/useProductForm";
import { useProductSubmission } from "@/hooks/useProductSubmission";

type AdminProductsProps = {
    onClose: () => void
    product?: ProductResponse | null
    onSuccess?: () => void
    onGetSubmitHandler?: (handler: () => Promise<void>) => void
    onGetIsSubmitting?: (getter: () => boolean) => void
    onGetProcessingPhotos?: (getter: () => boolean) => void
    onGetErrors?: (getter: () => { [key: string]: string | undefined }) => void
}

export const AdminProducts = ({ onClose, product, onSuccess, onGetSubmitHandler, onGetIsSubmitting, onGetProcessingPhotos, onGetErrors }: AdminProductsProps) => {
    const { categories, getCategories } = useCategoriesStore()
    const { status, error, setStatus } = useAppStore()

    // Используем кастомные хуки для разделения ответственности
    const {
        form,
        setForm,
        existingPhotos,
        photosToRemove,
        errors,
        setErrors,
        processingPhotos,
        isEditMode,
        validateForm,
        handleChange,
        handleFiles,
        handleRemovePhoto,
    } = useProductForm(product)

    const { createProduct, updateProductData } = useProductSubmission()

    const [showSuccess, setShowSuccess] = useState(false)
    const [isSubmitting, setIsSubmitting] = useState(false)

    // Функция для получения URL изображения
    const getImageUrl = (photoUrl: string) => {
        if (photoUrl.startsWith('http://') || photoUrl.startsWith('https://')) {
            return photoUrl
        }
        if (photoUrl.startsWith('/')) {
            const baseURL = process.env.NEXT_PUBLIC_BASE_URL || 'https://pinkpunknestbot-production.up.railway.app'
            return `${baseURL}${photoUrl}`
        }
        return photoUrl
    }

    useEffect(() => {
        getCategories()
        setStatus('idle')
        setShowSuccess(false)
        setIsSubmitting(false)
        setErrors({})
    }, [getCategories, setStatus, setErrors])

    useEffect(() => {
        if (status === 'success' && isSubmitting) {
            setIsSubmitting(false)
            setShowSuccess(true)
            setTimeout(() => {
                onClose()
            }, 1500)
        }
    }, [status, isSubmitting, onClose])

    useEffect(() => {
        if (status === 'failed' && isSubmitting) {
            setIsSubmitting(false)
        }
    }, [status, isSubmitting])

    // Обработчик отправки формы
    const handleSubmit = useCallback(async () => {
        // Проверяем, что все необходимые функции доступны
        if (!validateForm || !createProduct || !updateProductData) {
            console.error('Не все необходимые функции инициализированы')
            setErrors({ general: 'Ошибка инициализации формы' })
            return
        }

        setErrors({})

        // Валидация формы
        const validation = await validateForm()
        if (!validation.isValid) {
            setErrors(validation.errors)
            return
        }

        setShowSuccess(false)
        setIsSubmitting(true)

        try {
            if (isEditMode && product) {
                // Режим редактирования
                const result = await updateProductData(product._id, form, photosToRemove)

                if (result.success) {
                    setIsSubmitting(false)
                    setStatus('success')
                    setShowSuccess(true)

                    // Вызываем callback успеха
                    if (onSuccess) {
                        setTimeout(() => {
                            onSuccess()
                        }, 2000)
                    } else {
                        setTimeout(() => {
                            setShowSuccess(false)
                            setStatus('idle')
                            onClose()
                        }, 2000)
                    }
                } else {
                    setIsSubmitting(false)
                    setStatus('failed')
                    setErrors({ general: result.error || 'Произошла ошибка при редактировании товара' })
                }
            } else {
                // Режим создания
                const result = await createProduct(form)

                if (result.success) {
                    setIsSubmitting(false)
                    setStatus('success')
                    setShowSuccess(true)
                    setForm({ productId: "", name: "", description: "", size: "s", stockQuantity: 0, price: 0, category: "", isActive: true, photos: [] })

                    // Скрываем сообщение об успехе через 2 секунды
                    setTimeout(() => {
                        setShowSuccess(false)
                        setStatus('idle')
                        onClose()
                    }, 2000)
                } else {
                    setIsSubmitting(false)
                    setStatus('failed')
                    setErrors({ general: result.error || 'Произошла ошибка при создании товара' })
                }
            }
        } catch (error) {
            setIsSubmitting(false)
            setStatus('failed')
            const errorMessage = error instanceof Error ? error.message : 'Произошла ошибка'
            setErrors({ general: isEditMode ? `Ошибка при редактировании товара: ${errorMessage}` : `Ошибка при создании товара: ${errorMessage}` })
        }
    }, [form, photosToRemove, isEditMode, product, validateForm, createProduct, updateProductData, setStatus, onSuccess, onClose, setErrors, setForm])

    // Передаем handleSubmit наружу для использования в header/footer
    useEffect(() => {
        if (onGetSubmitHandler) {
            console.log('Передаем handleSubmit через onGetSubmitHandler, handleSubmit:', handleSubmit, typeof handleSubmit)
            // Создаем обертку, которая всегда вызывает актуальную handleSubmit
            const submitFn = async () => {
                console.log('submitFn вызван, handleSubmit:', handleSubmit)
                if (handleSubmit && typeof handleSubmit === 'function') {
                    await handleSubmit()
                } else {
                    console.error('handleSubmit не определена в submitFn')
                }
            }
            onGetSubmitHandler(submitFn)
        }
    }, [onGetSubmitHandler, handleSubmit])

    useEffect(() => {
        if (onGetIsSubmitting) {
            onGetIsSubmitting(() => isSubmitting)
        }
    }, [onGetIsSubmitting, isSubmitting])

    useEffect(() => {
        if (onGetProcessingPhotos) {
            onGetProcessingPhotos(() => processingPhotos)
        }
    }, [onGetProcessingPhotos, processingPhotos])

    useEffect(() => {
        if (onGetErrors) {
            onGetErrors(() => errors)
        }
    }, [onGetErrors, errors])

    const sizeOptions: ClothingSize[] = ['s', 'm', 'l', 'xl']

    const getFieldStyles = (hasError: boolean) => {
        const baseStyles = "w-full bg-white/10 backdrop-blur-sm border p-3 text-white placeholder-white/50 focus:outline-none transition-all"
        const errorStyles = hasError ? 'border-[var(--pink-punk)]' : 'border-white/20 focus:border-[var(--mint-bright)]'
        const disabledStyles = isSubmitting ? 'opacity-50 cursor-not-allowed' : ''
        return `${baseStyles} ${errorStyles} ${disabledStyles}`.trim()
    }

    // Определяем, используется ли компонент в модалке (когда переданы пропсы для управления извне)
    const isInModal = !!onGetSubmitHandler

    return (
        <div className="bg-white/5 backdrop-blur-md border border-white/10 relative">
            {/* Заголовок и кнопка - только если не в модалке и режим создания */}
            {!isInModal && !isEditMode && (
                <div className="flex items-center justify-between p-4 border-b border-white/10">
                    <h1 className="text-[var(--mint-bright)] text-xl font-bold font-durik">
                        Добавить товар
                    </h1>
                </div>
            )}

            {isSubmitting && (
                <div className="absolute inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-10">
                    <div className="bg-white/10 backdrop-blur-xl border border-white/20 p-6 shadow-2xl flex items-center gap-3">
                        <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-[var(--mint-bright)]"></div>
                        <span className="text-white font-semibold">
                            {isEditMode ? 'Сохраняем изменения...' : 'Создаем товар...'}
                        </span>
                    </div>
                </div>
            )}

            <form onSubmit={(e) => { e.preventDefault(); handleSubmit(); }} className="p-4 space-y-4 text-white">
                {errors.general && (
                    <div className="bg-red-500/20 border border-red-500/50 p-3 text-red-200 text-sm">
                        {errors.general}
                    </div>
                )}

                <div className="relative">
                    <label className="block text-sm font-medium mb-1 text-white/70">Product ID *</label>
                    <input
                        name="productId"
                        placeholder="Введите Product ID (3-25 символов, латиница, цифры)"
                        value={form.productId}
                        onChange={handleChange}
                        disabled={isSubmitting || isEditMode}
                        className={getFieldStyles(!!errors.productId)}
                        maxLength={25}
                    />
                    {isEditMode && (
                        <p className="text-xs text-white/50 mt-1">Product ID нельзя изменить</p>
                    )}
                    {errors.productId && (
                        <p className="absolute top-full left-0 right-0 text-[var(--pink-punk)] text-xs px-2 py-1 bg-black/80 backdrop-blur-sm animate-slideDown z-10">
                            {errors.productId}
                        </p>
                    )}
                </div>

                <div className="relative">
                    <label className="block text-sm font-medium mb-1 text-white/70">Название товара *</label>
                    <input
                        name="name"
                        placeholder="Введите название товара (3-25 символов)"
                        value={form.name}
                        onChange={handleChange}
                        disabled={isSubmitting}
                        className={getFieldStyles(!!errors.name)}
                        maxLength={25}
                    />
                    {errors.name && (
                        <p className="absolute top-full left-0 right-0 text-[var(--pink-punk)] text-xs px-2 py-1 bg-black/80 backdrop-blur-sm animate-slideDown z-10">
                            {errors.name}
                        </p>
                    )}
                </div>

                <div className="relative">
                    <label className="block text-sm font-medium mb-1 text-white/70">Описание</label>
                    <textarea
                        name="description"
                        placeholder="Введите описание товара (до 100 символов)"
                        value={form.description}
                        onChange={handleChange}
                        disabled={isSubmitting}
                        className={getFieldStyles(!!errors.description)}
                        maxLength={100}
                        rows={3}
                    />
                    {errors.description && (
                        <p className="absolute top-full left-0 right-0 text-[var(--pink-punk)] text-xs px-2 py-1 bg-black/80 backdrop-blur-sm animate-slideDown z-10">
                            {errors.description}
                        </p>
                    )}
                </div>

                <div className="relative">
                    <label className="block text-sm font-medium mb-1 text-white/70">Цена *</label>
                    <input
                        name="price"
                        placeholder="Введите цену (только цифры, до 5 символов)"
                        value={String(form.price)}
                        onChange={handleChange}
                        className={getFieldStyles(!!errors.price)}
                        inputMode="numeric"
                        pattern="[0-9]*"
                        maxLength={5}
                    />
                    {errors.price && (
                        <p className="absolute top-full left-0 right-0 text-[var(--pink-punk)] text-xs px-2 py-1 bg-black/80 backdrop-blur-sm animate-slideDown z-10">
                            {errors.price}
                        </p>
                    )}
                </div>

                <div className="relative">
                    <label className="block text-sm font-medium mb-1 text-white/70">Категория *</label>
                    <select
                        name="category"
                        value={form.category}
                        onChange={handleChange}
                        disabled={isSubmitting}
                        className={getFieldStyles(!!errors.category)}
                    >
                        <option value="">Выберите категорию</option>
                        {categories.map(cat => (
                            <option key={cat._id} value={cat._id}>
                                {cat.name}
                            </option>
                        ))}
                    </select>
                    {errors.category && (
                        <p className="absolute top-full left-0 right-0 text-[var(--pink-punk)] text-xs px-2 py-1 bg-black/80 backdrop-blur-sm animate-slideDown z-10">
                            {errors.category}
                        </p>
                    )}
                </div>

                <div>
                    <label className="block text-sm font-medium mb-1 text-white/70">Размер</label>
                    <select
                        name="size"
                        value={form.size}
                        onChange={handleChange}
                        disabled={isSubmitting}
                        className={getFieldStyles(false)}
                    >
                        {sizeOptions.map(size => (
                            <option key={size} value={size}>
                                {size.toUpperCase()}
                            </option>
                        ))}
                    </select>
                </div>

                <div>
                    <label className="block text-sm font-medium mb-1 text-white/70">Количество на складе</label>
                    <input
                        name="stockQuantity"
                        placeholder="Введите количество на складе"
                        value={String(form.stockQuantity)}
                        onChange={handleChange}
                        disabled={isSubmitting}
                        className={getFieldStyles(false)}
                        inputMode="numeric"
                        pattern="[0-9]*"
                    />
                </div>

                <div className="relative">
                    <label className="block text-sm font-medium mb-1 text-white/70">
                        Фотографии товара {!isEditMode && '*'}
                    </label>

                    {/* Существующие фото (только в режиме редактирования) */}
                    {isEditMode && existingPhotos.length > 0 && (
                        <div className="mb-4">
                            <p className="text-xs text-white/60 mb-2">Текущие фотографии:</p>
                            <div className="grid grid-cols-3 gap-2">
                                {existingPhotos.map((photoUrl, idx) => (
                                    <div key={idx} className="relative group">
                                        <div className="relative aspect-square w-full">
                                            <Image
                                                src={getImageUrl(photoUrl)}
                                                alt={`Фото ${idx + 1}`}
                                                fill
                                                className="object-cover rounded"
                                                sizes="(max-width: 768px) 33vw, 150px"
                                            />
                                        </div>
                                        <button
                                            type="button"
                                            onClick={() => handleRemovePhoto(photoUrl)}
                                            className="absolute top-1 right-1 w-6 h-6 bg-red-500/80 hover:bg-red-500 rounded-full flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity"
                                        >
                                            <svg className="w-4 h-4 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                                            </svg>
                                        </button>
                                    </div>
                                ))}
                            </div>
                        </div>
                    )}

                    <input
                        type="file"
                        accept="image/jpeg,image/png,image/webp"
                        multiple
                        onChange={handleFiles}
                        disabled={processingPhotos || isSubmitting}
                        className={getFieldStyles(!!errors.photos)}
                    />
                    {processingPhotos && (
                        <p className="text-[var(--mint-bright)] text-xs mt-1">Обрабатываем фотографии...</p>
                    )}
                    {errors.photos && (
                        <p className="absolute top-full left-0 right-0 text-[var(--pink-punk)] text-xs px-2 py-1 bg-black/80 backdrop-blur-sm animate-slideDown z-10">
                            {errors.photos}
                        </p>
                    )}
                    <div className="mt-2 space-y-1">
                        <p className="text-xs text-white/60">
                            Максимальный размер при загрузке: 8 МБ на файл
                        </p>
                        <p className="text-xs text-white/60">
                            Форматы: JPEG, PNG, WebP
                        </p>
                        {!isEditMode && (
                            <p className="text-xs text-white/60">
                                Минимум 3 фотографии
                            </p>
                        )}
                        {form.photos.length > 0 && (
                            <p className="text-xs text-[var(--mint-bright)] mt-1">
                                Выбрано новых: {form.photos.length} {form.photos.length === 1 ? 'фото' : form.photos.length < 5 ? 'фото' : 'фотографий'}
                            </p>
                        )}
                    </div>
                </div>

                <div>
                    <label className="flex items-center gap-2 cursor-pointer">
                        <input
                            type="checkbox"
                            checked={form.isActive ?? true}
                            onChange={(e) => setForm(prev => ({ ...prev, isActive: e.target.checked }))}
                            disabled={isSubmitting}
                            className="w-4 h-4 accent-[var(--mint-bright)]"
                        />
                        <span className="text-sm font-medium text-white/70">Товар активен</span>
                    </label>
                </div>

                {/* Кнопка отправки - только если не в модалке */}
                {!isInModal && (
                    <div className="pt-4 border-t border-white/10">
                        <button
                            type="submit"
                            disabled={isSubmitting || processingPhotos || Object.values(errors).some(error => error)}
                            className={`w-full px-6 py-3 font-bold transition-all duration-200 ${processingPhotos || isSubmitting || Object.values(errors).some(error => error)
                                ? 'bg-white/20 text-white/50 cursor-not-allowed'
                                : 'bg-[var(--mint-bright)] text-black hover:opacity-90'
                                }`}
                        >
                            {processingPhotos
                                ? 'Обрабатываем фотографии...'
                                : isSubmitting
                                    ? (isEditMode ? 'Сохраняем изменения...' : 'Создаем товар...')
                                    : (isEditMode ? 'Сохранить изменения' : 'Создать товар')
                            }
                        </button>
                    </div>
                )}
            </form>

            {showSuccess && status === 'success' && !isSubmitting && (
                <div className="fixed inset-0 flex items-center justify-center bg-black/60 backdrop-blur-md z-[10000]">
                    <div className="bg-[var(--mint-bright)] text-black px-8 py-6 shadow-2xl flex items-center gap-3">
                        <div className="w-8 h-8 bg-black/20 flex items-center justify-center">
                            <svg className="w-5 h-5 text-black" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                            </svg>
                        </div>
                        <span className="font-bold text-lg">
                            {isEditMode ? 'Товар обновлен!' : 'Продукт создан!'}
                        </span>
                    </div>
                </div>
            )}

            {error && status === 'failed' && (
                <div className="fixed inset-0 flex items-center justify-center bg-black/60 backdrop-blur-md z-[10000]">
                    <div className="bg-[var(--pink-punk)] text-white px-6 py-4 shadow-2xl max-w-md mx-4">
                        <span className="font-bold">{error}</span>
                    </div>
                </div>
            )}
        </div>
    )
}
