'use client'

import React, { useEffect } from 'react'
import './Modal.css'

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
            className={`modal-container ${isOpen ? 'open' : 'closed'}`}
            onClick={(e) => {
                if (e.target === e.currentTarget) {
                    onClose()
                }
            }}
        >
            {/* Backdrop */}
            <div
                className={`modal-backdrop ${isOpen ? 'open' : 'closed'}`}
            />

            {/* Modal Content */}
            <div
                className={`modal-content ${isOpen ? 'open' : 'closed'} ${className}`}
                style={{
                    backdropFilter: 'blur(20px) saturate(180%)',
                    WebkitBackdropFilter: 'blur(20px) saturate(180%)',

                }}
            >
                {/* Header */}
                <div className="modal-header">
                    <h2 className="modal-title">
                        {title}
                    </h2>
                    <button
                        onClick={onClose}
                        className="modal-close-btn"
                    >
                        <svg className="modal-close-icon" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
                        </svg>
                    </button>
                </div>

                {/* Content */}
                <div className="modal-body">
                    {children}
                </div>
            </div>
        </div>
    )
}
