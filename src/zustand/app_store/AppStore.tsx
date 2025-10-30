import { create } from 'zustand';
import { immer } from 'zustand/middleware/immer';
import { UserType, useUserStore } from '../user_store/UserStore';
import { useCartStore } from '../cart_store/CartStore';
import { AxiosError } from 'axios';
import { HandleError } from '@/features/HandleError';



export type StatusType = 'idle' | 'loading' | 'success' | 'failed';

type AppStateType = {
    error: null | string;
    status: StatusType;
    initialized: boolean;
    setStatus: (status: StatusType) => void;
    setError: (error: null | string) => void;
    initializeApp: (user: UserType) => Promise<void>;
};

export const useAppStore = create<AppStateType>()(
    immer((set, get) => ({
        error: null,
        status: 'success',
        initialized: false,
        setStatus: (status: StatusType) => set((state) => {
            state.status = status;
        }),
        setError: (error: null | string) => set((state) => {
            state.error = error;
        }),
        initializeApp: async (user: UserType) => {
            const { initialUser } = useUserStore.getState();
            const { getCart } = useCartStore.getState();
            const { initialized } = get();

            // Не инициализируем повторно если уже инициализировано
            if (initialized) {
                console.log('🚫 App already initialized, skipping...');
                return;
            }

            try {
                console.log('🚀 Initializing app with user:', user);

                // Инициализируем пользователя
                await initialUser(user);

                // Получаем обновленного пользователя с _id
                const { user: updatedUser } = useUserStore.getState();

                // Загружаем корзину если пользователь имеет _id
                if (updatedUser._id) {
                    console.log('🛒 Loading cart for user:', updatedUser._id);
                    await getCart(updatedUser._id);
                }

                set((state) => { state.initialized = true; });
                console.log('✅ App initialized successfully');
            } catch (error) {
                const err = error as Error | AxiosError;
                HandleError(err);
                set((state) => { state.status = "failed"; });
                console.error('❌ App initialization failed:', err);
            }
        }
    }))
);