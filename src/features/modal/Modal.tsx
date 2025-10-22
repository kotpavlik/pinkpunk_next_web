'use client'

import React, { useEffect } from 'react'

interface ModalProps {
    isOpen: boolean
    onClose: () => void
    title: string
    children: React.ReactNode
    className?: string
}

export default function Modal({ isOpen, onClose, title, children, className = '' }: ModalProps) {
    // Закрытие по Escape
    useEffect(() => {
        const handleEscape = (event: KeyboardEvent) => {
            if (event.key === 'Escape' && isOpen) {
                onClose()
            }
        }

        if (isOpen) {
            document.addEventListener('keydown', handleEscape)
            // Блокируем скролл body
            document.body.style.overflow = 'hidden'
        }

        return () => {
            document.removeEventListener('keydown', handleEscape)
            document.body.style.overflow = 'unset'
        }
    }, [isOpen, onClose])

    return (
        <div
            className={`fixed inset-0 z-50 flex items-start justify-end p-4 transition-opacity duration-500 ${isOpen ? 'opacity-100' : 'opacity-0 pointer-events-none'}`}
            onClick={(e) => {
                if (e.target === e.currentTarget) {
                    onClose()
                }
            }}
        >
            {/* Backdrop */}
            <div
                className="absolute inset-0 transition-opacity duration-500"
                style={{
                    background: 'rgba(0, 0, 0, 0.3)',
                    opacity: isOpen ? 1 : 0,
                }}
            />

            {/* Слой с блюром - всегда включен, но анимируем opacity */}
            <div
                className="absolute inset-0 transition-opacity duration-500"
                style={{
                    backdropFilter: 'blur(10px) saturate(180%)',
                    WebkitBackdropFilter: 'blur(10px) saturate(180%)',
                    opacity: isOpen ? 1 : 0,
                    pointerEvents: isOpen ? 'auto' : 'none'
                }}
            />

            {/* Modal Content */}
            <div
                className={`relative bg-white/10 backdrop-blur-lg rounded-2xl border border-white/20 shadow-2xl max-w-md w-full max-h-[80vh] overflow-hidden transform transition-all duration-500 ease-out ${isOpen ? 'translate-x-0' : '-translate-x-full'} ${className}`}
                style={{
                    background: 'rgba(255, 255, 255, 0.1)',
                    backdropFilter: 'blur(20px) saturate(180%)',
                    WebkitBackdropFilter: 'blur(20px) saturate(180%)',
                    border: '1px solid var(--mint-dark)',
                    boxShadow: '0 -20px 1000px 0px var(--mint-bright)'
                }}
            >
                {/* Header */}
                <div className="flex items-center justify-between p-6 border-b border-white/20">
                    <h2 className="text-xl font-bold text-white font-durik">
                        {title}
                    </h2>
                    <button
                        onClick={onClose}
                        className="text-white/50 hover:text-white hover:bg-white/10 p-2 rounded-full transition-all duration-200 transform hover:scale-105"
                    >
                        <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                        </svg>
                    </button>
                </div>

                {/* Content */}
                <div className="p-6 text-white/90 leading-relaxed">
                    {children}
                </div>
            </div>
        </div>
    )
}
