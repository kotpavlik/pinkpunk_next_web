import { useState } from 'react'
import { useAdminLoginStore } from '@/zustand/admin_login_store/AdminLoginStore'
import { useRouter } from 'next/navigation'

export const useAdminAuth = () => {
    const [isLoading, setIsLoading] = useState(false)
    const { logoutAdmin, logoutAllDevices } = useAdminLoginStore()
    const router = useRouter()

    const logoutDevice = async () => {
        setIsLoading(true)
        try {
            await logoutAdmin()
            router.push('/')
        } catch {
            // Silent error handling
        } finally {
            setIsLoading(false)
        }
    }

    const logoutAllDevicesHandler = async () => {
        setIsLoading(true)
        try {
            await logoutAllDevices()
        } catch {
            setIsLoading(false)
        }
    }

    return {
        logoutDevice,
        logoutAllDevices: logoutAllDevicesHandler,
        isLoading
    }
}

