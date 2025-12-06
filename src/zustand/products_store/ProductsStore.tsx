import { create } from 'zustand';
import { immer } from 'zustand/middleware/immer';
import { AxiosError } from 'axios';

import { useAppStore } from '../app_store/AppStore';
import { ProductApi, ProductResponse, UpdateProductRequest } from '@/api/ProductApi';
import { HandleError } from '@/features/HandleError';

export type ClothingSize = 's' | 'm' | 'l' | 'xl';

export type ProductsStateType = {
    products: ProductResponse[]
    currentProduct: ProductResponse | null
    getProducts: (includeInactive?: boolean) => Promise<void>
    getProductById: (id: string) => Promise<void>
    // createProduct: (product: RequestProductType) => Promise<void>
    updateProduct: (id: string, product: UpdateProductRequest, photos?: File[]) => Promise<void>
    // deleteProduct: (id: string) => Promise<boolean>
};

export const useProductsStore = create<ProductsStateType>()(
    immer((set) => ({
        products: [],
        currentProduct: null,

        getProducts: async (includeInactive: boolean = false) => {
            const { setStatus } = useAppStore.getState()
            try {
                setStatus("loading")
                const response = await ProductApi.GetAllProducts(includeInactive)
                set((state) => {
                    state.products = response.data || []
                })
                setStatus("success")
            } catch (error) {
                const err = error as Error | AxiosError
                HandleError(err)
                setStatus("failed")
                // Устанавливаем пустой массив при ошибке
                set((state) => {
                    state.products = []
                })
            }
        },

        getProductById: async (id: string) => {
            const { setStatus } = useAppStore.getState()
            try {
                setStatus("loading")
                const response = await ProductApi.GetProductById(id)
                set((state) => {
                    state.currentProduct = response.data
                })
                setStatus("success")
            } catch (error) {
                const err = error as Error | AxiosError
                HandleError(err)
                setStatus("failed")
            }
        },

        // createProduct: async (product: RequestProductType) => {
        //     const { setStatus } = useAppStore.getState()
        //     try {
        //         setStatus("loading")
        //         const response = await ProductApi.CreateProduct(product)
        //         set((state) => {
        //             state.products.unshift(response.data)
        //         })
        //         setStatus("success")
        //     } catch (error) {
        //         const err = error as Error | AxiosError
        //         HandleError(err)
        //         setStatus("failed")
        //     }
        // },

        updateProduct: async (id: string, product: UpdateProductRequest, photos?: File[]) => {
            const { setStatus } = useAppStore.getState()
            try {
                setStatus("loading")
                const response = await ProductApi.UpdateProduct(id, product, photos)
                set((state) => {
                    const index = state.products.findIndex(p => p._id === id)
                    if (index !== -1) {
                        state.products[index] = response.data
                    }
                    if (state.currentProduct?._id === id) {
                        state.currentProduct = response.data
                    }
                })
                setStatus("success")
            } catch (error) {
                const err = error as Error | AxiosError
                HandleError(err)
                setStatus("failed")
            }
        },

        // deleteProduct: async (id: string) => {
        //     const { setStatus } = useAppStore.getState()
        //     try {
        //         setStatus("loading")
        //         const response = await ProductApi.DeleteProduct(id)

        //         // Проверяем ответ от сервера
        //         if (response.data && response.data.deleted === true) {
        //             // Обновляем состояние только если сервер подтвердил удаление
        //             set((state) => {
        //                 state.products = state.products.filter(p => p._id !== id)
        //                 if (state.currentProduct?._id === id) {
        //                     state.currentProduct = null
        //                 }
        //             })
        //             setStatus("success")
        //             return true // Возвращаем успех
        //         } else {
        //             // Если сервер не подтвердил удаление
        //             setStatus("failed")
        //             throw new Error("Сервер не подтвердил удаление продукта")
        //         }
        //     } catch (error) {
        //         const err = error as Error | AxiosError
        //         HandleError(err)
        //         setStatus("failed")
        //         throw error // Пробрасываем ошибку дальше
        //     }
        // }
    }))
)