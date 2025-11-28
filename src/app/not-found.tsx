'use client'

import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { useState, useEffect } from 'react'
import { DotLottieReact } from '@lottiefiles/dotlottie-react'
import NotFoundAnimation from '@/../public/animations/404.json'

// Хук для анимации печатания с переменной скоростью (как человек)
function useTypewriter(text: string) {
  const [displayedText, setDisplayedText] = useState('')
  const [currentIndex, setCurrentIndex] = useState(0)

  useEffect(() => {
    if (currentIndex < text.length) {
      const currentChar = text[currentIndex]

      // Определяем задержку в зависимости от символа
      let delay: number

      if (currentChar === ' ') {
        // Пробелы - быстрее
        delay = 50 + Math.random() * 30
      } else if (currentChar === '.' || currentChar === ',' || currentChar === '!' || currentChar === '?') {
        // Знаки препинания - дольше (как пауза)
        delay = 200 + Math.random() * 150
      } else {
        // Обычные символы - переменная скорость (как человек печатает)
        delay = 30 + Math.random() * 70
      }

      const timeout = setTimeout(() => {
        setDisplayedText(prev => prev + currentChar)
        setCurrentIndex(prev => prev + 1)
      }, delay)

      return () => clearTimeout(timeout)
    }
  }, [currentIndex, text])

  return displayedText
}

export default function NotFound() {
  const router = useRouter()

  const fullText = 'ну честно, мы так и не поняли, что это за страница, но мы знаем, что она не существует. Возможно, она потерялась среди одежды .'
  const displayedText = useTypewriter(fullText)

  return (
    <div className="relative min-h-screen w-full overflow-hidden ">
      <div className="relative z-10 md:h-screen min-h-screen flex flex-col md:pt-20 pt-10 mb-20">
        {/* Lottie анимация на фоне */}
        <div className="absolute inset-0 w-full h-full">
          <DotLottieReact
            data={NotFoundAnimation as Parameters<typeof DotLottieReact>[0]['data']}
            loop={true}
            autoplay={true}
            style={{
              width: '100%',
              height: '100%',
              display: 'block',
            }}
          />
          {/* Затемнение фона */}
          <div className="absolute inset-0 w-full h-full bg-black/30 z-10"></div>
        </div>
        {/* Фоновые декоративные элементы */}
        <div className="absolute inset-0 overflow-hidden pointer-events-none">
          <div className="absolute top-1/4 left-1/4 w-96 h-96 bg-pink-original/10 rounded-full blur-3xl animate-pulse" />
          <div className="absolute bottom-1/4 right-1/4 w-96 h-96 bg-mint-bright/10 rounded-full blur-3xl animate-pulse" style={{ animationDelay: '1s' }} />
        </div>
        <div className="relative w-screen h-screen">


          {/* Контент */}
          <div className="absolute inset-0 z-20 flex flex-col justify-between px-4 sm:px-6 md:px-8 lg:px-12 py-8 sm:py-12 md:py-16">
            {/* Верхняя часть - заголовок и описание */}
            <div className="flex flex-col gap-4 sm:gap-6 md:gap-8 max-w-2xl">
              {/* Заголовок */}
              <h2 className="text-4xl sm:text-5xl  md:text-6xl lg:text-7xl font-durik font-black text-[var(--mint-dark)] leading-tight">
                <p>ПЭЙДЖ</p>
                <p>НОТ</p>
                <p>ФОУНД</p>
              </h2>
              {/* Описание */}
              <p className="text-sm sm:text-base md:text-lg text-foreground/70 max-w-md sm:max-w-lg">
                {displayedText}
                <span className="inline-block w-0.5 h-4 sm:h-5 md:h-6 bg-foreground/70 ml-1 animate-blink">|</span>
              </p>
            </div>
            {/* Нижняя часть - кнопки */}
            <div className="flex flex-col sm:flex-row gap-3 sm:gap-4 justify-center items-center pb-4 sm:pb-0">
              <Link
                href="/"
                className="w-full sm:w-auto px-6 sm:px-8 py-3 sm:py-4 border-2 border-foreground/30 hover:border-pink-original text-foreground hover:text-pink-original font-cabinet-grotesk font-semibold rounded-lg transition-all duration-300 text-center text-sm sm:text-base"
              >
                Вернуться на главную
              </Link>
              <Link
                href="/catalog"
                className="w-full sm:w-auto px-6 sm:px-8 py-3 sm:py-4 border-2 border-foreground/30 hover:border-mint-bright text-foreground hover:text-mint-bright font-cabinet-grotesk font-semibold rounded-lg transition-all duration-300 text-center text-sm sm:text-base"
              >
                Перейти в каталог
              </Link>
              <button
                onClick={() => router.back()}
                className="w-full sm:w-auto px-6 sm:px-8 py-3 sm:py-4 text-foreground/70 hover:text-foreground font-cabinet-grotesk font-medium transition-colors duration-300 text-sm sm:text-base"
              >
                Назад
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}

