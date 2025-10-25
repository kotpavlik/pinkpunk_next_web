export default function AboutText4() {
    return (
        <div className="space-y-4 md:max-w-[50%] px-4 text-left">
            <h2 className="text-3xl md:text-4xl font-durik text-gray-500 mb-6 uppercase" style={{
                // iOS Safari margin fix
                marginBottom: '1.5rem'
            } as React.CSSProperties & {
                WebkitMarginBefore?: string;
                WebkitMarginAfter?: string;
            }}>
                Наш топ !
            </h2>

            <div className="text-gray-300 mb-6" style={{
                // iOS Safari margin fix
                marginBottom: '1.5rem'
            } as React.CSSProperties & {
                WebkitMarginAfter?: string;
            }}>
                <p className="text-sm leading-relaxed">
                    • Мы очень гордимся своими пальто-оверсайз. Мы хотели, чтобы пальто стало удобным и повседневным. Сделали идеальный крой, проработали каждую деталь и использовали только самую качественную ткань. И у нас получилось отличное пальто, которым мы гордимся, а вы — наслаждаетесь.
                </p>
            </div>
        </div>
    );
}
