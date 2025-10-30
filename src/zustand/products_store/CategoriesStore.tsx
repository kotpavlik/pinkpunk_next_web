import { create } from 'zustand';
import { immer } from 'zustand/middleware/immer';
import { AxiosError } from 'axios';

import { useAppStore } from '../app_store/AppStore';
import { CategoriesApi, CategoryResponse, CreateCategoryRequest } from '@/api/CategoriesApi';
import { HandleError } from '@/features/HandleError';

export type CategoriesStateType = {
    categories: CategoryResponse[]
    getCategories: () => Promise<void>
    createCategory: (dto: CreateCategoryRequest) => Promise<void>
    deleteCategory: (id: string) => Promise<void>
    updateCategory: (id: string, dto: Partial<CreateCategoryRequest>) => Promise<void>
}

export const useCategoriesStore = create<CategoriesStateType>()(
    immer((set) => ({
        categories: [],
        getCategories: async () => {
            const { setStatus } = useAppStore.getState()
            try {
                setStatus("loading")
                const response = await CategoriesApi.getCategories()
                set((state) => {
                    state.categories = response.data
                })
                setStatus("success")
            } catch (error) {
                const err = error as Error | AxiosError
                HandleError(err)
                setStatus("failed")
            }
        },
        createCategory: async (dto: CreateCategoryRequest) => {
            const { setStatus } = useAppStore.getState()
            try {
                setStatus("loading")
                const response = await CategoriesApi.createCategory(dto)
                set((state) => {
                    state.categories.push(response.data)
                })
                setStatus("success")
            } catch (error) {
                const err = error as Error | AxiosError
                HandleError(err)
                setStatus("failed")
            }
        },
        deleteCategory: async (id: string) => {
            const { setStatus } = useAppStore.getState()
            try {
                setStatus("loading")
                await CategoriesApi.deleteCategory(id)
                set((state) => {
                    state.categories = state.categories.filter((cat: CategoryResponse) => cat._id !== id)
                })
                setStatus("success")
            } catch (error) {
                const err = error as Error | AxiosError
                HandleError(err)
                setStatus("failed")
            }
        },
        updateCategory: async (id: string, dto: Partial<CreateCategoryRequest>) => {
            const { setStatus } = useAppStore.getState()
            try {
                setStatus("loading")
                const response = await CategoriesApi.updateCategory(id, dto)
                set((state) => {
                    const idx = state.categories.findIndex((c: CategoryResponse) => c._id === id)
                    if (idx !== -1) {
                        state.categories[idx] = response.data
                    }
                })
                setStatus("success")
            } catch (error) {
                const err = error as Error | AxiosError
                HandleError(err)
                setStatus("failed")
            }
        }
    }))
)

