'use client'

import { useEffect, useMemo, useState } from 'react'
import * as yup from 'yup'
import { useCategoriesStore } from '@/zustand/products_store/CategoriesStore'
import { CreateCategoryRequest } from '@/api/CategoriesApi'
import { useAppStore } from '@/zustand/app_store/AppStore'

type CategoryFormProps = {
    initial?: Partial<CreateCategoryRequest>
    onSubmit: (dto: CreateCategoryRequest) => void
    onClose: () => void
}

const categorySchema = yup.object().shape({
    name: yup
        .string()
        .required('Название обязательно')
        .min(3, 'Название должно содержать минимум 3 символа')
        .max(15, 'Название не должно превышать 15 символов'),
    slug: yup
        .string()
        .required('Slug обязателен')
        .min(3, 'Slug должен содержать минимум 3 символа')
        .max(15, 'Slug не должен превышать 15 символов')
        .matches(/^[a-z0-9-]+$/, 'Slug может содержать только латиницу, цифры и дефисы')
        .test('no-spaces', 'Slug не должен содержать пробелы', value => !value?.includes(' ')),
    sortOrder: yup
        .number()
        .nullable()
        .transform((value, originalValue) => {
            if (originalValue === '' || originalValue === null || originalValue === undefined) {
                return null;
            }
            return Number(value);
        })
        .integer('Порядок должен быть целым числом')
        .min(0, 'Порядок не может быть отрицательным'),
    isActive: yup
        .boolean()
        .required('Статус активности обязателен')
});

