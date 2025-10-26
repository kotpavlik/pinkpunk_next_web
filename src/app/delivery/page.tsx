'use client'

import SectionText from "@/components/ui/shared/SectionText"
import Image from "next/image";

const photos = [
    {
        src: "/images/delivery/Minsk.svg",
        alt: "Доставка"
    },
    {
        src: "/images/delivery/Belarus.svg",
        alt: "Доставка"
    },
    {
        src: "/images/delivery/World.svg",
        alt: "Доставка"
    }
]



export default function Delivery() {
    return (
        <div className="relative md:max-w-[80vw] min-h-screen m-auto">

            {/* Content Overlay */}
            <div className="relative z-10 md:h-screen min-h-screen flex flex-col pt-20 mb-20">

                <div className="flex-[0_0_10%] flex ">
                    <SectionText title="Доставка">
                        <p className="text-sm leading-relaxed">
                            У нас одна из лучших доставок в Беларуси. Мы всегда забодимся о вашем времени и вашем комфорте.
                        </p>
                    </SectionText>
                </div>

                <div className="flex-1 flex md:flex-row flex-col">
                    {photos.map((photo, index) => (
                        <div key={index} className="flex-1  relative m-2 " style={{ borderRadius: '10px', overflow: 'hidden', boxShadow: '0 0 10px 0 var(--mint-dark)', border: '1px solid var(--green)' }}>
                            <Image
                                src={photo.src}
                                alt={photo.alt}
                                width={900}
                                height={900}
                                style={{
                                    // iOS image optimization
                                    transform: 'translate3d(0,0,0)',
                                    backfaceVisibility: 'hidden',
                                    WebkitBackfaceVisibility: 'hidden',
                                    WebkitTransform: 'translate3d(0,0,0)',
                                    // Prevent image flickering
                                    willChange: 'transform',
                                    // Optimize for mobile
                                    imageRendering: 'auto'
                                }}
                            />
                        </div>
                    ))}
                </div>
            </div>
        </div>
    )
}