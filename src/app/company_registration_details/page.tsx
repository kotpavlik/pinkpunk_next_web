'use client'

import SectionText from "@/components/ui/shared/SectionText"
import { useState } from "react"
import { ClipboardDocumentIcon, ClipboardDocumentCheckIcon } from "@heroicons/react/24/outline"

export default function CompanyRegistrationDetails() {
    const [copied, setCopied] = useState(false)

    const handleCopy = async () => {
        const requisites = `ООО "ПИНКПУНК"\nАдрес: РБ, 220004, Г. МИНСК, УЛ. ШОРНАЯ, Д. 20, ПОМ.1-Н, каб. 1Н-1\nУНП: 193687078\nКарт-счет: BY30ALFA30122D39660010270000 в BYN в ЗАО «Альфа-Банк», БИК: ALFABY2X\nДиректор: Ануфриев Игорь Олегович`
        try {
            await navigator.clipboard.writeText(requisites)
            setCopied(true)
            setTimeout(() => setCopied(false), 400)
        } catch {
            // clipboard might be unavailable; silently ignore
        }
    }

    return (
        <div className="relative md:max-w-[80vw] px-4 md:px-0 m-auto">
            {/* Content Overlay */}
            <div className="relative z-10  flex flex-col pt-20 mb-20">

                <div className="flex-[0_0_10%] flex">
                    <SectionText title="Реквизиты">
                        <p className="text-sm leading-relaxed">
                            Вы можете нам доверять! Мы официальная компания в Беларуси со всеми лицензиями и работаем строго по законодательству.
                        </p>
                    </SectionText>
                </div>

                <div className="flex-1 flex flex-col justify-center">
                    <div className="space-y-6 md:space-y-8">
                        <div className="relative bg-white/5 backdrop-blur-sm rounded-lg p-6 border border-white/10">
                            <div className="absolute top-0 right-0">
                                <button
                                    type="button"
                                    aria-label="Скопировать реквизиты"
                                    onClick={handleCopy}
                                    className="m-2 p-2 rounded-lg text-white/60 hover:text-white hover:bg-white/10 transition hover:scale-105"
                                >
                                    {copied ? (
                                        <ClipboardDocumentCheckIcon className="w-6 h-6 text-emerald-400" />
                                    ) : (
                                        <ClipboardDocumentIcon className="w-6 h-6" />
                                    )}
                                </button>
                            </div>
                            <div className="text-gray-300 space-y-2 tracking-wider">
                                <div className="font-bold"> ООО &quot;ПИНКПУНК&quot;</div>
                                <div className="font-black">
                                    • Адрес:
                                    <div className="font-normal"> РБ, 220004, Г. МИНСК, УЛ. ШОРНАЯ, Д. 20, ПОМ.1-Н, каб. 1Н-1
                                    </div>
                                </div>
                                <div className="font-black">
                                    • УНП:
                                    <div className="font-normal">193687078
                                    </div>
                                </div>
                                <div className="font-black">
                                    • Карт-счет:
                                    <div className="font-normal">
                                        BY30ALFA30122D39660010270000 в BYN в ЗАО &laquo;Альфа-Банк&raquo;, БИК: ALFABY2X;
                                    </div>
                                </div>
                                <div className="font-bold">
                                    • Директор:
                                    <div className="font-normal">Ануфриев Игорь Олегович
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    )
}