const CategoryForm = ({ initial, onSubmit, onClose }: CategoryFormProps) => {
    const [name, setName] = useState(initial?.name ?? '')
    const [slug, setSlug] = useState(initial?.slug ?? '')
    const [sortOrder, setSortOrder] = useState<number | ''>(initial?.sortOrder ?? '')
    const [isActive, setIsActive] = useState<boolean>(initial?.isActive ?? true)
    const [errors, setErrors] = useState<{ name?: string, slug?: string, sortOrder?: string, general?: string }>({})

    const validateField = async (fieldName: string, value: string | number | boolean | null) => {
        try {
            await categorySchema.validateAt(fieldName, { [fieldName]: value });
            return null;
        } catch (error) {
            if (error instanceof yup.ValidationError) {
                return error.message;
            }
            return 'Ошибка валидации';
        }
    }

    const handleNameChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
        const value = e.target.value
        setName(value)
        const error = await validateField('name', value)
        setErrors(prev => ({ ...prev, name: error || undefined }))
    }

    const handleSlugChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
        const value = e.target.value.toLowerCase()
        setSlug(value)
        const error = await validateField('slug', value)
        setErrors(prev => ({ ...prev, slug: error || undefined }))
    }

    const handleSortOrderChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
        const value = e.target.value
        const numericValue = value === '' ? '' : Number(value)
        setSortOrder(numericValue)
        const error = await validateField('sortOrder', numericValue === '' ? null : numericValue)
        setErrors(prev => ({ ...prev, sortOrder: error || undefined }))
    }

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault()
        try {
            const formData = {
                name,
                slug,
                sortOrder: sortOrder === '' ? null : Number(sortOrder),
                isActive
            }
            await categorySchema.validate(formData, { abortEarly: false })
            onSubmit({
                name,
                slug,
                sortOrder: sortOrder === '' ? undefined : Number(sortOrder),
                isActive
            })
            onClose()
        } catch (error) {
            if (error instanceof yup.ValidationError) {
                const yupErrors: { [key: string]: string } = {}
                error.inner.forEach((err) => {
                    if (err.path) {
                        yupErrors[err.path] = err.message
                    }
                })
                setErrors(yupErrors)
            } else {
                setErrors({ general: 'Произошла ошибка при валидации формы' })
            }
        }
    }

    return (
        <form onSubmit={handleSubmit} className="space-y-4 text-white p-4">
            {errors.general && (
                <div className="bg-red-500/20 border border-red-500/50 p-3 text-red-200 text-sm">
                    {errors.general}
                </div>
            )}
            <div className="relative">
                <input
                    className={`w-full bg-white/10 backdrop-blur-sm border p-3 text-white placeholder-white/50 focus:outline-none focus:border-[var(--mint-bright)] transition-all ${errors.name ? 'border-[var(--pink-punk)]' : 'border-white/20'}`}
                    placeholder="Название (3-15 символов)"
                    value={name}
                    onChange={handleNameChange}
                    maxLength={15}
                />
                {errors.name && (
                    <p className="absolute top-full left-0 right-0 text-[var(--pink-punk)] text-xs px-2 py-1 bg-black/80 backdrop-blur-sm animate-slideDown z-10">
                        {errors.name}
                    </p>
                )}
            </div>
            <div className="relative">
                <input
                    className={`w-full bg-white/10 backdrop-blur-sm border p-3 text-white placeholder-white/50 focus:outline-none focus:border-[var(--mint-bright)] transition-all ${errors.slug ? 'border-[var(--pink-punk)]' : 'border-white/20'}`}
                    placeholder="Slug (латиница, цифры, дефисы, 3-15 символов)"
                    value={slug}
                    onChange={handleSlugChange}
                    maxLength={15}
                />
                {errors.slug && (
                    <p className="absolute top-full left-0 right-0 text-[var(--pink-punk)] text-xs px-2 py-1 bg-black/80 backdrop-blur-sm animate-slideDown z-10">
                        {errors.slug}
                    </p>
                )}
            </div>
            <div className="relative">
                <input
                    className={`w-full bg-white/10 backdrop-blur-sm border p-3 text-white placeholder-white/50 focus:outline-none focus:border-[var(--mint-bright)] transition-all ${errors.sortOrder ? 'border-[var(--pink-punk)]' : 'border-white/20'}`}
                    placeholder="Порядок (только цифры)"
                    value={String(sortOrder)}
                    onChange={handleSortOrderChange}
                    inputMode="numeric"
                    pattern="[0-9]*"
                />
                {errors.sortOrder && (
                    <p className="absolute top-full left-0 right-0 text-[var(--pink-punk)] text-xs px-2 py-1 bg-black/80 backdrop-blur-sm animate-slideDown z-10">
                        {errors.sortOrder}
                    </p>
                )}
            </div>
            <label className="flex items-center gap-2 cursor-pointer">
                <input
                    type="checkbox"
                    checked={isActive}
                    onChange={e => setIsActive(e.target.checked)}
                    className="w-4 h-4 accent-[var(--mint-bright)]"
                />
                <span className="text-white/70">Активна</span>
            </label>
            <div className="flex gap-3">
                <button
                    type="submit"
                    className="px-6 py-3 bg-[var(--mint-bright)] text-black font-bold transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed"
                    disabled={Object.values(errors).some(error => error)}
                >
                    Сохранить
                </button>
                <button
                    type="button"
                    onClick={onClose}
                    className="px-6 py-3 bg-white/10 backdrop-blur-sm border border-white/20 text-white hover:bg-white/15 transition-all duration-200"
                >
                    Отмена
                </button>
            </div>
        </form>
    )
}

const ConfirmDelete = ({ name, onConfirm, onClose }: { name: string, onConfirm: () => void, onClose: () => void }) => (
    <div className="text-white p-4">
        <p className="mb-6 text-white/70">Вы точно хотите удалить категорию &quot;{name}&quot;?</p>
        <div className="flex gap-3">
            <button
                onClick={onConfirm}
                className="px-6 py-3 bg-[var(--pink-punk)] text-white font-bold transition-all duration-200 hover:bg-[var(--pink-dark)]"
            >
                Удалить
            </button>
            <button
                onClick={onClose}
                className="px-6 py-3 bg-white/10 backdrop-blur-sm border border-white/20 text-white hover:bg-white/15 transition-all duration-200"
            >
                Отмена
            </button>
        </div>
    </div>
)

