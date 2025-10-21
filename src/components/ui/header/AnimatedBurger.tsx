'use client'

interface AnimatedBurgerProps {
    isOpen: boolean
    onClick: () => void
}

export default function AnimatedBurger({ isOpen, onClick }: AnimatedBurgerProps) {
    return (
        <div className="relative w-10 h-10 flex items-center justify-center">
            <svg
                className="ham hamRotate ham7 cursor-pointer transition-transform duration-400"
                viewBox="0 0 100 100"
                width="40"
                onClick={onClick}
                style={{
                    transform: isOpen ? 'rotate(45deg)' : 'rotate(0deg)',
                    transition: 'transform 400ms',
                }}
            >
                {/* Верхняя линия */}
                <path
                    className="line top"
                    d="m 70,33 h -40 c 0,0 -6,1.368796 -6,8.5 0,7.131204 6,8.5013 6,8.5013 l 20,-0.0013"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="5.5"
                    strokeLinecap="round"
                    strokeDasharray={isOpen ? "17 82" : "40 82"}
                    strokeDashoffset={isOpen ? "-62px" : "0"}
                    style={{
                        transition: 'stroke-dasharray 400ms, stroke-dashoffset 400ms',
                    }}
                />

                {/* Средняя линия */}
                <path
                    className="line middle"
                    d="m 70,50 h -40"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="5.5"
                    strokeLinecap="round"
                    strokeDasharray="40 111"
                    strokeDashoffset={isOpen ? "23px" : "0"}
                    style={{
                        transition: 'stroke-dasharray 400ms, stroke-dashoffset 400ms',
                    }}
                />

                {/* Нижняя линия */}
                <path
                    className="line bottom"
                    d="m 69.575405,67.073826 h -40 c -5.592752,0 -6.873604,-9.348582 1.371031,-9.348582 8.244634,0 19.053564,21.797129 19.053564,12.274756 l 0,-40"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="5.5"
                    strokeLinecap="round"
                    strokeDasharray="40 161"
                    strokeDashoffset={isOpen ? "-83px" : "0"}
                    style={{
                        transition: 'stroke-dasharray 400ms, stroke-dashoffset 400ms',
                    }}
                />
            </svg>

            {/* Hover эффект */}
            <div className="absolute inset-0 rounded-full hover:bg-white/10 transition-colors duration-200 pointer-events-none" />
        </div>
    )
}
