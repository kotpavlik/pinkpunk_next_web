'use client'

import React, { useState, useEffect } from 'react'
import Link from 'next/link'

export default function PrivacyPolicyPage() {
    const [language, setLanguage] = useState<'ru' | 'en'>('ru')
    const [content, setContent] = useState<string>('')
    const [loading, setLoading] = useState(true)

    useEffect(() => {
        const loadPrivacyPolicy = async () => {
            setLoading(true)
            try {
                const fileName = language === 'ru' ? 'privacy_policy_ru.md' : 'privacy_policy_en.md'
                const response = await fetch(`/${fileName}`)
                const text = await response.text()
                setContent(text)
            } catch (error) {
                console.error('Error loading privacy policy:', error)
            } finally {
                setLoading(false)
            }
        }

        loadPrivacyPolicy()
    }, [language])

    // Простой парсер markdown для отображения контента
    const renderContent = (text: string) => {
        const lines = text.split('\n')
        const elements: React.JSX.Element[] = []
        let key = 0

        lines.forEach((line, index) => {
            if (!line.trim()) {
                elements.push(<div key={`space-${key++}`} className="h-4" />)
                return
            }

            // Заголовки
            if (line.startsWith('# ')) {
                elements.push(
                    <h1 key={`h1-${key++}`} className="text-4xl font-bold text-[var(--mint-bright)] mb-6 font-durik">
                        {line.replace('# ', '')}
                    </h1>
                )
            } else if (line.startsWith('## ')) {
                elements.push(
                    <h2 key={`h2-${key++}`} className="text-3xl font-bold text-[var(--mint-bright)] mb-4 mt-8 font-durik">
                        {line.replace('## ', '')}
                    </h2>
                )
            } else if (line.startsWith('### ')) {
                elements.push(
                    <h3 key={`h3-${key++}`} className="text-2xl font-semibold text-white mb-3 mt-6">
                        {line.replace('### ', '')}
                    </h3>
                )
            }
            // Проверка на заголовок без хештегов (следующая строка после заголовка - пустая или это первые строки)
            else if (
                (index === 0 || index === 2) &&
                line.length < 100 &&
                !line.includes(':') &&
                !line.match(/^[a-zа-я]/i)
            ) {
                elements.push(
                    <h2 key={`title-${key++}`} className="text-3xl font-bold text-[var(--mint-bright)] mb-4 mt-8 font-durik">
                        {line}
                    </h2>
                )
            }
            // Email
            else if (line.includes('Email:') || line.includes('email:')) {
                const emailMatch = line.match(/([\w.-]+@[\w.-]+\.\w+)/)
                if (emailMatch) {
                    elements.push(
                        <p key={`email-${key++}`} className="text-white/90 mb-3 leading-relaxed">
                            Email: <a href={`mailto:${emailMatch[1]}`} className="text-[var(--mint-bright)] hover:underline">{emailMatch[1]}</a>
                        </p>
                    )
                } else {
                    elements.push(
                        <p key={`p-${key++}`} className="text-white/90 mb-3 leading-relaxed">
                            {line}
                        </p>
                    )
                }
            }
            // Обычный текст
            else {
                elements.push(
                    <p key={`p-${key++}`} className="text-white/90 mb-3 leading-relaxed">
                        {line}
                    </p>
                )
            }
        })

        return elements
    }

    return (
        <div className="min-h-screen bg-black text-white">
            {/* Header */}
            <header className="sticky top-0 z-50 bg-black/80 backdrop-blur-md border-b border-white/10">
                <div className="max-w-6xl mx-auto px-4 py-4 flex items-center justify-between">
                    <Link
                        href="/"
                        className="text-[var(--mint-bright)] hover:text-[var(--mint-bright)]/70 transition-colors font-durik text-xl"
                    >
                        ← {language === 'ru' ? 'Назад' : 'Back'}
                    </Link>

                    <div className="flex gap-2">
                        <button
                            onClick={() => setLanguage('ru')}
                            className={`px-4 py-2 rounded-lg transition-all ${language === 'ru'
                                ? 'bg-[var(--mint-bright)] text-black font-semibold'
                                : 'bg-[#2a2a2a] text-white/70 hover:bg-[#333]'
                                }`}
                        >
                            RU
                        </button>
                        <button
                            onClick={() => setLanguage('en')}
                            className={`px-4 py-2 rounded-lg transition-all ${language === 'en'
                                ? 'bg-[var(--mint-bright)] text-black font-semibold'
                                : 'bg-[#2a2a2a] text-white/70 hover:bg-[#333]'
                                }`}
                        >
                            EN
                        </button>
                    </div>
                </div>
            </header>

            {/* Content */}
            <main className="max-w-4xl mx-auto px-4 py-12">
                {loading ? (
                    <div className="flex items-center justify-center min-h-[400px]">
                        <div className="animate-pulse text-[var(--mint-bright)] text-xl">
                            {language === 'ru' ? 'Загрузка...' : 'Loading...'}
                        </div>
                    </div>
                ) : (
                    <article className="prose prose-invert prose-lg max-w-none">
                        {renderContent(content)}
                    </article>
                )}
            </main>

            {/* Footer */}
            <footer className="border-t border-white/10 mt-20">
                <div className="max-w-6xl mx-auto px-4 py-8 text-center text-white/50 text-sm">
                    © 2025 Pink Punk Brand. All rights reserved.
                </div>
            </footer>
        </div>
    )
}

