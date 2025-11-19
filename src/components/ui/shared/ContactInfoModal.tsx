'use client'

import { useEffect, useState, useCallback } from 'react'
import { createPortal } from 'react-dom'
import { useRouter } from 'next/navigation'
import { XMarkIcon } from '@heroicons/react/24/outline'
import * as yup from 'yup'
import { useUserStore, ShippingAddress } from '@/zustand/user_store/UserStore'
import Loader from './Loader'

interface ContactInfoModalProps {
    isOpen: boolean
    onClose: () => void
    type: 'phone' | 'address'
}

export default function ContactInfoModal({
    isOpen,
    onClose,
    type
}: ContactInfoModalProps) {
    const router = useRouter()
    const [mounted, setMounted] = useState(false)
    const [loading, setLoading] = useState(false)
    const [error, setError] = useState<string | null>(null)
    const { user, updateContactInfo } = useUserStore()

    // Состояния для телефона
    const [phoneNumber, setPhoneNumber] = useState('')
    const [phoneNumberError, setPhoneNumberError] = useState<string | undefined>()

    // Состояния для адреса
    const [fullName, setFullName] = useState('')
    const [fullNameError, setFullNameError] = useState<string | undefined>()
    const [phone, setPhone] = useState('')
    const [phoneError, setPhoneError] = useState<string | undefined>()
    const [address, setAddress] = useState('')
    const [addressError, setAddressError] = useState<string | undefined>()
    const [city, setCity] = useState('')
    const [cityError, setCityError] = useState<string | undefined>()
    const [postalCode, setPostalCode] = useState('')
    const [postalCodeError, setPostalCodeError] = useState<string | undefined>()
    const [country, setCountry] = useState('')
    const [countryError, setCountryError] = useState<string | undefined>()
    const [notes, setNotes] = useState('')
    const [notesError, setNotesError] = useState<string | undefined>()

    // Схема валидации для номера телефона
    const phoneSchema = yup.object().shape({
        phoneNumber: yup
            .string()
            .required('Номер телефона обязателен')
            .matches(/^\+\d{1,4}\d{6,14}$/, 'Номер должен быть в международном формате +XXXXXXXXX')
            .test('phone-format', 'Некорректный формат номера телефона', value => {
                if (!value) return false;
                // Убираем + и проверяем что остались только цифры
                const digits = value.replace('+', '');
                // Проверяем что номер содержит от 7 до 15 цифр (международный стандарт)
                return /^\d{7,15}$/.test(digits);
            }),
    })

    // Схема валидации для адреса доставки
    const addressSchema = yup.object().shape({
        fullName: yup
            .string()
            .required('ФИО обязательно')
            .min(3, 'ФИО должно содержать минимум 3 символа')
            .test('min-words', 'ФИО должно содержать минимум Имя и Фамилию', value => {
                if (!value) return false;
                const words = value.trim().split(/\s+/).filter(word => word.length > 0);
                return words.length >= 2;
            })
            .matches(/^[а-яА-ЯёЁa-zA-Z\s\-'\.]+$/, 'ФИО может содержать только буквы, пробелы, дефисы, апострофы и точки'),
        phone: yup
            .string()
            .required('Номер телефона обязателен')
            .matches(/^\+\d{1,4}\d{6,14}$/, 'Номер должен быть в международном формате +XXXXXXXXX')
            .test('phone-format', 'Некорректный формат номера телефона', value => {
                if (!value) return false;
                const digits = value.replace('+', '');
                return /^\d{7,15}$/.test(digits);
            }),
        address: yup
            .string()
            .required('Адрес обязателен')
            .min(5, 'Адрес должен содержать минимум 5 символов')
            .max(200, 'Адрес не должен превышать 200 символов')
            .matches(/^[а-яА-ЯёЁa-zA-Z0-9\s\-\.,\/]+$/, 'Адрес содержит недопустимые символы'),
        city: yup
            .string()
            .required('Город обязателен')
            .min(2, 'Название города должно содержать минимум 2 символа')
            .max(100, 'Название города не должно превышать 100 символов')
            .matches(/^[а-яА-ЯёЁa-zA-Z\s\-'\.]+$/, 'Название города может содержать только буквы, пробелы, дефисы, апострофы и точки'),
        postalCode: yup
            .string()
            .required('Индекс обязателен')
            .matches(/^\d{4,10}$/, 'Индекс должен содержать от 4 до 10 цифр'),
        country: yup
            .string()
            .required('Страна обязательна')
            .min(2, 'Название страны должно содержать минимум 2 символа')
            .max(100, 'Название страны не должно превышать 100 символов')
            .matches(/^[а-яА-ЯёЁa-zA-Z\s\-'\.]+$/, 'Название страны может содержать только буквы, пробелы, дефисы, апострофы и точки'),
        notes: yup
            .string()
            .max(500, 'Примечания не должны превышать 500 символов'),
    })

    // Функция для форматирования номера телефона
    const formatPhoneNumber = useCallback((value: string) => {
        // Убираем все кроме цифр и +
        let cleanValue = value.replace(/[^\d+]/g, '');

        // Убираем все плюсы кроме первого
        const plusCount = (cleanValue.match(/\+/g) || []).length;
        if (plusCount > 1) {
            // Оставляем только первый плюс
            cleanValue = '+' + cleanValue.replace(/\+/g, '');
        }

        // Если уже есть + в начале, работаем с ним
        if (cleanValue.startsWith('+')) {
            // Убираем все плюсы после первого символа
            const afterPlus = cleanValue.slice(1).replace(/\+/g, '');
            cleanValue = '+' + afterPlus;
            return cleanValue;
        }

        // Убираем все кроме цифр
        const digits = cleanValue.replace(/\D/g, '');
        // Если пустая строка, возвращаем +
        if (digits.length === 0) {
            return '+';
        }
        // Если номер начинается с 80 (Беларусь), заменяем на 375
        if (digits.startsWith('80') && digits.length >= 11) {
            return `+375${digits.slice(2)}`;
        }
        // Если номер начинается с 8 (Россия/Беларусь), заменяем на 7 или 375
        if (digits.startsWith('8') && digits.length >= 11) {
            // Если 11 цифр, то это российский номер
            if (digits.length === 11) {
                return `+7${digits.slice(1)}`;
            }
            // Если больше 11, то белорусский
            return `+375${digits.slice(1)}`;
        }
        // Если номер начинается с 7 (Россия), добавляем +
        if (digits.startsWith('7') && digits.length >= 11) {
            return `+${digits}`;
        }
        // Если номер начинается с 375 (Беларусь), добавляем +
        if (digits.startsWith('375') && digits.length >= 12) {
            return `+${digits}`;
        }
        // Для других случаев просто добавляем +
        return `+${digits}`;
    }, [])

    // Функция валидации поля
    const validateField = useCallback(async (fieldName: string, value: string) => {
        try {
            // Выбираем схему в зависимости от типа формы и поля
            const schema = type === 'phone' ? phoneSchema : addressSchema;
            await schema.validateAt(fieldName, { [fieldName]: value });
            return null;
        } catch (error) {
            if (error instanceof yup.ValidationError) {
                return error.message;
            }
            return 'Ошибка валидации';
        }
    }, [phoneSchema, addressSchema, type])

    useEffect(() => {
        setMounted(true)
    }, [])

    // Заполняем форму существующими данными при открытии и сбрасываем при закрытии
    useEffect(() => {
        if (isOpen) {
            if (type === 'phone') {
                // Заполняем поле телефона существующим значением
                if (user.userPhoneNumber) {
                    setPhoneNumber(user.userPhoneNumber)
                } else {
                    setPhoneNumber('')
                }
                setPhoneNumberError(undefined)
                setError(null)
            } else if (type === 'address') {
                if (user.shippingAddress) {
                    // Редактирование: заполняем все поля существующими данными из адреса
                    const addr = user.shippingAddress
                    setFullName(addr.fullName || '')
                    // Используем телефон из адреса, если он есть, иначе из userPhoneNumber
                    setPhone(addr.phone || user.userPhoneNumber || '')
                    setAddress(addr.address || '')
                    setCity(addr.city || '')
                    setPostalCode(addr.postalCode || '')
                    setCountry(addr.country || '')
                    setNotes(addr.notes || '')
                } else {
                    // Создание нового: сбрасываем все поля, но подставляем телефон если есть
                    setFullName('')
                    setAddress('')
                    setCity('')
                    setPostalCode('')
                    setCountry('')
                    setNotes('')
                    // Если есть сохраненный номер телефона, подставляем его
                    setPhone(user.userPhoneNumber || '')
                }
                // Сбрасываем ошибки
                setFullNameError(undefined)
                setPhoneError(undefined)
                setAddressError(undefined)
                setCityError(undefined)
                setPostalCodeError(undefined)
                setCountryError(undefined)
                setNotesError(undefined)
                setError(null)
            }
        } else {
            // При закрытии модального окна сбрасываем все поля
            setPhoneNumber('')
            setFullName('')
            setPhone('')
            setAddress('')
            setCity('')
            setPostalCode('')
            setCountry('')
            setNotes('')
            setPhoneNumberError(undefined)
            setFullNameError(undefined)
            setPhoneError(undefined)
            setAddressError(undefined)
            setCityError(undefined)
            setPostalCodeError(undefined)
            setCountryError(undefined)
            setNotesError(undefined)
            setError(null)
        }
    }, [isOpen, type, user.userPhoneNumber, user.shippingAddress])

    // Обработчик изменения номера телефона (для userPhoneNumber)
    const handlePhoneNumberChange = useCallback(async (e: React.ChangeEvent<HTMLInputElement>) => {
        const value = e.target.value;
        const formatted = formatPhoneNumber(value);
        setPhoneNumber(formatted);
        // Валидация номера
        const error = await validateField('phoneNumber', formatted);
        setPhoneNumberError(error || undefined);
    }, [formatPhoneNumber, validateField])

    // Обработчик изменения телефона в адресе
    const handlePhoneChange = useCallback(async (e: React.ChangeEvent<HTMLInputElement>) => {
        const value = e.target.value;
        const formatted = formatPhoneNumber(value);
        setPhone(formatted);
        // Валидация номера
        const error = await validateField('phone', formatted);
        setPhoneError(error || undefined);
    }, [formatPhoneNumber, validateField])

    // Обработчик изменения ФИО
    const handleFullNameChange = useCallback(async (e: React.ChangeEvent<HTMLInputElement>) => {
        const value = e.target.value;
        setFullName(value);
        // Валидация ФИО
        const error = await validateField('fullName', value);
        setFullNameError(error || undefined);
    }, [validateField])

    // Обработчик изменения адреса
    const handleAddressChange = useCallback(async (e: React.ChangeEvent<HTMLInputElement>) => {
        const value = e.target.value;
        setAddress(value);
        // Валидация адреса
        const error = await validateField('address', value);
        setAddressError(error || undefined);
    }, [validateField])

    // Обработчик изменения города
    const handleCityChange = useCallback(async (e: React.ChangeEvent<HTMLInputElement>) => {
        const value = e.target.value;
        setCity(value);
        // Валидация города
        const error = await validateField('city', value);
        setCityError(error || undefined);
    }, [validateField])

    // Обработчик изменения индекса
    const handlePostalCodeChange = useCallback(async (e: React.ChangeEvent<HTMLInputElement>) => {
        const value = e.target.value.replace(/\D/g, ''); // Только цифры
        setPostalCode(value);
        // Валидация индекса
        const error = await validateField('postalCode', value);
        setPostalCodeError(error || undefined);
    }, [validateField])

    // Обработчик изменения страны
    const handleCountryChange = useCallback(async (e: React.ChangeEvent<HTMLInputElement>) => {
        const value = e.target.value;
        setCountry(value);
        // Валидация страны
        const error = await validateField('country', value);
        setCountryError(error || undefined);
    }, [validateField])

    // Обработчик изменения примечаний
    const handleNotesChange = useCallback(async (e: React.ChangeEvent<HTMLTextAreaElement>) => {
        const value = e.target.value;
        if (value.length <= 500) {
            setNotes(value);
            // Валидация примечаний
            const error = await validateField('notes', value);
            setNotesError(error || undefined);
        }
    }, [validateField])

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault()
        setLoading(true)
        setError(null)

        try {
            if (type === 'phone') {
                // Валидация перед отправкой
                const validationError = await validateField('phoneNumber', phoneNumber.trim())
                if (validationError) {
                    setPhoneNumberError(validationError)
                    setError(validationError)
                    setLoading(false)
                    return
                }

                if (!phoneNumber.trim()) {
                    setError('Пожалуйста, введите номер телефона')
                    setLoading(false)
                    return
                }

                // Вызываем функцию из UserStore для обновления контактной информации
                const result = await updateContactInfo({
                    userPhoneNumber: phoneNumber.trim()
                })

                if (result.success) {
                    onClose()
                } else {
                    setError(result.error || 'Ошибка при сохранении номера телефона')

                    // Если сессия истекла, перенаправляем на главную
                    if (result.error?.includes('Сессия истекла')) {
                        setTimeout(() => {
                            onClose()
                            router.push('/')
                        }, 2000)
                    }
                }
            } else {
                // Валидация всех полей адреса
                const validationErrors: string[] = []

                // Валидация ФИО
                const fullNameError = await validateField('fullName', fullName.trim())
                if (fullNameError) {
                    setFullNameError(fullNameError)
                    validationErrors.push(fullNameError)
                }

                // Валидация телефона
                const phoneValidationError = await validateField('phone', phone.trim())
                if (phoneValidationError) {
                    setPhoneError(phoneValidationError)
                    validationErrors.push(phoneValidationError)
                }

                // Валидация адреса
                const addressValidationError = await validateField('address', address.trim())
                if (addressValidationError) {
                    setAddressError(addressValidationError)
                    validationErrors.push(addressValidationError)
                }

                // Валидация города
                const cityValidationError = await validateField('city', city.trim())
                if (cityValidationError) {
                    setCityError(cityValidationError)
                    validationErrors.push(cityValidationError)
                }

                // Валидация индекса
                const postalCodeValidationError = await validateField('postalCode', postalCode.trim())
                if (postalCodeValidationError) {
                    setPostalCodeError(postalCodeValidationError)
                    validationErrors.push(postalCodeValidationError)
                }

                // Валидация страны
                const countryValidationError = await validateField('country', country.trim())
                if (countryValidationError) {
                    setCountryError(countryValidationError)
                    validationErrors.push(countryValidationError)
                }

                // Валидация примечаний
                if (notes.trim()) {
                    const notesValidationError = await validateField('notes', notes.trim())
                    if (notesValidationError) {
                        setNotesError(notesValidationError)
                        validationErrors.push(notesValidationError)
                    }
                }

                if (validationErrors.length > 0) {
                    setError(validationErrors[0])
                    setLoading(false)
                    return
                }

                const shippingAddress: ShippingAddress = {
                    fullName: fullName.trim(),
                    phone: phone.trim(),
                    address: address.trim(),
                    city: city.trim(),
                    postalCode: postalCode.trim(),
                    country: country.trim(),
                    notes: notes.trim() || undefined
                }

                // Вызываем функцию из UserStore для обновления контактной информации
                const result = await updateContactInfo({
                    shippingAddress
                })

                if (result.success) {
                    onClose()
                } else {
                    setError(result.error || 'Ошибка при сохранении адреса доставки')

                    // Если сессия истекла, перенаправляем на главную
                    if (result.error?.includes('Сессия истекла')) {
                        setTimeout(() => {
                            onClose()
                            router.push('/')
                        }, 2000)
                    }
                }
            }
        } catch (err) {
            const errorMessage = err instanceof Error ? err.message : 'Ошибка при сохранении данных'
            setError(errorMessage)
        } finally {
            setLoading(false)
        }
    }

    if (!mounted || !isOpen) {
        return null
    }

    const modalContent = (
        <div
            className="fixed inset-0 flex items-center justify-center bg-black/60 backdrop-blur-md transition-opacity duration-300 z-50"
            onClick={(e) => {
                if (e.target === e.currentTarget) {
                    onClose()
                }
            }}
        >
            <div
                className="relative bg-gradient-to-br from-white/10 via-white/5 to-white/10 backdrop-blur-2xl rounded-3xl border border-white/20 shadow-2xl max-w-md w-full mx-4 max-h-[90vh] flex flex-col"
                style={{
                    background: 'linear-gradient(135deg, rgba(255, 255, 255, 0.1) 0%, rgba(255, 255, 255, 0.05) 50%, rgba(255, 255, 255, 0.1) 100%)',
                    backdropFilter: 'blur(30px) saturate(180%)',
                    WebkitBackdropFilter: 'blur(30px) saturate(180%)',
                    boxShadow: '0 20px 60px rgba(0, 0, 0, 0.5), 0 0 0 1px rgba(255, 255, 255, 0.1)',
                }}
                onClick={(e) => e.stopPropagation()}
            >
                {/* Loader поверх контента при сохранении */}
                {loading && (
                    <div className="absolute inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm rounded-3xl">
                        <Loader fullScreen showText />
                    </div>
                )}
                {/* Фиксированный заголовок и кнопка закрытия */}
                <div className="flex-shrink-0 p-6  ">
                    {/* Кнопка закрытия */}
                    <button
                        onClick={onClose}
                        className="absolute top-4 right-4 text-white/70 hover:text-white transition-colors z-10"
                        aria-label="Закрыть"
                    >
                        <XMarkIcon className="h-6 w-6" />
                    </button>

                    {/* Заголовок */}
                    <div className="mb-0">
                        <div className="inline-block relative">
                            <h2 className="text-2xl font-bold font-durik text-[var(--pink-punk)] mb-2">
                                {type === 'phone' ? 'Номер телефона' : 'Адрес доставки'}
                            </h2>
                            <div className="h-1 w-full bg-[var(--pink-punk)] absolute bottom-0 left-0"></div>
                        </div>
                    </div>
                </div>

                {/* Скроллируемая область с формой */}
                <div className="flex-1 overflow-y-auto px-6 md:px-8 mt-4 pb-2">
                    <form id="contact-info-form" onSubmit={handleSubmit} className="space-y-4">
                        {type === 'phone' ? (
                            <div>
                                <label htmlFor="phoneNumber" className="block text-sm font-medium text-white/80 mb-2">
                                    Номер телефона *
                                </label>
                                <div className="relative">
                                <input
                                    type="tel"
                                    id="phoneNumber"
                                    value={phoneNumber}
                                    onChange={handlePhoneNumberChange}
                                    placeholder="+375 (XX) XXX-XX-XX"
                                    className={`w-full px-4 py-3 bg-white/10 border rounded-lg text-white placeholder-white/50 focus:outline-none transition-all ${phoneNumberError
                                        ? 'border-red-500 focus:ring-2 focus:ring-red-500'
                                        : 'border-white/20 focus:ring-2 focus:ring-[var(--mint-bright)] focus:border-transparent'
                                        }`}
                                    required
                                    disabled={loading}
                                />
                                {phoneNumberError && (
                                        <p className="absolute top-full left-0 right-0 text-red-400 text-xs px-2 py-1 bg-black/80 backdrop-blur-sm animate-slideDown z-10">
                                            {phoneNumberError}
                                        </p>
                                )}
                                </div>
                            </div>
                        ) : (
                            <>
                                <div>
                                    <label htmlFor="fullName" className="block text-sm font-medium text-white/80 mb-2">
                                        ФИО *
                                    </label>
                                    <div className="relative">
                                    <input
                                        type="text"
                                        id="fullName"
                                        value={fullName}
                                        onChange={handleFullNameChange}
                                        placeholder="Дуров Павел Валерьевич"
                                        className={`w-full px-4 py-3 bg-white/10 border rounded-lg text-white placeholder-white/50 focus:outline-none transition-all ${fullNameError
                                            ? 'border-red-500 focus:ring-2 focus:ring-red-500'
                                            : 'border-white/20 focus:ring-2 focus:ring-[var(--pink-punk)] focus:border-transparent'
                                            }`}
                                        required
                                        disabled={loading}
                                    />
                                    {fullNameError && (
                                            <p className="absolute top-full left-0 right-0 text-red-400 text-xs px-2 py-1 bg-black/80 backdrop-blur-sm animate-slideDown z-10">
                                                {fullNameError}
                                            </p>
                                    )}
                                    </div>
                                </div>
                                <div>
                                    <label htmlFor="phone" className="block text-sm font-medium text-white/80 mb-2">
                                        Телефон *
                                    </label>
                                    <div className="relative">
                                    <input
                                        type="tel"
                                        id="phone"
                                        value={phone}
                                        onChange={handlePhoneChange}
                                        placeholder="+375 (XX) XXX-XX-XX"
                                        className={`w-full px-4 py-3 bg-white/10 border rounded-lg text-white placeholder-white/50 focus:outline-none transition-all ${phoneError
                                            ? 'border-red-500 focus:ring-2 focus:ring-red-500'
                                            : 'border-white/20 focus:ring-2 focus:ring-[var(--pink-punk)] focus:border-transparent'
                                            }`}
                                        required
                                        disabled={loading}
                                    />
                                    {phoneError && (
                                            <p className="absolute top-full left-0 right-0 text-red-400 text-xs px-2 py-1 bg-black/80 backdrop-blur-sm animate-slideDown z-10">
                                                {phoneError}
                                            </p>
                                    )}
                                    </div>
                                </div>
                                <div>
                                    <label htmlFor="address" className="block text-sm font-medium text-white/80 mb-2">
                                        Адрес *
                                    </label>
                                    <div className="relative">
                                    <input
                                        type="text"
                                        id="address"
                                        value={address}
                                        onChange={handleAddressChange}
                                        placeholder="Улица, дом, квартира"
                                        className={`w-full px-4 py-3 bg-white/10 border rounded-lg text-white placeholder-white/50 focus:outline-none transition-all ${addressError
                                            ? 'border-red-500 focus:ring-2 focus:ring-red-500'
                                            : 'border-white/20 focus:ring-2 focus:ring-[var(--pink-punk)] focus:border-transparent'
                                            }`}
                                        required
                                        disabled={loading}
                                    />
                                    {addressError && (
                                            <p className="absolute top-full left-0 right-0 text-red-400 text-xs px-2 py-1 bg-black/80 backdrop-blur-sm animate-slideDown z-10">
                                                {addressError}
                                            </p>
                                    )}
                                    </div>
                                </div>
                                <div className="grid grid-cols-2 gap-4">
                                    <div>
                                        <label htmlFor="city" className="block text-sm font-medium text-white/80 mb-2">
                                            Город *
                                        </label>
                                        <div className="relative">
                                        <input
                                            type="text"
                                            id="city"
                                            value={city}
                                            onChange={handleCityChange}
                                            placeholder="Минск"
                                            className={`w-full px-4 py-3 bg-white/10 border rounded-lg text-white placeholder-white/50 focus:outline-none transition-all ${cityError
                                                ? 'border-red-500 focus:ring-2 focus:ring-red-500'
                                                : 'border-white/20 focus:ring-2 focus:ring-[var(--pink-punk)] focus:border-transparent'
                                                }`}
                                            required
                                            disabled={loading}
                                        />
                                        {cityError && (
                                                <p className="absolute top-full left-0 right-0 text-red-400 text-xs px-2 py-1 bg-black/80 backdrop-blur-sm animate-slideDown z-10">
                                                    {cityError}
                                                </p>
                                        )}
                                        </div>
                                    </div>
                                    <div>
                                        <label htmlFor="postalCode" className="block text-sm font-medium text-white/80 mb-2">
                                            Индекс *
                                        </label>
                                        <div className="relative">
                                        <input
                                            type="text"
                                            id="postalCode"
                                            value={postalCode}
                                            onChange={handlePostalCodeChange}
                                            placeholder="220000"
                                            className={`w-full px-4 py-3 bg-white/10 border rounded-lg text-white placeholder-white/50 focus:outline-none transition-all ${postalCodeError
                                                ? 'border-red-500 focus:ring-2 focus:ring-red-500'
                                                : 'border-white/20 focus:ring-2 focus:ring-[var(--pink-punk)] focus:border-transparent'
                                                }`}
                                            required
                                            disabled={loading}
                                        />
                                        {postalCodeError && (
                                                <p className="absolute top-full left-0 right-0 text-red-400 text-xs px-2 py-1 bg-black/80 backdrop-blur-sm animate-slideDown z-10">
                                                    {postalCodeError}
                                                </p>
                                        )}
                                        </div>
                                    </div>
                                </div>
                                <div>
                                    <label htmlFor="country" className="block text-sm font-medium text-white/80 mb-2">
                                        Страна *
                                    </label>
                                    <div className="relative">
                                    <input
                                        type="text"
                                        id="country"
                                        value={country}
                                        onChange={handleCountryChange}
                                        placeholder="Беларусь"
                                        className={`w-full px-4 py-3 bg-white/10 border rounded-lg text-white placeholder-white/50 focus:outline-none transition-all ${countryError
                                            ? 'border-red-500 focus:ring-2 focus:ring-red-500'
                                            : 'border-white/20 focus:ring-2 focus:ring-[var(--pink-punk)] focus:border-transparent'
                                            }`}
                                        required
                                        disabled={loading}
                                    />
                                    {countryError && (
                                            <p className="absolute top-full left-0 right-0 text-red-400 text-xs px-2 py-1 bg-black/80 backdrop-blur-sm animate-slideDown z-10">
                                                {countryError}
                                            </p>
                                    )}
                                    </div>
                                </div>
                                <div>
                                    <div className="flex items-center justify-between mb-2">
                                        <label htmlFor="notes" className="block text-sm font-medium text-white/80">
                                            Примечания (необязательно)
                                        </label>
                                        <span className={`text-xs ${notes.length > 500 ? 'text-red-400' : 'text-white/50'}`}>
                                            {notes.length}/500
                                        </span>
                                    </div>
                                    <div className="relative">
                                    <textarea
                                        id="notes"
                                        value={notes}
                                        onChange={handleNotesChange}
                                        placeholder="Например: Нужна доставка на Европочту или СДЕК"
                                        rows={3}
                                        className={`w-full px-4 py-3 bg-white/10 border rounded-lg text-white placeholder-white/50 focus:outline-none transition-all resize-none ${notesError
                                            ? 'border-red-500 focus:ring-2 focus:ring-red-500'
                                            : 'border-white/20 focus:ring-2 focus:ring-[var(--pink-punk)] focus:border-transparent'
                                            }`}
                                        disabled={loading}
                                    />
                                    {notesError && (
                                            <p className="absolute top-full left-0 right-0 text-red-400 text-xs px-2 py-1 bg-black/80 backdrop-blur-sm animate-slideDown z-10">
                                                {notesError}
                                            </p>
                                    )}
                                    </div>
                                </div>
                            </>
                        )}

                        {error && (
                            <div className="bg-red-500/20 border border-red-500/50 rounded-lg p-3 text-red-200 text-sm">
                                {error}
                            </div>
                        )}
                    </form>
                </div>

                {/* Фиксированные кнопки внизу */}
                <div className="flex-shrink-0 px-6 md:px-8 pb-6 md:pb-8 pt-8 ">
                    <div className="flex gap-3">
                        <button
                            type="button"
                            onClick={onClose}
                            className="flex-1 px-4 py-3 bg-white/10 hover:bg-white/20 text-white rounded-lg font-medium transition-all disabled:opacity-50"
                            disabled={loading}
                        >
                            Отмена
                        </button>
                        <button
                            type="submit"
                            form="contact-info-form"
                            className="flex-1 px-4 py-3 bg-[var(--pink-punk)] hover:bg-[var(--pink-punk)]/80 text-white rounded-lg font-bold transition-all transform disabled:opacity-50 disabled:cursor-not-allowed"
                            disabled={loading}
                        >
                            {loading ? 'Сохранение...' : 'Сохранить'}
                        </button>
                    </div>
                </div>
            </div>
        </div>
    )

    return createPortal(modalContent, document.body)
}

