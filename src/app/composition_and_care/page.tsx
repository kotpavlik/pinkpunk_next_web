'use client'

import SectionText from "@/components/ui/shared/SectionText"
import Image from "next/image"

interface ProductCareType {
    productName: string;
    composition: string;
    careInstructions: string[];
    careIcons: string[];
}
interface WashingIconsType {
    id: number;
    src: string;
    alt: string;
}

const washingIcons: WashingIconsType[] = [
    {
        id: 0,
        src: "/images/care_icons/ic80-3086.svg",
        alt: "Ручная или машинная стирка при температуре 30°C"
    }, {
        id: 1,
        src: "/images/care_icons/ic80-3087.svg",
        alt: "Мягкая (деликатная) Ручная или машинная стирка при температуре 30°C. Разрешён отжим на малых оборотах."
    }, {
        id: 2,
        src: "/images/care_icons/ic80-3088.svg",
        alt: "Очень мягкая (деликатная) ручная или машинная стирка при температуре 30°C. Отжим запрещен."
    }, {
        id: 3,
        src: "/images/care_icons/ic80-3089.svg",
        alt: "Ручная или машинная стирка при температуре 40°C"
    }, {
        id: 4,
        src: "/images/care_icons/ic80-3090.svg",
        alt: "Мягкая ручная или машинная стирка при температуре 40°C Разрешён отжим на малых оборотах."
    }, {
        id: 5,
        src: "/images/care_icons/ic80-3091.svg",
        alt: "Очень мягкая (деликатная) ручная или машинная стирка при температуре 40°C. Ручной отжим запрещен."
    }, {
        id: 6,
        src: "/images/care_icons/ic80-3092.svg",
        alt: "Ручная или машинная стирка при температуре 50°C"
    }, {
        id: 7,
        src: "/images/care_icons/ic80-3093.svg",
        alt: "Мягкая ручная или машинная стирка при температуре 50°C Разрешён отжим на малых оборотах."
    }, {
        id: 8,
        src: "/images/care_icons/ic80-3094.svg",
        alt: "Ручная или машинная стирка при температуре 60°C"
    }, {
        id: 9,
        src: "/images/care_icons/ic80-3095.svg",
        alt: "Мягкая ручная или машинная стирка при температуре 60°C Разрешён отжим на малых оборотах."
    }, {
        id: 10,
        src: "/images/care_icons/ic80-3096.svg",
        alt: "Машинная стирка при температуре 70°C"
    }, {
        id: 11,
        src: "/images/care_icons/ic80-3097.svg",
        alt: "Машинная стирка при температуре 95°C"
    }, {
        id: 12,
        src: "/images/care_icons/ic80-3098.svg",
        alt: "Отбеливание разрешено"
    }, {
        id: 13,
        src: "/images/care_icons/ic80-3100A.svg",
        alt: "Сушить в горизонтальном положении в тени. Отжим разрешен"
    }, {
        id: 14,
        src: "/images/care_icons/ic80-3100B.svg",
        alt: "Сушить в горизонтальном положении в тени. Отжим запрещен"
    }, {
        id: 15,
        src: "/images/care_icons/ic80-3101.svg",
        alt: "Разрешена сушка в горизонтальном положении без отжима."
    }, {
        id: 16,
        src: "/images/care_icons/ic80-3102.svg",
        alt: "Разрешена сушка в горизонтальном положении в тени и без отжима."
    }, {
        id: 17,
        src: "/images/care_icons/ic80-3103A.svg",
        alt: "влажное изделие необходимо подвешивать в вертикальном положении для сушки. Отжим разрешён"
    }, {
        id: 18,
        src: "/images/care_icons/ic80-3103B.svg",
        alt: "Сушка на веревке или вешалке после стирки. Разрешён отжим."
    }, {
        id: 19,
        src: "/images/care_icons/ic80-3104A.svg",
        alt: "Сушить можно вертикально, исключая возедйствие солнечных лучей (в тени). Отжим разрешен"
    }, {
        id: 20,
        src: "/images/care_icons/ic80-3104B-1.svg",
        alt: "Разрешена сушка на верёвке в тени и без отжима"
    }, {
        id: 21,
        src: "/images/care_icons/ic80-3104B.svg",
        alt: "Разрешена сушка на верёвке в тени с отжимом"
    }, {
        id: 22,
        src: "/images/care_icons/ic80-3105A.svg",
        alt: "Сушить можно в вертикальном положении без отжима."
    }, {
        id: 23,
        src: "/images/care_icons/ic80-3106A.svg",
        alt: "Сушить можно вертикально, исключая воздействие солнечных лучей (в тени). Отжим запрещен"
    }, {
        id: 24,
        src: "/images/care_icons/ic80-3107-line1.svg",
        alt: "деликатная сушка при температуре не более 60°C"
    }, {
        id: 25,
        src: "/images/care_icons/ic80-3107-line2.svg",
        alt: "очень деликатная сушка при температуре не более 60°C"
    }, {
        id: 26,
        src: "/images/care_icons/ic80-3107.svg",
        alt: "сушка в барабане при температуре не выше 60°C"
    }, {
        id: 27,
        src: "/images/care_icons/ic80-3108-line1.svg",
        alt: "деликатная сушка при температуре не выше 80°C"
    }, {
        id: 28,
        src: "/images/care_icons/ic80-3108-line2.svg",
        alt: "Очень деликатная сушка при температуре не выше 80°C"
    }, {
        id: 29,
        src: "/images/care_icons/ic80-3108.svg",
        alt: "сушка в барабане при температуре не выше 80°C"
    }, {
        id: 30,
        src: "/images/care_icons/ic80-3109.svg",
        alt: "изделие запрещено сушить в «барабане» стиральной или сушильной машины."
    }, {
        id: 31,
        src: "/images/care_icons/ic80-3110.svg",
        alt: "Разрешено глажение при температуре подошвы утюга не более 110°C с изнаночной стороны"
    }, {
        id: 32,
        src: "/images/care_icons/ic80-3111.svg",
        alt: "Разрешено глажение при температуре подошвы утюга не более 150°C с изнаночной стороны"
    }, {
        id: 33,
        src: "/images/care_icons/ic80-3112.svg",
        alt: "Разрешено глажение при температуре подошвы утюга не более 200°C с изнаночной стороны"
    }, {
        id: 34,
        src: "/images/care_icons/ic80-3113.svg",
        alt: "изделие нельзя гладить утюгом"
    }, {
        id: 35,
        src: "/images/care_icons/ic80-3114.svg",
        alt: "химчистка запрещена"
    }, {
        id: 36,
        src: "/images/care_icons/ic80-3115.svg",
        alt: "химчистка возможна только углеводородами или трифтортрихлорэтаном с применением стандартных процессов обработки"
    }, {
        id: 37,
        src: "/images/care_icons/ic80-3116.svg",
        alt: "деликатная химчистка в углеводородах с ограничением механического воздействия и температуры при сушке. Чистка допускается только с применением углеводородов или трифтортрихлорэтана с ограничением добавления воды."
    }, {
        id: 38,
        src: "/images/care_icons/ic80-3117.svg",
        alt: "химчистку можно производить с использованием перхлорэтилена (ПХЭ),  трифтортрихлорэтилена, моно-фтортрихлорметана с применением стандартных процессов обработки"
    }, {
        id: 39,
        src: "/images/care_icons/ic80-3118.svg",
        alt: "деликатная чистка в указанных  растворителях. Чистка изделия может производиться с применением ПХЭ,  трифтортрихлорэтилена, или моно-фтортрихлорметана с ограничением добавления воды"
    }, {
        id: 40,
        src: "/images/care_icons/ic80-3119.svg",
        alt: "аквачистка разрешена"
    }, {
        id: 41,
        src: "/images/care_icons/ic80-3120.svg",
        alt: "Разрешена деликатная аквачистка"
    }, {
        id: 42,
        src: "/images/care_icons/ic80-3121.svg",
        alt: "Разрешена очень деликатная аквачистка"
    }, {
        id: 43,
        src: "/images/care_icons/ic80-3122.svg",
        alt: "Аквачистка запрещена"
    }, {
        id: 44,
        src: "/images/care_icons/ic80-3123.svg",
        alt: "Замачивание запрещено"
    }, {
        id: 45,
        src: "/images/care_icons/ic80-3124.svg",
        alt: "Отбеливание запрещено"
    }, {
        id: 46,
        src: "/images/care_icons/ic80-3125.svg",
        alt: "только ручная непродолжительная стирка при температуре не выше 40°C"
    }, {
        id: 47,
        src: "/images/care_icons/ic80-circle-a.svg",
        alt: "химчистка возможна с применением любых органических растворителей"
    }, {
        id: 48,
        src: "/images/care_icons/ic80-circle-line1.svg",
        alt: "сухая чистка без отпаривания"
    }, {
        id: 49,
        src: "/images/care_icons/ic80-circle-line2.svg",
        alt: "сухая чистка при пониженной влажности"
    }, {
        id: 50,
        src: "/images/care_icons/ic80-circle-line3.svg",
        alt: "разрешена сухая чистка с сокращенным циклом"
    }, {
        id: 51,
        src: "/images/care_icons/ic80-circle-line4.svg",
        alt: "разрешена сухая чистка при низкой температуре"
    }, {
        id: 52,
        src: "/images/care_icons/ic80-not-steaming.svg",
        alt: "глажение с паром, отпаривание запрещено"
    }, {
        id: 53,
        src: "/images/care_icons/ic80-not-turfing.svg",
        alt: "скручивать изделие запрещено"
    }, {
        id: 54,
        src: "/images/care_icons/ic80-oxygen.svg",
        alt: "отбеливать только кислородсодержащим или любым нехлорным агентом"
    }, {
        id: 55,
        src: "/images/care_icons/ic80-square-circle.svg",
        alt: "изделие можно сушить в «барабане» стиральной или сушильной машины."
    }, {
        id: 56,
        src: "/images/care_icons/ic80-square-circlefill.svg",
        alt: "сушка обдувом без нагревания"
    }, {
        id: 57,
        src: "/images/care_icons/ic80-square-line1.svg",
        alt: "Сушить в горизонтальном положении. Отжим разрешён"
    },
]

