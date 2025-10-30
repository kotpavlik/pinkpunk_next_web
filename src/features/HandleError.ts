import axios from "axios";
import { useAppStore } from "../zustand/app_store/AppStore";

export const HandleError = (err: unknown): string => {
    const { setError } = useAppStore.getState();
    let errorMessage: string;

    if (axios.isAxiosError(err)) {
        // Axios ошибка - пытаемся достать сообщение из response
        errorMessage = err.response?.data?.message 
            || err.response?.data?.error 
            || err.message 
            || 'Произошла ошибка при запросе';
    } else if (err instanceof Error) {
        // Обычная JS ошибка
        errorMessage = err.message;
    } else if (typeof err === 'string') {
        // Строка
        errorMessage = err;
    } else {
        // Неизвестный тип
        errorMessage = 'Произошла неизвестная ошибка';
    }

    setError(errorMessage);
    return errorMessage;
}