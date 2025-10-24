
"use client";

import PhotoSlider from "@/components/ui/about/PhotoSlider";
import AboutText from "@/components/ui/about/AboutText";
import AboutText2 from "@/components/ui/about/AboutText2";
import PhotoSlider2 from "@/components/ui/about/PhotoSlider2";

export default function PinkPunkAbout() {
    return (
        <div className="relative max-w-[80vw] m-auto">
            {/* Dark Overlay */}
            <div className="absolute inset-0 bg-background/90 z-5"></div>

            {/* Content Overlay */}
            <div className="relative z-10 min-h-screen  py-20">


                {/* Text + Photo Slider Section */}
                <section className="flex-1 mb-20 ">
                    <div className="flex flex-col items-center">
                        {/* Text - Always first */}
                        <div className="w-full">
                            <AboutText />
                        </div>

                        {/* Photo Slider - Always second */}
                        <div className="w-full ">
                            <PhotoSlider />
                        </div>
                    </div>
                </section>

                <section className="flex-1 mb-20">
                    <div className="flex flex-col items-center">
                        {/* Text - Always first */}
                        <div className="w-full">
                            <AboutText2 />
                        </div>

                        {/* Photo Slider - Always second */}
                        <div className="w-full ">
                            <PhotoSlider2 />
                        </div>
                    </div>
                </section>
            </div>
        </div>
    )
}