const AdminCategories = () => {
    const { categories, getCategories, createCategory, updateCategory, deleteCategory } = useCategoriesStore()
    const { status } = useAppStore()
    const [isCreateOpen, setIsCreateOpen] = useState(false)
    const [editId, setEditId] = useState<string | null>(null)
    const [deleteId, setDeleteId] = useState<string | null>(null)
    const [showSuccess, setShowSuccess] = useState(false)

    useEffect(() => {
        getCategories()
    }, [getCategories])

    useEffect(() => {
        if (status === 'success' && showSuccess) {
            const timer = setTimeout(() => {
                setShowSuccess(false)
            }, 3000)
            return () => clearTimeout(timer)
        }
    }, [status, showSuccess])

    const editCategory = useMemo(() => categories.find(c => c._id === editId) || null, [categories, editId])
    const deleteCategoryName = useMemo(() => categories.find(c => c._id === deleteId)?.name || '', [categories, deleteId])

    return (
        <div className="p-4 mt-4 bg-white/5 backdrop-blur-md border border-white/10 text-white">
            <div className="flex items-center justify-between mb-5">
                <h1 className="text-[var(--mint-bright)] text-xl font-bold font-durik">Категории</h1>
                <button
                    onClick={() => setIsCreateOpen(true)}
                    className="relative inline-flex items-center justify-center p-2 rounded-full text-white/50 hover:text-white hover:bg-white/10 backdrop-blur-sm transition-all duration-200 transform hover:scale-105"
                    aria-label="Добавить категорию"
                >
                    <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                    </svg>
                </button>
            </div>
            <div className="space-y-2">
                {categories.map(cat => (
                    <div key={cat._id} className="flex items-center justify-between bg-white/10 backdrop-blur-sm border border-white/20 p-3 hover:border-[var(--mint-bright)] transition-all duration-200">
                        <div
                            onDoubleClick={() => setEditId(cat._id)}
                            className="cursor-pointer select-none flex-1"
                            title="Дважды кликните для редактирования"
                        >
                            <div className="font-semibold text-white">{cat.name}</div>
                            <div className="text-xs text-white/60">slug: {cat.slug}</div>
                        </div>
                        <div className="flex items-center gap-3">
                            <label className="flex items-center gap-2 cursor-pointer">
                                <input
                                    type="checkbox"
                                    checked={cat.isActive !== false}
                                    onChange={(e) => updateCategory(cat._id, { isActive: e.target.checked })}
                                    className="sr-only"
                                />
                                <span className={`text-xs font-medium ${cat.isActive !== false ? 'text-[var(--mint-bright)]' : 'text-white/60'}`}>
                                    {cat.isActive !== false ? 'Активна' : 'Неактивна'}
                                </span>
                                <div className={`w-10 h-5 transition-colors duration-200 ${cat.isActive !== false ? 'bg-[var(--mint-bright)]' : 'bg-white/20'}`}>
                                    <div className={`w-4 h-4 bg-white transition-transform duration-200 ${cat.isActive !== false ? 'translate-x-5' : 'translate-x-0.5'} mt-0.5`}></div>
                                </div>
                            </label>
                            <button
                                onClick={() => setDeleteId(cat._id)}
                                className="relative inline-flex items-center justify-center p-2 rounded-full text-white/50 hover:text-[var(--pink-punk)] hover:bg-white/10 backdrop-blur-sm transition-all duration-200 transform hover:scale-105"
                                aria-label="Удалить категорию"
                            >
                                <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                                </svg>
                            </button>
                        </div>
                    </div>
                ))}
            </div>
            {isCreateOpen && (
                <div
                    className="fixed inset-0 z-[10000] flex items-center justify-center bg-black/60 backdrop-blur-md p-4"
                    onClick={(e) => {
                        if (e.target === e.currentTarget) {
                            setIsCreateOpen(false)
                        }
                    }}
                >
                    <div className="relative w-full max-w-md bg-white/5 backdrop-blur-md border border-white/10 rounded-lg overflow-hidden">
                        <div className="flex items-center justify-between p-4 border-b border-white/10">
                            <h1 className="text-[var(--mint-bright)] text-xl font-bold font-durik">
                                Новая категория
                            </h1>
                            <button
                                onClick={() => setIsCreateOpen(false)}
                                className="w-8 h-8 rounded-full flex items-center justify-center bg-white/10 hover:bg-white/20 backdrop-blur-sm border border-white/20 transition-colors"
                                aria-label="Закрыть"
                            >
                                <svg className="w-5 h-5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                                </svg>
                            </button>
                        </div>
                        <CategoryForm
                            onClose={() => setIsCreateOpen(false)}
                            onSubmit={(dto) => {
                                createCategory(dto)
                                setShowSuccess(true)
                                setIsCreateOpen(false)
                            }}
                        />
                    </div>
                </div>
            )}
            {editId && editCategory && (
                <div
                    className="fixed inset-0 z-[10000] flex items-center justify-center bg-black/60 backdrop-blur-md p-4"
                    onClick={(e) => {
                        if (e.target === e.currentTarget) {
                            setEditId(null)
                        }
                    }}
                >
                    <div className="relative w-full max-w-md bg-white/5 backdrop-blur-md border border-white/10 rounded-lg overflow-hidden">
                        <div className="flex items-center justify-between p-4 border-b border-white/10">
                            <h1 className="text-[var(--mint-bright)] text-xl font-bold font-durik">
                                Редактирование категории
                            </h1>
                            <button
                                onClick={() => setEditId(null)}
                                className="w-8 h-8 rounded-full flex items-center justify-center bg-white/10 hover:bg-white/20 backdrop-blur-sm border border-white/20 transition-colors"
                                aria-label="Закрыть"
                            >
                                <svg className="w-5 h-5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                                </svg>
                            </button>
                        </div>
                        <CategoryForm
                            initial={{ name: editCategory.name, slug: editCategory.slug, sortOrder: editCategory.sortOrder, isActive: editCategory.isActive }}
                            onClose={() => setEditId(null)}
                            onSubmit={(dto) => {
                                updateCategory(editCategory._id, dto)
                                setEditId(null)
                            }}
                        />
                    </div>
                </div>
            )}
            {deleteId && (
                <div
                    className="fixed inset-0 z-[10000] flex items-center justify-center bg-black/60 backdrop-blur-md p-4"
                    onClick={(e) => {
                        if (e.target === e.currentTarget) {
                            setDeleteId(null)
                        }
                    }}
                >
                    <div className="relative w-full max-w-md bg-white/5 backdrop-blur-md border border-white/10 rounded-lg overflow-hidden">
                        <div className="flex items-center justify-between p-4 border-b border-white/10">
                            <h1 className="text-[var(--mint-bright)] text-xl font-bold font-durik">
                                Удалить категорию
                            </h1>
                            <button
                                onClick={() => setDeleteId(null)}
                                className="w-8 h-8 rounded-full flex items-center justify-center bg-white/10 hover:bg-white/20 backdrop-blur-sm border border-white/20 transition-colors"
                                aria-label="Закрыть"
                            >
                                <svg className="w-5 h-5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                                </svg>
                            </button>
                        </div>
                        <ConfirmDelete
                            name={deleteCategoryName}
                            onClose={() => setDeleteId(null)}
                            onConfirm={() => { deleteCategory(deleteId); setDeleteId(null); }}
                        />
                    </div>
                </div>
            )}
            {showSuccess && status === 'success' && (
                <div className="fixed top-4 right-4 bg-[var(--mint-bright)] text-black px-6 py-3 shadow-2xl z-[10000]">
                    <div className="flex items-center justify-between">
                        <span className="font-bold">Категория создана!</span>
                        <button
                            onClick={() => setShowSuccess(false)}
                            className="ml-3 text-black hover:opacity-70 transition-opacity"
                        >
                            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                            </svg>
                        </button>
                    </div>
                </div>
            )}
        </div>
    )
}

export default AdminCategories

