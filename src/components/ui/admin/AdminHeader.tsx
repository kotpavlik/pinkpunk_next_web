'use client'

import React, { useState, useEffect, useRef } from 'react'
import { createPortal } from 'react-dom'
import { ArrowRightStartOnRectangleIcon } from '@heroicons/react/24/outline'
import { useAdminAuth } from '@/hooks/useAdminAuth'

export default function AdminHeader() {
    const { logoutDevice, logoutAllDevices, isLoading } = useAdminAuth()
    const [showLogoutMenu, setShowLogoutMenu] = useState(false)
    const [mounted, setMounted] = useState(false)
    const buttonRef = useRef<HTMLButtonElement>(null)
    const [menuPosition, setMenuPosition] = useState({ top: 0, right: 0 })

    useEffect(() => {
        setMounted(true)
    }, [])

    useEffect(() => {
        if (showLogoutMenu && buttonRef.current) {
            const rect = buttonRef.current.getBoundingClientRect()
            setMenuPosition({
                top: rect.bottom + 8, // 8px отступ
                right: window.innerWidth - rect.right
            })
        }
    }, [showLogoutMenu])

    const handleLogoutDevice = async () => {
        setShowLogoutMenu(false)
        await logoutDevice()
    }

    const handleLogoutAll = async () => {
        setShowLogoutMenu(false)
        await logoutAllDevices()
    }

    return (
        <header className="bg-white/5 backdrop-blur-md border-b border-white/10 px-6 py-4">
            <div className="flex justify-between items-center">
                <div>
                    <h1 className="text-4xl font-durik font-bold text-[var(--pink-punk)]">
                        Админка
                    </h1>
                    <p className="text-white/70 text-sm mt-1">
                        Управление заказами и товарами
                    </p>
                </div>
                <div>
                    <button
                        ref={buttonRef}
                        onClick={() => setShowLogoutMenu(!showLogoutMenu)}
                        disabled={isLoading}
                        className="relative inline-flex items-center justify-center p-2 rounded-full text-white/50 hover:text-white hover:bg-white/10 backdrop-blur-sm transition-all duration-200 transform hover:scale-105 disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:scale-100"
                        aria-label="Выход"
                    >
                        {isLoading ? (
                            <svg className="h-6 w-6 animate-spin" fill="none" viewBox="0 0 24 24">
                                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                            </svg>
                        ) : (
                            <ArrowRightStartOnRectangleIcon className="h-6 w-6" aria-hidden="true" />
                        )}
                    </button>
                </div>
            </div>
            {mounted && showLogoutMenu && typeof document !== 'undefined' && document.body && createPortal(
                <>
                    {/* Backdrop для закрытия по клику вне меню */}
                    <div
                        className="fixed inset-0 z-[10000]"
                        onClick={() => setShowLogoutMenu(false)}
                    />
                    {/* Само меню */}
                    <div
                        className="fixed w-56 bg-white/10 backdrop-blur-xl border border-white/20 shadow-2xl rounded-lg z-[10001]"
                        style={{
                            top: `${menuPosition.top}px`,
                            right: `${menuPosition.right}px`
                        }}
                    >
                        <div className="py-2">
                            <button
                                onClick={handleLogoutDevice}
                                disabled={isLoading}
                                className="w-full px-4 py-3 text-left text-white hover:bg-white/10 transition-colors disabled:opacity-50"
                            >
                                <div className="flex items-center gap-3">
                                    <svg className="w-5 h-5 text-[var(--mint-bright)]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" />
                                    </svg>
                                    <div>
                                        <div className="font-medium text-white">Выйти с устройства</div>
                                        <div className="text-xs text-white/60">Только этот браузер</div>
                                    </div>
                                </div>
                            </button>
                            <button
                                onClick={handleLogoutAll}
                                disabled={isLoading}
                                className="w-full px-4 py-3 text-left text-[var(--pink-punk)] hover:bg-white/10 transition-colors disabled:opacity-50"
                            >
                                <div className="flex items-center gap-3">
                                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" />
                                    </svg>
                                    <div>
                                        <div className="font-medium">Выйти со всех устройств</div>
                                        <div className="text-xs text-white/60">Все браузеры и устройства</div>
                                    </div>
                                </div>
                            </button>
                        </div>
                    </div>
                </>,
                document.body
            )}
        </header>
    )
}

