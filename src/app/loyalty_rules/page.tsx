import LoyaltyRulesBody from '@/app/loyalty_rules/LoyaltyRulesBody'

export default function LoyaltyRulesPage() {
    return (
        <div className="relative md:max-w-[90vw] min-h-screen m-auto">
            <div className="relative z-10 min-h-screen flex flex-col pt-20 pb-20">
                <LoyaltyRulesBody />
            </div>
        </div>
    )
}
