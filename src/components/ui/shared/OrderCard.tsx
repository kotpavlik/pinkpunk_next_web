'use client'

import React, { useState, useCallback, useEffect } from 'react'
import { createPortal } from 'react-dom'
import { PinkPunkOrder } from '@/api/OrderApi'
import LazyImage from '@/components/common/LazyImage'
import { formatDate } from '@/feauteres/FormatDate'
import { useUserStore } from '@/zustand/user_store/UserStore'
import { useOrderStore } from '@/zustand/order_store/OrderStore'
import { XMarkIcon } from '@heroicons/react/24/outline'

interface OrderCardProps {
    order: PinkPunkOrder
    onDeleted?: () => void
}

export const OrderCard: React.FC<OrderCardProps> = React.memo(({ order, onDeleted }) => {
    const [isExpanded, setIsExpanded] = useState(false)
    const [isClosing, setIsClosing] = useState(false)
    const [mounted, setMounted] = useState(false)
    const [isCopied, setIsCopied] = useState(false)
    const [isPhoneCopied, setIsPhoneCopied] = useState(false)
    const [showDeleteModal, setShowDeleteModal] = useState(false)
    const [isDeleting, setIsDeleting] = useState(false)
    const [updatingStatus, setUpdatingStatus] = useState<'confirmed' | 'paid' | 'completed' | 'cancelled' | null>(null)
    const [showCancelModal, setShowCancelModal] = useState(false)
    const { user } = useUserStore()
    const { deleteOrder, updateOrderStatus, cancelOrder } = useOrderStore()

    useEffect(() => {
        setMounted(true)
    }, [])

    // Функция для закрытия с анимацией
    const handleClose = useCallback(() => {
        setIsClosing(true)
        setTimeout(() => {
            setIsClosing(false)
            setIsExpanded(false)
        }, 300) // Длительность анимации
    }, [])

    const toggleExpanded = useCallback(() => {
        if (isExpanded) {
            handleClose()
        } else {
            setIsExpanded(true)
        }
    }, [isExpanded, handleClose])

    // Закрытие по Escape
    useEffect(() => {
        if (!isExpanded) return

        const handleEscape = (e: KeyboardEvent) => {
            if (e.key === 'Escape') {
                handleClose()
            }
        }

        document.addEventListener('keydown', handleEscape)
        return () => document.removeEventListener('keydown', handleEscape)
    }, [isExpanded, handleClose])

    const handleCopyOrderNumber = useCallback(async () => {
        try {
            await navigator.clipboard.writeText(order.orderNumber)
            setIsCopied(true)
            setTimeout(() => setIsCopied(false), 300)
        } catch {
            // Silent error handling
        }
    }, [order.orderNumber])

    const handleCopyPhone = useCallback(async (phone: string) => {
        try {
            await navigator.clipboard.writeText(phone)
            setIsPhoneCopied(true)
            setTimeout(() => setIsPhoneCopied(false), 1000)
        } catch {
            // Silent error handling
        }
    }, [])

    const handleDeleteClick = useCallback(() => {
        setShowDeleteModal(true)
    }, [])

    const handleDeleteConfirm = useCallback(async () => {
        setIsDeleting(true)
        try {
            const success = await deleteOrder(order._id)
            if (success) {
                setShowDeleteModal(false)
                onDeleted?.()
            }
        } catch {
            // Silent error handling
        } finally {
            setIsDeleting(false)
        }
    }, [deleteOrder, order._id, onDeleted])

    const handleDeleteCancel = useCallback(() => {
        setShowDeleteModal(false)
    }, [])

    // ===== Status transition helpers =====
    const isAdmin = user.isAdmin
    const canGoToConfirmed = isAdmin && order.status === 'pending_confirmation'
    const canGoToPaid = isAdmin && order.status === 'confirmed'
    const canRollbackToConfirmed = isAdmin && order.status === 'paid'
    const canGoToCompleted = isAdmin && order.status === 'paid'
    const canCancel = isAdmin && order.status === 'confirmed'

    // ===== Status action handlers =====
    const doUpdateStatus = useCallback(async (newStatus: 'confirmed' | 'paid' | 'completed') => {
        setUpdatingStatus(newStatus)
        try {
            await updateOrderStatus(order._id, newStatus)
        } finally {
            setUpdatingStatus(null)
        }
    }, [order._id, updateOrderStatus])

    const doCancelOrder = useCallback(async () => {
        setUpdatingStatus('cancelled')
        try {
            const success = await cancelOrder(order._id)
            if (success) {
                setShowCancelModal(false)
                onDeleted?.()
            }
        } catch {
            // Silent error handling
        } finally {
            setUpdatingStatus(null)
        }
    }, [order._id, cancelOrder, onDeleted])

    return (
        <div className="group bg-[#2a2f31] rounded-lg p-3 border border-white/10 hover:border-[var(--mint-bright)] transition-colors relative h-full flex flex-col">
            {/* Заголовок заказа */}
            <div className="flex justify-between items-start mb-3 relative min-h-[60px]">
                {/* Кнопка удаления для админа */}
                {user.isAdmin && (
                    <button
                        onClick={handleDeleteClick}
                        title="Удалить заказ"
                        className="absolute top-0 right-0 p-1.5 bg-white/10 text-[var(--pink-punk)] z-10 rounded"
                    >
                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6M9 7h6m-7 0V5a2 2 0 012-2h2a2 2 0 012 2v2" />
                        </svg>
                    </button>
                )}
                <div className="flex-1 min-w-0 pr-8">
                    <div className="flex items-center gap-2 mb-2">
                        <h4 className="text-[var(--mint-bright)] font-bold text-base">
                            Заказ №
                        </h4>
                        <button
                            onClick={handleCopyOrderNumber}
                            className="cursor-pointer flex items-center gap-1 text-[var(--mint-bright)] font-semibold text-sm"
                            title="Нажмите, чтобы скопировать"
                        >
                            <span className="truncate">{order.orderNumber}</span>
                            <svg
                                xmlns="http://www.w3.org/2000/svg"
                                width="14"
                                height="14"
                                fill="none"
                                viewBox="0 0 24 24"
                                className="flex-shrink-0"
                            >
                                <rect x="9" y="9" width="13" height="13" rx="2"
                                    stroke={isCopied ? 'var(--mint-bright)' : 'currentColor'} strokeWidth="2" />
                                <rect x="3" y="3" width="13" height="13" rx="2" stroke={isCopied ? 'var(--mint-bright)' : 'currentColor'} strokeWidth="2" />
                            </svg>
                        </button>
                    </div>
                    <p className="text-white/60 text-xs mb-2">
                        {formatDate(order.createdAt)}
                    </p>
                    <div className="flex gap-1.5 overflow-x-auto pb-1">
                        {order.items && order.items.length > 0 && order.items.slice(0, 4).map((item, index) => (
                            item.product && item.product.photos && item.product.photos.length > 0 ? (
                                <div key={index} className="w-10 h-10 flex-shrink-0 rounded overflow-hidden border border-white/10">
                                    <LazyImage
                                        src={item.product.photos[0]}
                                        alt={item.product.name || 'Товар'}
                                        className="w-full h-full"
                                    />
                                </div>
                            ) : null
                        ))}
                        {order.items && order.items.length > 4 && (
                            <div className="w-10 h-10 flex-shrink-0 rounded bg-white/5 border border-white/10 flex items-center justify-center">
                                <span className="text-white/60 text-xs">+{order.items.length - 4}</span>
                            </div>
                        )}
                    </div>
                </div>
            </div>

            {/* Статус заказа */}
            <div className="mb-4 relative">
                <div className="flex items-center justify-between relative">
                    {/* Линия прогресса */}
                    <div className="absolute top-1/2 left-0 right-0 h-0.5 bg-[#4a5568] -translate-y-1/2 z-0"></div>

                    {/* pending_confirmation */}
                    <button
                        disabled={!canGoToConfirmed || updatingStatus !== null}
                        onClick={() => canGoToConfirmed && updatingStatus === null && doUpdateStatus('confirmed')}
                        className={`flex flex-col items-center z-10 bg-[#2a2f31] px-1 ${!canGoToConfirmed || updatingStatus !== null ? 'cursor-default' : 'cursor-pointer'}`}
                        title={canGoToConfirmed && updatingStatus === null ? 'Подтвердить заказ' : ''}
                    >
                        <div className='w-8 h-8 rounded-full flex items-center justify-center bg-[#4a5568] relative'>
                            {updatingStatus === 'confirmed' ? (
                                <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-[var(--mint-bright)]"></div>
                            ) : (
                                <svg className="w-4 h-4"
                                    fill="none"
                                    stroke={order.status === 'pending_confirmation' || order.status === 'confirmed' || order.status === 'paid' || order.status === 'completed'
                                        ? 'var(--mint-bright)'
                                        : 'currentColor'
                                    }
                                    viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                                </svg>
                            )}
                        </div>
                    </button>

                    {/* confirmed */}
                    <div className="flex flex-col items-center z-10 bg-[#2a2f31] px-1 relative">
                        <button
                            disabled={!isAdmin || updatingStatus !== null}
                            onClick={() => {
                                if (!isAdmin || updatingStatus !== null) return
                                if (order.status === 'pending_confirmation') {
                                    doUpdateStatus('confirmed')
                                } else if (order.status === 'paid') {
                                    doUpdateStatus('confirmed')
                                }
                            }}
                            className={`flex flex-col items-center ${!isAdmin || updatingStatus !== null ? 'cursor-default' : 'cursor-pointer'}`}
                            title={isAdmin && updatingStatus === null ? (order.status === 'pending_confirmation' ? 'Подтвердить заказ' : (order.status === 'paid' ? 'Откатить к Confirmed' : '')) : ''}
                        >
                            <div className='w-8 h-8 rounded-full flex items-center justify-center bg-[#4a5568] relative'>
                                {updatingStatus === 'confirmed' ? (
                                    <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-[var(--mint-bright)]"></div>
                                ) : (
                                    <svg className="w-4 h-4"
                                        fill="none"
                                        stroke={order.status === 'confirmed' || order.status === 'paid' || order.status === 'completed'
                                            ? 'var(--mint-bright)'
                                            : 'currentColor'
                                        }
                                        viewBox="0 0 24 24">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                                    </svg>
                                )}
                            </div>
                        </button>
                        {/* Cancel button - only visible to admin when status is confirmed */}
                        {canCancel && (
                            <div className='w-8 h-8 rounded-full flex items-center justify-center bg-[#4a5568] absolute left-8 top-0 z-10'>
                                <button
                                    onClick={(e) => { e.stopPropagation(); setShowCancelModal(true); }}
                                    disabled={updatingStatus !== null}
                                    className={`flex flex-col items-center text-[var(--pink-punk)] ${updatingStatus !== null ? 'cursor-default' : ''}`}
                                    title={updatingStatus !== null ? '' : 'Отменить заказ'}
                                >
                                    {updatingStatus === 'cancelled' ? (
                                        <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-[var(--pink-punk)]"></div>
                                    ) : (
                                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                                        </svg>
                                    )}
                                </button>
                            </div>
                        )}
                    </div>

                    {/* paid */}
                    <button
                        disabled={(!canGoToPaid && !canRollbackToConfirmed) || updatingStatus !== null}
                        onClick={() => {
                            if (updatingStatus !== null) return
                            if (canGoToPaid) doUpdateStatus('paid')
                            if (canRollbackToConfirmed) doUpdateStatus('confirmed')
                        }}
                        className={`flex flex-col items-center z-10 bg-[#2a2f31] px-1 ${(!canGoToPaid && !canRollbackToConfirmed) || updatingStatus !== null ? 'cursor-default' : 'cursor-pointer'}`}
                        title={updatingStatus !== null ? '' : (canGoToPaid ? 'Отметить как оплаченный' : canRollbackToConfirmed ? 'Откатить к подтвержденному' : '')}
                    >
                        <div className='w-8 h-8 rounded-full flex items-center justify-center bg-[#4a5568] relative'>
                            {updatingStatus === 'paid' || (updatingStatus === 'confirmed' && canRollbackToConfirmed) ? (
                                <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-[var(--mint-bright)]"></div>
                            ) : (
                                <svg className="w-4 h-4"
                                    fill="none"
                                    stroke={order.status === 'paid' || order.status === 'completed'
                                        ? 'var(--mint-bright)'
                                        : 'currentColor'
                                    }
                                    viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 10h18M7 15h1m4 0h1m-7 4h12a3 3 0 003-3V8a3 3 0 00-3-3H6a3 3 0 00-3 3v8a3 3 0 003 3z" />
                                </svg>
                            )}
                        </div>
                    </button>

                    {/* completed or cancelled */}
                    <button
                        disabled={!canGoToCompleted || updatingStatus !== null}
                        onClick={() => canGoToCompleted && updatingStatus === null && doUpdateStatus('completed')}
                        className={`flex flex-col items-center z-10 bg-[#2a2f31] px-1 ${!canGoToCompleted || updatingStatus !== null ? 'cursor-default' : 'cursor-pointer'}`}
                        title={canGoToCompleted && updatingStatus === null ? 'Завершить заказ' : ''}
                    >
                        <div className='w-8 h-8 rounded-full flex items-center justify-center bg-[#4a5568] relative'>
                            {updatingStatus === 'completed' ? (
                                <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-[var(--mint-bright)]"></div>
                            ) : order.status === 'cancelled' ? (
                                <svg className="w-4 h-4"
                                    fill="none"
                                    stroke="var(--pink-punk)"
                                    viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                                </svg>
                            ) : (
                                <svg className="w-4 h-4"
                                    fill="none"
                                    stroke={order.status === 'completed' ? 'var(--mint-bright)' : 'currentColor'}
                                    viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                                </svg>
                            )}
                        </div>
                    </button>
                </div>
            </div>

            {/* Кнопка развернуть/свернуть */}
            <button
                onClick={toggleExpanded}
                className="w-full py-1.5 bg-white/5 text-[var(--mint-bright)] rounded-lg hover:bg-white/10 transition-colors text-xs font-semibold mt-auto"
            >
                ▼ Подробнее
            </button>

            {/* Модалка с детальной информацией */}
            {mounted && isExpanded && createPortal(
                <div
                    className="fixed inset-0 z-50 flex items-end md:items-center justify-start"
                    onClick={(e) => {
                        if (e.target === e.currentTarget) {
                            handleClose()
                        }
                    }}
                >
                    {/* Overlay */}
                    <div
                        className="absolute inset-0 bg-black/60 backdrop-blur-sm transition-opacity duration-300"
                        onClick={handleClose}
                    />

                    {/* Modal Content */}
                    <div
                        className={`relative w-full md:w-1/2 lg:w-2/5 h-full md:h-full bg-gradient-to-br from-white/10 via-white/5 to-white/10 backdrop-blur-2xl border-t md:border-r md:border-t-0 border-white/20 shadow-2xl flex flex-col ${isClosing ? 'order-modal-closing' : 'order-modal-content'}`}
                        style={{
                            background: 'linear-gradient(135deg, rgba(255, 255, 255, 0.1) 0%, rgba(255, 255, 255, 0.05) 50%, rgba(255, 255, 255, 0.1) 100%)',
                            backdropFilter: 'blur(30px) saturate(180%)',
                            WebkitBackdropFilter: 'blur(30px) saturate(180%)',
                            boxShadow: '0 20px 60px rgba(0, 0, 0, 0.5), 0 0 0 1px rgba(255, 255, 255, 0.1)',
                        }}
                        onClick={(e) => e.stopPropagation()}
                    >
                        {/* Header */}
                        <div className="flex-shrink-0 flex items-center justify-between p-6 border-b border-white/10">
                            <h2 className="text-2xl md:text-3xl font-blauer-nue font-bold text-white">
                                Заказ № {order.orderNumber}
                            </h2>
                            <button
                                onClick={handleClose}
                                className="text-white/70 hover:text-white transition-colors p-2 rounded-full hover:bg-white/10"
                                aria-label="Закрыть"
                            >
                                <XMarkIcon className="h-6 w-6" />
                            </button>
                        </div>

                        {/* Content - Scrollable */}
                        <div className="flex-1 overflow-y-auto px-6 py-4">
                            <div className="space-y-4">
                                {/* Товары в заказе */}
                                {order.items && order.items.length > 0 && (
                                    <div>
                                        <h5 className="text-white font-semibold mb-3 text-base">Товары:</h5>
                                        <div className="space-y-2">
                                            {order.items.map((item, index) => {
                                                if (!item.product) return null
                                                const firstPhoto = item.product.photos?.[0]
                                                return (
                                                    <div key={index} className="bg-white/5 p-3 rounded-lg">
                                                        <div className="flex gap-3">
                                                            {firstPhoto && (
                                                                <div className="relative w-16 h-20 flex-shrink-0 overflow-hidden border border-white/10">
                                                                    <LazyImage
                                                                        src={firstPhoto}
                                                                        alt={item.product.name || 'Товар'}
                                                                        className="w-full h-full"
                                                                    />
                                                                </div>
                                                            )}
                                                            <div className="flex-1 min-w-0">
                                                                <p className="text-white font-medium text-sm mb-1">{item.product.name}</p>
                                                                <div className="space-y-1 text-xs text-white/70">
                                                                    <p>Размер: {item.size || 'Не указан'}</p>
                                                                    <p>Количество: {item.quantity} шт</p>
                                                                    <p>Цена за шт: {item.price} BYN</p>
                                                                </div>
                                                                <p className="text-[var(--mint-bright)] font-semibold text-sm mt-2">
                                                                    {item.price * item.quantity} BYN
                                                                </p>
                                                            </div>
                                                        </div>
                                                    </div>
                                                )
                                            })}
                                        </div>
                                    </div>
                                )}

                                {/* Адрес доставки */}
                                {order.shippingAddress && (
                                    <div>
                                        <h5 className="text-white font-semibold mb-2 text-base">Адрес доставки:</h5>
                                        <div className="bg-white/5 p-3 rounded-lg text-white/80 text-sm space-y-2">
                                            <p><strong>Получатель:</strong> {order.shippingAddress.fullName}</p>
                                            <p className="flex items-center gap-2 flex-wrap">
                                                <strong>Телефон:</strong>
                                                <button
                                                    onClick={() => handleCopyPhone(order.shippingAddress!.phone)}
                                                    className="inline-flex items-center gap-1 cursor-pointer hover:text-[var(--mint-bright)] transition-colors"
                                                    title="Нажмите, чтобы скопировать"
                                                >
                                                    <span>{order.shippingAddress.phone}</span>
                                                    <svg
                                                        className="w-4 h-4"
                                                        fill="none"
                                                        stroke={isPhoneCopied ? 'var(--mint-bright)' : 'currentColor'}
                                                        viewBox="0 0 24 24"
                                                    >
                                                        <rect x="9" y="9" width="13" height="13" rx="2" strokeWidth="2" />
                                                        <rect x="3" y="3" width="13" height="13" rx="2" strokeWidth="2" />
                                                    </svg>
                                                </button>
                                            </p>
                                            <p><strong>Адрес:</strong> {order.shippingAddress.city}, {order.shippingAddress.address}</p>
                                            {order.shippingAddress.postalCode && order.shippingAddress.postalCode !== '000000' && (
                                                <p><strong>Индекс:</strong> {order.shippingAddress.postalCode}</p>
                                            )}
                                        </div>
                                    </div>
                                )}

                                {/* Дополнительная информация */}
                                {order.notes && (
                                    <div>
                                        <h5 className="text-white font-semibold mb-2 text-base">Комментарий:</h5>
                                        <div className="bg-white/5 p-3 rounded-lg text-white/80 text-sm">
                                            {order.notes}
                                        </div>
                                    </div>
                                )}

                                {/* Трек-номер */}
                                {order.trackingNumber && (
                                    <div>
                                        <h5 className="text-white font-semibold mb-2 text-base">Трек-номер:</h5>
                                        <div className="bg-white/5 p-3 rounded-lg text-[var(--mint-bright)] text-sm font-mono break-all">
                                            {order.trackingNumber}
                                        </div>
                                    </div>
                                )}

                            </div>
                        </div>

                        {/* Footer - Fixed */}
                        <div className="flex-shrink-0 border-t border-white/10 p-6 space-y-2">
                            {order.items && order.items.length > 0 && (
                                <div className="flex justify-between text-white/80 text-sm">
                                    <span>Сумма товаров:</span>
                                    <span>{order.items.reduce((sum, item) => sum + (item.price * item.quantity), 0)} BYN</span>
                                </div>
                            )}
                            <div className="flex items-center justify-between">
                                <span className="text-white/90 text-lg font-blauer-nue">Итого</span>
                                <span className="text-2xl font-bold text-[var(--mint-bright)]">{order.totalAmount} BYN</span>
                            </div>
                        </div>
                    </div>

                    <style jsx global>{`
                        .order-modal-content {
                            animation: slideInLeft 0.3s ease-out;
                        }
                        .order-modal-closing {
                            animation: slideOutLeft 0.3s ease-in;
                        }
                        @keyframes slideInLeft {
                            from {
                                transform: translateX(-100%);
                            }
                            to {
                                transform: translateX(0);
                            }
                        }
                        @keyframes slideOutLeft {
                            from {
                                transform: translateX(0);
                            }
                            to {
                                transform: translateX(-100%);
                            }
                        }
                        @media (max-width: 768px) {
                            .order-modal-content {
                                animation: slideInUp 0.3s ease-out;
                            }
                            .order-modal-closing {
                                animation: slideOutDown 0.3s ease-in;
                            }
                            @keyframes slideInUp {
                                from {
                                    transform: translateY(100%);
                                }
                                to {
                                    transform: translateY(0);
                                }
                            }
                            @keyframes slideOutDown {
                                from {
                                    transform: translateY(0);
                                }
                                to {
                                    transform: translateY(100%);
                                }
                            }
                        }
                    `}</style>
                </div>,
                document.body
            )}

            {/* Модальное окно подтверждения удаления */}
            {showDeleteModal && (
                <div className="fixed inset-0 z-50 flex items-center justify-center">
                    <div className="absolute inset-0 bg-black/60" onClick={handleDeleteCancel}></div>
                    <div className="relative z-10 w-[90%] max-w-sm bg-white/5 backdrop-blur-md border border-white/10 rounded-lg p-4">
                        <h3 className="text-white font-semibold mb-2">Подтверждение удаления</h3>
                        <p className="text-white/80 text-sm mb-4">
                            Удалить заказ № <span className="text-[var(--mint-bright)] font-mono">{order.orderNumber}</span>?
                        </p>
                        <div className="flex justify-end gap-2">
                            <button
                                onClick={handleDeleteCancel}
                                className="px-3 py-2 rounded-md bg-white/10 text-white/90 hover:bg-white/15 text-sm"
                                disabled={isDeleting}
                            >
                                Отмена
                            </button>
                            <button
                                onClick={handleDeleteConfirm}
                                className="px-3 py-2 rounded-md bg-[var(--pink-punk)] text-white disabled:opacity-60 text-sm"
                                disabled={isDeleting}
                            >
                                {isDeleting ? 'Удаление...' : 'Удалить'}
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {/* Cancel confirmation modal */}
            {showCancelModal && (
                <div className="fixed inset-0 z-50 flex items-center justify-center">
                    <div className="absolute inset-0 bg-black/60" onClick={() => setShowCancelModal(false)}></div>
                    <div className="relative z-10 w-[90%] max-w-sm bg-white/5 backdrop-blur-md border border-white/10 rounded-lg p-4">
                        <h3 className="text-white font-semibold mb-2">Отмена заказа</h3>
                        <p className="text-white/80 text-sm mb-4">
                            Вы точно хотите отменить этот заказ? Все товары будут возвращены на склад.
                        </p>
                        <div className="flex justify-end gap-2">
                            <button
                                onClick={() => setShowCancelModal(false)}
                                className="px-3 py-2 rounded-md bg-white/10 text-white/90 hover:bg-white/15 text-sm"
                                disabled={updatingStatus === 'cancelled'}
                            >
                                Отмена
                            </button>
                            <button
                                onClick={doCancelOrder}
                                className="px-3 py-2 rounded-md bg-[var(--pink-punk)] text-white hover:bg-[var(--pink-dark)] disabled:opacity-60 text-sm"
                                disabled={updatingStatus === 'cancelled'}
                            >
                                {updatingStatus === 'cancelled' ? 'Отмена...' : 'Отменить'}
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    )
})

OrderCard.displayName = 'OrderCard'
