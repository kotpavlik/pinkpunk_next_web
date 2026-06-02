export type LoyaltyRuleSectionId = 'shop' | 'reels' | 'referral' | 'donate'

export type LoyaltyRuleSection = {
    id: LoyaltyRuleSectionId
    title: string
    accent: string
    summary: string
    bullets?: string[]
    rewards?: { label: string; value: string }[]
    note?: string
    bonus?: string
    videoSubmitHint?: boolean
}

export const LOYALTY_RULE_SECTIONS: LoyaltyRuleSection[] = [
    {
        id: 'shop',
        title: 'Покупки в магазине',
        accent: 'var(--mint-bright)',
        summary:
            'За каждую покупку начисляются PTS (точное количество зависит от чека). Это основной и самый быстрый способ роста уровня.',
    },
    {
        id: 'reels',
        title: 'Видео Reels в Instagram',
        accent: 'var(--pink-punk)',
        summary: 'Снимай Reels о Pink Punk и получай PTS за качественный контент.',
        bullets: [
            'Видео должно быть о Pink Punk — одежда, атмосфера, магазин и т.д.',
            'Ты должен быть в одежде Pink Punk (её можно взять для съёмки в нашем магазине).',
            'Обязательно отметь наш аккаунт — @pinkpunk_brand.',
            'Видео не короче 3 секунд — ролики на 1–2 сек не засчитываются.',
            'Мы можем не засчитать видео, которое считаем «хакингом»: нарезка чужих роликов, нет отметки, явная накрутка.',
        ],
        rewards: [
            { label: 'За видео после проверки', value: '10 PTS' },
            { label: 'Бонус за просмотры', value: '+10 PTS за каждые 10 000' },
        ],
        videoSubmitHint: true,
    },
    {
        id: 'referral',
        title: 'Реферальная программа',
        accent: 'var(--level-gold)',
        summary:
            'В Telegram-мини-приложении есть реферальная ссылка. Делись ей с друзьями — получай PTS за их активность.',
        bullets: [
            'Реферал зашёл по твоей ссылке, но у него ещё 0 PTS — ничего не начисляется.',
            'Как только реферал получает первые 1+ PTS (за заказ, Instagram, оффлайн и т.д.), пригласившему начисляется +10 PTS.',
            'Дальше, даже если реферал набирает ещё PTS, этот бонус не повторяется.',
        ],
        rewards: [{ label: 'За каждого активного друга', value: '10 PTS' }],
        bonus: 'Если другу не нужны PTS, мы зачислим их тебе за его активность (покупки, видео, донат) — по согласованию с другом. Просто сообщи нам об этом.',
    },
    {
        id: 'donate',
        title: 'Донат в TON',
        accent: '#0098EA',
        summary:
            'Наши мечты — большой красивый магазин и делать для вас самые крутые активности мирового масштаба. Больше мы распишем на странице «Наши мечты».',
        rewards: [{ label: 'Курс начисления', value: '1 TON = 5 PTS' }],
    },
]
