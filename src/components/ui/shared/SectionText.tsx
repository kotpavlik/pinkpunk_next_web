interface AboutTextProps {
    title: string;
    children: React.ReactNode;
    className?: string;
    titleClassName?: string;
}

export default function SectionText({ title, children, className, titleClassName }: AboutTextProps) {
    return (
        <div className="space-y-4 md:max-w-[50%] px-4 text-left">
            <h2 className={`text-3xl md:text-4xl font-durik  text-gray-500  mb-4 ${titleClassName}`}>
                {title}
            </h2>

            <div className={` text-gray-300 mb-4 ${className}`}>
                {children}
            </div>
        </div>
    );
}
