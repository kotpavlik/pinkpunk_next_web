
import { AxiosResponse } from "axios"
import { instance } from "./Api"

export type RequestProductType = {
    productId: string,
    name: string,
    description: string,
    size: string,
    category: string,
    price: number,
    stockQuantity: number,
    isActive?: boolean,
    photos: File[]
}

export type ProductResponse = {
    _id: string
    productId: string
    name: string
    description: string
    size: string
    category: string | { _id: string, name: string, slug: string }
    price: number
    stockQuantity: number
    isActive: boolean
    photos: string[]
    createdAt: string
    updatedAt: string
}

export type UpdateProductRequest = {
    productId?: string
    name?: string
    description?: string
    size?: string
    category?: string
    price?: number
    stockQuantity?: number
    isActive?: boolean
    removePhotos?: string[]
}

export const ProductApi = {
    async CreateProduct(product: RequestProductType): Promise<AxiosResponse<ProductResponse>> {
        const formData = new FormData()
        formData.append('productId', product.productId)
        formData.append('name', product.name)
        formData.append('description', product.description)
        formData.append('size', product.size)
        formData.append('category', product.category)
        formData.append('price', String(product.price))
        formData.append('stockQuantity', String(product.stockQuantity))
        if (product.isActive !== undefined) formData.append('isActive', String(product.isActive))
        product.photos.forEach((file) => formData.append('photos', file))

        const response = await instance.post('products', formData, {
            headers: { 'Content-Type': 'multipart/form-data' }
        })
        
        return response
    },

    async GetAllProducts(includeInactive: boolean = false): Promise<AxiosResponse<ProductResponse[]>> {
        const params = includeInactive ? { includeInactive: 'true' } : {}
        const response = await instance.get('products', { params })
        return response
    },

    async GetProductById(id: string): Promise<AxiosResponse<ProductResponse>> {
        const response = await instance.get(`products/${id}`)
        return response
    },

    async UpdateProduct(id: string, product: UpdateProductRequest, photos?: File[]): Promise<AxiosResponse<ProductResponse>> {
        // Если есть файлы, используем FormData
        if (photos && photos.length > 0) {
            const formData = new FormData()
            
            if (product.productId) formData.append('productId', product.productId)
            if (product.name) formData.append('name', product.name)
            if (product.description) formData.append('description', product.description)
            if (product.size) formData.append('size', product.size)
            if (product.category) formData.append('category', product.category)
            if (product.price !== undefined) formData.append('price', String(product.price))
            if (product.stockQuantity !== undefined) formData.append('stockQuantity', String(product.stockQuantity))
            if (product.isActive !== undefined) formData.append('isActive', String(product.isActive))
            if (product.removePhotos) formData.append('removePhotos', JSON.stringify(product.removePhotos))
            
            photos.forEach((file) => formData.append('photos', file))

            const response = await instance.patch(`products/${id}`, formData, {
                headers: { 'Content-Type': 'multipart/form-data' }
            })
            return response
        } else {
            // Если файлов нет, отправляем JSON с числовыми значениями
            const jsonData: Partial<UpdateProductRequest> = {}
            
            if (product.productId) jsonData.productId = product.productId
            if (product.name) jsonData.name = product.name
            if (product.description) jsonData.description = product.description
            if (product.size) jsonData.size = product.size
            if (product.category) jsonData.category = product.category
            if (product.price !== undefined) jsonData.price = Number(product.price)
            if (product.stockQuantity !== undefined) jsonData.stockQuantity = Number(product.stockQuantity)
            if (product.isActive !== undefined) jsonData.isActive = product.isActive
            if (product.removePhotos) jsonData.removePhotos = product.removePhotos

            const response = await instance.patch(`products/${id}`, jsonData, {
                headers: { 'Content-Type': 'application/json' }
            })
            return response
        }
    },

    // async DeleteProduct(id: string): Promise<AxiosResponse<{ deleted: boolean, folderDeleted: boolean }>> {
    //     const response = await instance.delete(`products/${id}`)
    //     return response
    // }
}