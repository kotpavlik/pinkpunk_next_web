'use client'

import Link from 'next/link'
import { useCallback, useEffect, useState, type ReactNode } from 'react'
import { motion } from 'framer-motion'
import {
    ShoppingBagIcon,
    VideoCameraIcon,
    UserGroupIcon,
    CurrencyDollarIcon,
    ChartBarIcon,
    ShieldExclamationIcon,
} from '@heroicons/react/24/outline'
import LoyaltyRulesNav from '@/app/loyalty_rules/LoyaltyRulesNav'
import {
    LOYALTY_RULE_SECTIONS,
    type LoyaltyRuleSection,
    type LoyaltyRuleSectionId,
} from '@/app/loyalty_rules/loyaltyRulesContent'
import {
    LOYALTY_RULES_EASE,
    LOYALTY_RULES_HEADER_OFFSET,
    LOYALTY_RULES_REVEAL,
    animateScrollToSection,
} from '@/app/loyalty_rules/loyaltyRulesMotion'
import {
    PINK_PUNK_INSTAGRAM_HANDLE,
    PINK_PUNK_INSTAGRAM_URL,
} from '@/constants/pinkPunkSocial'
import VideoSubmitHintBlock from '@/components/ui/shared/VideoSubmitHintBlock'

const SECTION_ICONS = {
    shop: ShoppingBagIcon,
    reels: VideoCameraIcon,
    referral: UserGroupIcon,
    donate: CurrencyDollarIcon,
} as const

const revealTransition = (delay = 0) => ({
    duration: 0.55,
    ease: LOYALTY_RULES_EASE,
    delay,
})

function renderBulletText(text: string) {
    if (!text.includes(PINK_PUNK_INSTAGRAM_HANDLE)) {
        return text
    }

    const [before, after = ''] = text.split(PINK_PUNK_INSTAGRAM_HANDLE)

    return (
        <>
            {before}
            <a
                href={PINK_PUNK_INSTAGRAM_URL}
                target="_blank"
                rel="noopener noreferrer"
                className="font-semibold text-[#E1306C] hover:text-[#FCAF45] hover:underline transition-colors"
            >
                {PINK_PUNK_INSTAGRAM_HANDLE}
            </a>
            {after}
        </>
    )
}

function RuleCard({ section, index }: { section: LoyaltyRuleSection; index: number }) {
    const Icon = SECTION_ICONS[section.id]

    return (
        <motion.article
            id={section.id}
            className="scroll-mt-24 rounded-2xl border border-white/10 bg-white/[0.04] backdrop-blur-md p-5 md:p-6 shadow-xl"
            style={{ boxShadow: `inset 3px 0 0 0 ${section.accent}` }}
            initial={LOYALTY_RULES_REVEAL.hidden}
            whileInView={LOYALTY_RULES_REVEAL.visible}
            viewport={{ once: true, amount: 0.18, margin: '-72px 0px' }}
            transition={revealTransition(index * 0.06)}
        >
            <div className="mb-4 flex items-start gap-3">
                <div
                    className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl border border-white/10 bg-black/30"
                    style={{ color: section.accent }}
                >
                    <Icon className="h-5 w-5" aria-hidden />
                </div>
                <div className="min-w-0">
                    <h3 className="text-lg md:text-xl font-bold text-white font-blauer-nue leading-tight">
                        {section.title}
                    </h3>
                </div>
            </div>

            <p className="text-sm md:text-base text-white/75 leading-relaxed">{section.summary}</p>

            {section.bullets && section.bullets.length > 0 && (
                <ul className="mt-4 space-y-2 text-sm text-white/70 leading-relaxed">
                    {section.bullets.map((item) => (
                        <li key={item} className="flex gap-2.5">
                            <span className="mt-2 h-1.5 w-1.5 shrink-0 rounded-full bg-[var(--mint-bright)]" />
                            <span>{renderBulletText(item)}</span>
                        </li>
                    ))}
                </ul>
            )}

            {section.rewards && section.rewards.length > 0 && (
                <div className="mt-5 grid gap-2 sm:grid-cols-2">
                    {section.rewards.map((reward) => (
                        <div
                            key={reward.label}
                            className="rounded-xl border border-[var(--mint-bright)]/25 bg-[var(--mint-bright)]/8 px-4 py-3"
                        >
                            <p className="text-[11px] uppercase tracking-wide text-white/50 mb-1">{reward.label}</p>
                            <p className="text-xl font-bold tabular-nums text-[var(--mint-bright)] font-blauer-nue">
                                {reward.value}
                            </p>
                        </div>
                    ))}
                </div>
            )}

            {section.note && (
                <p className="mt-4 rounded-xl border border-white/10 bg-black/25 px-4 py-3 text-sm text-white/65 leading-relaxed">
                    {section.note}
                </p>
            )}

            {section.videoSubmitHint && <VideoSubmitHintBlock />}

            {section.bonus && (
                <p className="mt-4 rounded-xl border border-[var(--level-gold)]/30 bg-[color-mix(in_srgb,var(--level-gold)_10%,transparent)] px-4 py-3 text-sm text-white/80 leading-relaxed">
                    <span className="font-semibold text-[var(--level-gold)]">Важный бонус: </span>
                    {section.bonus}
                </p>
            )}
        </motion.article>
    )
}

