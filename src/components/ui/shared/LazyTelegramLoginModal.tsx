'use client'

import dynamic from 'next/dynamic'

interface LazyTelegramLoginModalProps {
    isOpen: boolean
    onClose: () => void
    botName?: string
    linkTelegramOnly?: boolean
    relinkTelegram?: boolean
}

const TelegramLoginModal = dynamic(() => import('./TelegramLoginModal'), {
    ssr: false,
    loading: () => null,
})

export default function LazyTelegramLoginModal(props: LazyTelegramLoginModalProps) {
    if (!props.isOpen) {
        return null
    }

    return <TelegramLoginModal {...props} />
}
