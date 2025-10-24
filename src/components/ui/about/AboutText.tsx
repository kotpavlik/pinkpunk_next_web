export default function AboutText() {
    return (
        <div className="space-y-4 md:max-w-[50%] px-4 text-left">
            <h2 className="text-3xl md:text-4xl font-durik  text-gray-500  mb-4">
                Немного о нас
            </h2>

            <div className=" text-gray-300 mb-4">
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
            </div>
        </div>
    );
}
