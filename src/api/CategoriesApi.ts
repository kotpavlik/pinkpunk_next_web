import { AxiosResponse } from "axios"
import { instance } from "./Api"

export type CreateCategoryRequest = {
    name: string
    slug: string
    sortOrder?: number
    isActive?: boolean
}
export type CategoryResponse = {
    _id: string
    name: string
    slug: string
    sortOrder?: number
    isActive?: boolean
}

export const CategoriesApi = {
    async getCategories(): Promise<AxiosResponse<CategoryResponse[]>> {
        const response = await instance.get('categories')
        return response
    },

    async createCategory(dto: CreateCategoryRequest): Promise<AxiosResponse<CategoryResponse>> {
        const response = await instance.post('categories', dto)
        return response
    },

    async updateCategory(id: string, dto: Partial<CreateCategoryRequest>): Promise<AxiosResponse<CategoryResponse>> {
        const response = await instance.patch(`categories/${id}`, dto)
        return response
    },

    async deleteCategory(id: string): Promise<AxiosResponse<{ deleted: boolean }>> {
        const response = await instance.delete(`categories/${id}`)
        return response
    }
}