function InfoSection({
    children,
    className,
    delay = 0,
}: {
    children: ReactNode
    className: string
    delay?: number
}) {
    return (
        <motion.section
            className={className}
            initial={LOYALTY_RULES_REVEAL.hidden}
            whileInView={LOYALTY_RULES_REVEAL.visible}
            viewport={{ once: true, amount: 0.25, margin: '-64px 0px' }}
            transition={revealTransition(delay)}
        >
            {children}
        </motion.section>
    )
}

export default function LoyaltyRulesBody() {
    const [activeSectionId, setActiveSectionId] = useState<LoyaltyRuleSectionId>(LOYALTY_RULE_SECTIONS[0].id)

    const updateActiveSection = useCallback(() => {
        const marker = LOYALTY_RULES_HEADER_OFFSET + 24
        let nextActive = LOYALTY_RULE_SECTIONS[0].id

        for (const section of LOYALTY_RULE_SECTIONS) {
            const element = document.getElementById(section.id)
            if (!element) continue
            if (element.getBoundingClientRect().top <= marker) {
                nextActive = section.id
            }
        }

        setActiveSectionId(nextActive)
    }, [])

    useEffect(() => {
        updateActiveSection()
        window.addEventListener('scroll', updateActiveSection, { passive: true })
        window.addEventListener('resize', updateActiveSection)
        return () => {
            window.removeEventListener('scroll', updateActiveSection)
            window.removeEventListener('resize', updateActiveSection)
        }
    }, [updateActiveSection])

    const handleNavClick = useCallback((id: LoyaltyRuleSectionId) => {
        setActiveSectionId(id)
        animateScrollToSection(id, updateActiveSection)
    }, [updateActiveSection])

    const navSections = LOYALTY_RULE_SECTIONS.map(({ id, title, accent }) => ({ id, title, accent }))

    return (
        <div className="mx-4 md:mx-auto max-w-6xl px-0 md:px-2">
            <div className="grid grid-cols-1 gap-8 lg:grid-cols-[minmax(0,1fr)_17.5rem] lg:gap-10 xl:grid-cols-[minmax(0,1fr)_19rem] xl:gap-12 lg:items-start">
                <div className="min-w-0 space-y-4 md:space-y-5 order-2 lg:order-1">
                    {LOYALTY_RULE_SECTIONS.map((section, index) => (
                        <RuleCard key={section.id} section={section} index={index} />
                    ))}

                    <InfoSection
                        className="rounded-2xl border border-[var(--mint-bright)]/30 bg-[var(--mint-bright)]/8 p-5 md:p-6"
                        delay={0.04}
                    >
                        <div className="flex items-start gap-3">
                            <ChartBarIcon className="h-6 w-6 shrink-0 text-[var(--mint-bright)]" aria-hidden />
                            <div>
                                <h3 className="text-lg font-bold text-white font-blauer-nue mb-2">
                                    Как следить за своими PTS?
                                </h3>
                                <p className="text-sm md:text-base text-white/75 leading-relaxed">
                                    Баланс и историю начислений смотри в своём профиле в Telegram-мини-приложении или на{' '}
                                    <Link href="/user_profile" className="text-[var(--mint-bright)] hover:underline">
                                        странице профиля
                                    </Link>
                                    .
                                </p>
                            </div>
                        </div>
                    </InfoSection>

                    <InfoSection
                        className="rounded-2xl border border-[var(--pink-punk)]/35 bg-[var(--pink-punk)]/8 p-5 md:p-6"
                        delay={0.08}
                    >
                        <div className="flex items-start gap-3">
                            <ShieldExclamationIcon className="h-6 w-6 shrink-0 text-[var(--pink-punk)]" aria-hidden />
                            <div className="space-y-3 text-sm md:text-base text-white/75 leading-relaxed">
                                <h3 className="text-lg font-bold text-white font-blauer-nue">Важно</h3>
                                <p>
                                    Администрация Pink Punk оставляет за собой право проверить любой способ начисления PTS
                                    (видео, рефералов, донат) на честность.
                                </p>
                                <p>
                                    За попытки накрутки — фейковые аккаунты, боты, короткие видео без содержания —
                                    возможны блокировка и обнуление PTS.
                                </p>
                                <p className="text-white/85">
                                    Если вы привели друга, и ему не нужны PTS — мы зачислим их вам за его активность по
                                    согласованию.
                                </p>
                            </div>
                        </div>
                    </InfoSection>
                </div>

                <aside className="order-1 lg:order-2 lg:sticky lg:top-24 lg:self-start">
                    <div className="rounded-2xl border border-white/10 bg-white/[0.03] p-4 md:p-5 space-y-5">
                        <div className="space-y-3 text-left">
                            <h1 className="text-2xl md:text-3xl font-durik text-[var(--mint-bright)] leading-tight">
                                Правила PTS
                            </h1>
                            <p className="text-sm leading-relaxed text-white/75">
                                Ты можешь копить PTS разными способами. PTS дают повышение уровня и доступ к бонусам.
                                Главный способ — покупки в магазине, но есть и бесплатные варианты.
                            </p>
                        </div>

                        <div className="border-t border-white/10 pt-4">
                            <p className="text-[10px] uppercase tracking-[0.16em] text-white/40 mb-3">
                                Способы начисления
                            </p>
                            <LoyaltyRulesNav
                                sections={navSections}
                                activeSectionId={activeSectionId}
                                onSectionClick={handleNavClick}
                            />
                        </div>
                    </div>
                </aside>
            </div>
        </div>
    )
}
