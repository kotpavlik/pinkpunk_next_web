import { useCallback } from "react";
import { RequestProductType, UpdateProductRequest, ProductResponse } from "@/api/ProductApi";
import { useProductsStore } from "@/zustand/products_store/ProductsStore";
import { useAppStore } from "@/zustand/app_store/AppStore";
import { ProductApi } from "@/api/ProductApi";

type SubmissionResult = {
    success: boolean;
    error?: string;
};

export const useProductSubmission = () => {
    const { updateProduct } = useProductsStore();
    const { setStatus } = useAppStore();

    const createProduct = useCallback(async (formData: RequestProductType): Promise<SubmissionResult> => {
        try {
            setStatus('loading');
            const response = await ProductApi.CreateProduct(formData);
            
            if (response) {
                setStatus('success');
                return { success: true };
            }
            
            return { success: false, error: 'Не удалось создать продукт' };
        } catch (error) {
            setStatus('failed');
            const errorMessage = error instanceof Error ? error.message : 'Ошибка при создании продукта';
            return { success: false, error: errorMessage };
        }
    }, [setStatus]);

    const updateProductData = useCallback(async (
        productId: string,
        formData: RequestProductType,
        photosToRemove: string[]
    ): Promise<SubmissionResult> => {
        try {
            setStatus('loading');
            
            const updateData: UpdateProductRequest = {
                productId: formData.productId,
                name: formData.name,
                description: formData.description,
                size: formData.size,
                category: formData.category,
                price: formData.price,
                stockQuantity: formData.stockQuantity,
                isActive: formData.isActive,
            };

            if (photosToRemove.length > 0) {
                updateData.removePhotos = photosToRemove;
            }

            await updateProduct(
                productId,
                updateData,
                formData.photos.length > 0 ? formData.photos : undefined
            );

            setStatus('success');
            return { success: true };
        } catch (error) {
            setStatus('failed');
            const errorMessage = error instanceof Error ? error.message : 'Ошибка при обновлении продукта';
            return { success: false, error: errorMessage };
        }
    }, [updateProduct, setStatus]);

    return {
        createProduct,
        updateProductData,
    };
};

