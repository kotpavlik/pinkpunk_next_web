"use client";

interface PhotoSkeletonProps {
    className?: string;
}

export default function PhotoSkeleton({ className = "" }: PhotoSkeletonProps) {
    return (
        <div className={`relative overflow-hidden rounded-2xl ${className}`}>
            {/* Skeleton background */}
            <div className="absolute inset-0 bg-gradient-to-br from-[var(--mint-dark)]/20 to-[var(--color-pink-light)]/20" />

            {/* Animated shimmer effect */}
            <div
                className="absolute inset-0 bg-gradient-to-br from-transparent via-white/20 to-transparent"
                style={{
                    background: `
                        linear-gradient(
                            135deg,
                            transparent 0%,
                            transparent 30%,
                            rgba(255, 255, 255, 0.1) 50%,
                            rgba(255, 255, 255, 0.2) 70%,
                            transparent 100%
                        )
                    `,
                    animation: 'shimmer 2s ease-in-out infinite',
                    transform: 'translateX(-100%)',
                    willChange: 'transform'
                }}
            />

            {/* Diagonal gradient overlay */}
            <div
                className="absolute inset-0"
                style={{
                    background: `
                        linear-gradient(
                            135deg,
                            var(--mint-dark) 0%,
                            transparent 30%,
                            transparent 70%,
                            var(--color-pink-light) 100%
                        )
                    `,
                    opacity: 0.3,
                    animation: 'diagonalFlow 3s ease-in-out infinite alternate'
                }}
            />

            {/* Content placeholder */}
            <div className="absolute inset-0 flex items-center justify-center">
                <div className="w-16 h-16 rounded-full bg-white/10 flex items-center justify-center">
                    <div className="w-8 h-8 rounded-full bg-white/20 animate-pulse" />
                </div>
            </div>

            <style jsx>{`
                @keyframes shimmer {
                    0% {
                        transform: translateX(-100%) translateY(-100%);
                    }
                    100% {
                        transform: translateX(100%) translateY(100%);
                    }
                }
                
                @keyframes diagonalFlow {
                    0% {
                        background: linear-gradient(
                            135deg,
                            var(--mint-dark) 0%,
                            transparent 30%,
                            transparent 70%,
                            var(--color-pink-light) 100%
                        );
                    }
                    100% {
                        background: linear-gradient(
                            135deg,
                            var(--color-pink-light) 0%,
                            transparent 30%,
                            transparent 70%,
                            var(--mint-dark) 100%
                        );
                    }
                }
            `}</style>
        </div>
    );
}
