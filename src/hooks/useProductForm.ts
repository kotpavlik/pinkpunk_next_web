import { useState, useEffect, useCallback } from "react";
import * as yup from 'yup';
import { RequestProductType, ProductResponse } from "@/api/ProductApi";

const createProductSchema = (isEditMode: boolean) => yup.object().shape({
    productId: yup
        .string()
        .required('ProductId обязателен')
        .min(3, 'ProductId должен содержать минимум 3 символа')
        .max(25, 'ProductId не должен превышать 25 символов')
        .matches(/^[a-zA-Z0-9]+$/, 'ProductId может содержать только латиницу и цифры')
        .test('no-spaces', 'ProductId не должен содержать пробелы', value => !value?.includes(' ')),
    name: yup
        .string()
        .required('Название обязательно')
        .min(3, 'Название должно содержать минимум 3 символа')
        .max(25, 'Название не должно превышать 25 символов'),
    description: yup
        .string()
        .max(100, 'Описание не должно превышать 100 символов'),
    price: yup
        .number()
        .required('Цена обязательна')
        .positive('Цена должна быть положительной')
        .integer('Цена должна быть целым числом')
        .max(99999, 'Цена не должна превышать 5 цифр'),
    category: yup
        .string()
        .required('Выберите категорию'),
    size: yup
        .string()
        .oneOf(['s', 'm', 'l', 'xl'], 'Неверный размер')
        .required('Размер обязателен'),
    stockQuantity: yup
        .number()
        .min(0, 'Количество не может быть отрицательным')
        .integer('Количество должно быть целым числом'),
    photos: isEditMode
        ? yup.array() // При редактировании фото не обязательны
        : yup
            .array()
            .min(3, 'Нужно выбрать минимум 3 фото')
            .required('Фотографии обязательны')
});

export const useProductForm = (product?: ProductResponse | null) => {
    const isEditMode = !!product;

    const [form, setForm] = useState<RequestProductType>({
        productId: "",
        name: "",
        description: "",
        size: "s",
        stockQuantity: 0,
        price: 0,
        category: "",
        isActive: true,
        photos: []
    });

    const [existingPhotos, setExistingPhotos] = useState<string[]>([]);
    const [photosToRemove, setPhotosToRemove] = useState<string[]>([]);
    const [errors, setErrors] = useState<{ [key: string]: string | undefined }>({});
    const [processingPhotos, setProcessingPhotos] = useState(false);

    // Инициализация формы при редактировании
    useEffect(() => {
        if (product && isEditMode) {
            // Обрабатываем category - может быть объектом или строкой
            const categoryId = typeof product.category === 'string'
                ? product.category
                : product.category?._id || "";

            setForm({
                productId: product.productId || "",
                name: product.name || "",
                description: product.description || "",
                size: product.size || "s",
                stockQuantity: product.stockQuantity || 0,
                price: product.price || 0,
                category: categoryId,
                isActive: product.isActive !== undefined ? product.isActive : true,
                photos: []
            });
            setExistingPhotos(product.photos || []);
            setPhotosToRemove([]);
        } else {
            // Сброс формы при создании
            setForm({
                productId: "",
                name: "",
                description: "",
                size: "s",
                stockQuantity: 0,
                price: 0,
                category: "",
                isActive: true,
                photos: []
            });
            setExistingPhotos([]);
            setPhotosToRemove([]);
        }
    }, [product, isEditMode]);

    // Валидация отдельного поля
    const validateField = useCallback(async (fieldName: string, value: string | number | File[]) => {
        try {
            const schema = createProductSchema(isEditMode);
            await schema.validateAt(fieldName, { [fieldName]: value });
            return null;
        } catch (error) {
            if (error instanceof yup.ValidationError) {
                return error.message;
            }
            return 'Ошибка валидации';
        }
    }, [isEditMode]);

    // Валидация всей формы
    const validateForm = useCallback(async (): Promise<{ isValid: boolean; errors: { [key: string]: string | undefined } }> => {
        try {
            const schema = createProductSchema(isEditMode);
            await schema.validate(form, { abortEarly: false });
            return { isValid: true, errors: {} };
        } catch (error) {
            if (error instanceof yup.ValidationError) {
                const yupErrors: { [key: string]: string } = {};
                error.inner.forEach((err) => {
                    if (err.path) {
                        yupErrors[err.path] = err.message;
                    }
                });
                return { isValid: false, errors: yupErrors };
            }
            return { isValid: false, errors: { general: 'Ошибка валидации' } };
        }
    }, [form, isEditMode]);

    // Обработка изменения полей
    const handleChange = useCallback(async (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => {
        const { name, value } = e.target;

        if (name === 'price' || name === 'stockQuantity') {
            const numeric = Number(value);
            setForm(prev => ({ ...prev, [name]: isNaN(numeric) ? 0 : numeric }));
            const error = await validateField(name, numeric);
            setErrors(prev => ({ ...prev, [name]: error || undefined }));
        } else {
            setForm(prev => ({ ...prev, [name]: value }));
            const error = await validateField(name, value);
            setErrors(prev => ({ ...prev, [name]: error || undefined }));
        }
    }, [validateField]);

    // Обработка загрузки файлов
    const handleFiles = useCallback(async (e: React.ChangeEvent<HTMLInputElement>) => {
        const files = Array.from(e.target.files || []);
        if (files.length === 0) {
            setForm(prev => ({ ...prev, photos: [] }));
            return;
        }

        // Проверка типа файла
        const invalidTypeFiles = files.filter(file => {
            const validTypes = ['image/jpeg', 'image/png', 'image/webp'];
            return !validTypes.includes(file.type);
        });

        if (invalidTypeFiles.length > 0) {
            setErrors({ photos: `Неподдерживаемые форматы: ${invalidTypeFiles.map(f => f.name).join(', ')}. Разрешены только JPEG, PNG, WebP` });
            return;
        }

        setProcessingPhotos(true);
        try {
            // Проверяем размер файлов (максимум 8MB каждый)
            const MAX_SIZE = 8 * 1024 * 1024;
            const largeFiles = files.filter(file => file.size > MAX_SIZE);

            if (largeFiles.length > 0) {
                const fileInfo = largeFiles.map(f => `${f.name} (${(f.size / (1024 * 1024)).toFixed(2)} МБ)`).join(', ');
                setErrors({ photos: `Файлы слишком большие: ${fileInfo}. Максимальный размер: 8 МБ` });
                return;
            }

            setForm(prev => ({ ...prev, photos: files }));
            if (files.length >= 3) {
                setErrors(prev => ({ ...prev, photos: undefined }));
            }
        } catch {
            setErrors({ photos: 'Ошибка при обработке фотографий' });
        } finally {
            setProcessingPhotos(false);
        }
    }, []);

    // Удаление фото
    const handleRemovePhoto = useCallback((photoUrl: string) => {
        setExistingPhotos(prev => prev.filter(p => p !== photoUrl));
        setPhotosToRemove(prev => [...prev, photoUrl]);
    }, []);

    return {
        form,
        setForm,
        existingPhotos,
        photosToRemove,
        errors,
        setErrors,
        processingPhotos,
        isEditMode,
        validateForm,
        validateField,
        handleChange,
        handleFiles,
        handleRemovePhoto,
    };
};

