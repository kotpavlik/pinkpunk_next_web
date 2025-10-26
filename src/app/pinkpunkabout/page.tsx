
"use client";

import PhotoSlider from "@/components/ui/shared/PhotoSlider";
import SectionText from "@/components/ui/shared/SectionText";

export default function PinkPunkAbout() {
    return (
        <div className="relative md:max-w-[80vw] m-auto">

            {/* Content Overlay */}
            <div className="relative z-10 min-h-screen  pt-20 mb-20">
                {/* Text + Photo Slider Section */}
                <section className=" mb-20 ">
                    <div className="flex flex-col items-center">
                        {/* Text - Always first */}
                        <div className="w-full">
                            <SectionText title="Немного о нас">
                                <p className="text-sm leading-relaxed">
                                    Нас зовут Игорь и Даша 💖 Да, мы пара и, как вы могли догадаться, мы и есть те самые <span className="font-bold font-durik text-[var(--color-pink-original)] uppercase">ПИНК ПАНК</span>
                                </p>

                                <p className="text-sm leading-relaxed">
                                    Мы открыли бренд в 2021 году и наша цель - отражать индивидуальность и сабомытность Беларусов через их одежду.
                                </p>

                                <p className="text-sm leading-relaxed">
                                    Мы верим, что мода должна быть доступной, качественной и
                                    экологически ответственной. Поэтому используем только
                                    качественные материалы и этичное производство.
                                </p>
                            </SectionText>
                        </div>

                        {/* Photo Slider - Always second */}
                        <div className="w-full ">
                            <PhotoSlider photos={[
                                {
                                    src: "/images/about_us_img/owners.jpeg",
                                    alt: "Владельцы Pink Punk"
                                },
                                {
                                    src: "/images/about_us_img/owners_2.jpg",
                                    alt: "Команда Pink Punk"
                                },
                                {
                                    src: "/images/about_us_img/owners_3.jpg",
                                    alt: "Команда Pink Punk"
                                },
                                {
                                    src: "/images/about_us_img/owners_4.jpg",
                                    alt: "Команда Pink Punk"
                                }
                            ]} />
                        </div>
                    </div>
                </section>

                <section className="mb-20">
                    <div className="flex flex-col items-center">
                        <div className="w-full">
                            <SectionText title="Ценности бренда">
                                <p className="text-sm leading-relaxed">
                                    В нашей философии - любовь, самобытность и искренность.
                                </p>

                                <p className="text-sm leading-relaxed ">
                                    • Любовь — в первую очередь. Ею мы делимся не только друг с другом, но и с каждым нашим покупателем. Мы вкладываем любовь в каждую вещь, которую создаём. Поддерживаем по-человечески тёплые отношения внутри команды и со всеми, кто с нами сотрудничает.
                                </p>

                                <p className="text-sm leading-relaxed">
                                    • Самобытность — это наша суть. У нас не получается копировать и заимствовать. Мы создаём только то, что любим и понимаем. Мы не подражатели - мы создатели.
                                </p>
                                <p className="text-sm leading-relaxed">
                                    • Искренность — наша основа. В мире, где все играют роли, мы помним, как быть настоящими. Мы — это мы, без масок и притворства.
                                </p>
                            </SectionText>
                        </div>

                        {/* Photo Slider - Always second */}
                        <div className="w-full ">
                            <PhotoSlider photos={[
                                {
                                    src: "/images/about_us_img/sectionTwo.jpg",
                                    alt: "Владельцы Pink Punk"
                                },
                                {
                                    src: "/images/about_us_img/sectionTwo8.jpg",
                                    alt: "Команда Pink Punk"
                                },
                                {
                                    src: "/images/about_us_img/sectionTwo1.jpg",
                                    alt: "Команда Pink Punk"
                                },
                                {
                                    src: "/images/about_us_img/sectionTwo2.jpg",
                                    alt: "Команда Pink Punk"
                                },
                                {
                                    src: "/images/about_us_img/sectionTwo3.jpg",
                                    alt: "Команда Pink Punk"
                                },
                                {
                                    src: "/images/about_us_img/sectionTwo4.jpg",
                                    alt: "Команда Pink Punk"
                                },
                                {
                                    src: "/images/about_us_img/sectionTwo5.jpg",
                                    alt: "Команда Pink Punk"
                                },

                                {
                                    src: "/images/about_us_img/sectionTwo7.jpg",
                                    alt: "Команда Pink Punk"
                                }
                            ]} />
                        </div>
                    </div>
                </section>
                <section className="mb-20">
                    <div className="flex flex-col items-center">
                        {/* Text - Always first */}
                        <div className="w-full">
                            <SectionText title="Наша миссия">
                                <p className="text-sm leading-relaxed">
                                    Наша миссия - создавать одежду, которая будет отражать индивидуальность и сабомытность Беларусов.
                                </p>

                                <p className="text-sm leading-relaxed">
                                    Мы верим, что мода должна быть доступной, качественной и
                                    экологически ответственной. Поэтому используем только
                                    качественные материалы и этичное производство.
                                </p>
                            </SectionText>
                        </div>

                        {/* Photo Slider - Always second */}
                        <div className="w-full ">
                            <PhotoSlider photos={[
                                {
                                    src: "/images/about_us_img/sectionThree.jpg",
                                    alt: "Владельцы Pink Punk"
                                },
                                {
                                    src: "/images/about_us_img/sectionThree6.jpeg",
                                    alt: "Команда Pink Punk"
                                },
                                {
                                    src: "/images/about_us_img/sectionThree1.jpg",
                                    alt: "Команда Pink Punk"
                                },
                                {
                                    src: "/images/about_us_img/sectionThree2.jpg",
                                    alt: "Команда Pink Punk"
                                },
                                {
                                    src: "/images/about_us_img/sectionThree3.jpg",
                                    alt: "Команда Pink Punk"
                                },
                                {
                                    src: "/images/about_us_img/sectionThree4.JPG",
                                    alt: "Команда Pink Punk"
                                },
                                {
                                    src: "/images/about_us_img/sectionThree5.JPG",
                                    alt: "Команда Pink Punk"
                                },
                            ]} />
                        </div>
                    </div>
                </section>
                <section className="flex-1 mb-20">
                    <div className="flex flex-col items-center">
                        {/* Text - Always first */}
                        <div className="w-full">
                            <SectionText title=" Наш топ !">
                                <p className="text-sm leading-relaxed">
                                    • Мы очень гордимся своими пальто-оверсайз. Мы хотели, чтобы пальто стало удобным и повседневным. Сделали идеальный крой, проработали каждую деталь и использовали только самую качественную ткань. И у нас получилось отличное пальто, которым мы гордимся, а вы — наслаждаетесь.
                                </p>
                            </SectionText>
                        </div>

                        {/* Photo Slider - Always second */}
                        <div className="w-full ">
                            <PhotoSlider photos={[
                                {
                                    src: "/images/about_us_img/coat.jpg",
                                    alt: "Владельцы Pink Punk"
                                },
                                {
                                    src: "/images/about_us_img/coat1.jpg",
                                    alt: "Команда Pink Punk"
                                },
                                {
                                    src: "/images/about_us_img/coat2.jpg",
                                    alt: "Команда Pink Punk"
                                },
                                {
                                    src: "/images/about_us_img/coat3.jpg",
                                    alt: "Команда Pink Punk"
                                },
                                {
                                    src: "/images/about_us_img/coat4.jpg",
                                    alt: "Команда Pink Punk"
                                },
                                {
                                    src: "/images/about_us_img/coat5.jpg",
                                    alt: "Команда Pink Punk"
                                }
                            ]} />
                        </div>
                    </div>
                </section>
            </div>
        </div>
    )
}