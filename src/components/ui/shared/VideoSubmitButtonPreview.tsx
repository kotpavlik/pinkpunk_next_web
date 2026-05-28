import ProfileActionTile from '@/components/ui/shared/ProfileActionTile'

type Props = {
    href?: string
    className?: string
    compact?: boolean
    onClick?: () => void
}

/** Кнопка «Я снял видео» для правил PTS и профиля. */
export default function VideoSubmitButtonPreview({
    href,
    className = '',
    compact = false,
    onClick,
}: Props) {
    return (
        <ProfileActionTile
            variant="instagram-reels"
            title="Я снял видео"
            subtitle="Ссылка на Reels"
            href={onClick ? undefined : href}
            onClick={onClick}
            className={`${compact ? 'sm:max-w-[17rem]' : 'sm:max-w-[19rem]'} ${className}`.trim()}
        />
    )
}
