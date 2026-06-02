'use client'

import Image from 'next/image'
import { motion } from 'framer-motion'
import {
    ShoppingBagIcon,
    VideoCameraIcon,
    UserGroupIcon,
} from '@heroicons/react/24/outline'
import type { LoyaltyRuleSectionId } from '@/app/loyalty_rules/loyaltyRulesContent'

function TonCoinIcon({ className }: { className?: string }) {
    return (
        <Image
            src="/images/ton_svg/ton.svg"
            alt=""
            aria-hidden
            width={16}
            height={16}
            className={className}
        />
    )
}

const SECTION_ICONS = {
    shop: ShoppingBagIcon,
    reels: VideoCameraIcon,
    referral: UserGroupIcon,
    donate: TonCoinIcon,
} as const

export type LoyaltyRulesNavItem = {
    id: LoyaltyRuleSectionId
    title: string
    accent: string
}

type Props = {
    sections: LoyaltyRulesNavItem[]
    activeSectionId: LoyaltyRuleSectionId
    onSectionClick: (id: LoyaltyRuleSectionId) => void
}

export default function LoyaltyRulesNav({ sections, activeSectionId, onSectionClick }: Props) {
    return (
        <nav aria-label="Способы начисления PTS" className="flex flex-col gap-1.5">
            {sections.map((section) => {
                const NavIcon = SECTION_ICONS[section.id]
                const isActive = activeSectionId === section.id

                return (
                    <a
                        key={section.id}
                        href={`#${section.id}`}
                        onClick={(event) => {
                            event.preventDefault()
                            onSectionClick(section.id)
                        }}
                        className={`relative flex w-full items-center gap-2.5 rounded-xl border px-3 py-2.5 text-left text-sm transition ${
                            isActive
                                ? 'border-[var(--mint-bright)]/45 bg-[var(--mint-bright)]/10 text-[var(--mint-bright)]'
                                : 'border-white/10 bg-black/20 text-white/70 hover:border-[var(--mint-bright)]/30 hover:text-white/90'
                        }`}
                        aria-current={isActive ? 'true' : undefined}
                    >
                        {isActive ? (
                            <motion.span
                                layoutId="loyalty-rules-nav-active"
                                className="absolute inset-0 rounded-xl border border-[var(--mint-bright)]/35 bg-[var(--mint-bright)]/10"
                                transition={{ type: 'spring', stiffness: 380, damping: 32 }}
                                aria-hidden
                            />
                        ) : null}
                        <span
                            className="relative z-[1] flex h-7 w-7 shrink-0 items-center justify-center rounded-lg border border-white/10 bg-black/30"
                            style={{ color: section.accent }}
                        >
                            <NavIcon className="h-4 w-4" aria-hidden />
                        </span>
                        <span className="relative z-[1] min-w-0 leading-snug">{section.title}</span>
                    </a>
                )
            })}
        </nav>
    )
}
