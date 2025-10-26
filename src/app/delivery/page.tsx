'use client'



export default function Delivery() {
    return (
        <div className="relative md:max-w-[80vw] min-h-screen m-auto">
            {/* Dark Overlay */}
            <div className="absolute inset-0 bg-background/90 z-5"></div>

            {/* Content Overlay */}
            <div className="relative z-10 min-h-screen  py-20"> <h1>Delivery</h1></div>
        </div>
    )
}