const ProductCare: ProductCareType[] = [
    {
        productName: "t-shirt PINK PUNK PATTERN",
        composition: "100% хлопок",
        careInstructions: [washingIcons[0].alt, washingIcons[44].alt, washingIcons[45].alt, washingIcons[57].alt, washingIcons[31].alt, washingIcons[5].alt],
        careIcons: [washingIcons[0].src, washingIcons[44].src, washingIcons[45].src, washingIcons[33].src, washingIcons[4].src, washingIcons[53].src]
    },

]

export default function CompasitionAndCare() {
    return (
        <div className="relative md:max-w-[80vw] px-4 md:px-0 m-auto">
            {/* Content Overlay */}
            <div className="relative z-10  flex flex-col pt-20 mb-20">
                <div className="flex-[0_0_10%] flex">
                    <SectionText title="Состав и уход">
                        <p className="text-sm leading-relaxed text-white/50">
                            Чем бережнее вы заботитесь об изделии, тем дольше оно прослужит.

                            Грамотный уход — один из главных факторов, влияющих на то, как долго вы сможете носить вещь в первозданном виде. Ниже собрали для вас подробные инструкции по уходу за нашими изделиями.
                        </p>
                    </SectionText>
                </div>

                <div className="flex-1 flex flex-col justify-center">
                    <div className="space-y-6 md:space-y-8">
                        {ProductCare.map((product: ProductCareType) => (
                            <div key={product.productName} className="bg-white/5 backdrop-blur-sm rounded-lg p-6 border border-white/10">
                                <h3 className="text-lg border-b border-white/10 pb-2 mb-20 text-center font-durik font-normal text-[var(--color-green)] ">{product.productName}</h3>
                                <h2 className="text-md font-durik font-normal text-[var(--color-green)] ">Состав:
                                    <div className="font-light pl-2 font-cabinet-grotesk text-white/50">{product.composition}</div>
                                </h2>
                                <h2 className="text-md font-durik font-normal text-[var(--color-green)] mb-4">Уход:
                                    <div className="font-light pl-2 font-cabinet-grotesk text-white/50">
                                        <ol className="list-disc list-inside space-y-1">
                                            {product.careInstructions.map((instruction, index) => (
                                                <li key={index}>{instruction}</li>
                                            ))}
                                        </ol>
                                    </div>
                                </h2>

                                <div className="flex flex-row w-full justify-center">
                                    {product.careIcons.map((iconSrc, index) => (
                                        <Image key={index} src={iconSrc} alt={product.careInstructions[index] || ""} width={50} height={50} />
                                    ))}
                                </div>
                            </div>
                        ))}
                    </div>
                </div>
            </div>
        </div>
    )
}