'use client'

import { useEffect, useState } from 'react'
import { DotLottieReact } from '@lottiefiles/dotlottie-react'
import HappySnowmanAnimation from '@/../public/animations/HappySnowman.json'

interface TimeLeft {
  days: number
  hours: number
  minutes: number
  seconds: number
}

export default function CountdownWidgetAll() {
  const [timeToStart, setTimeToStart] = useState<TimeLeft | null>(null) // Время до старта
  const [timeToEnd, setTimeToEnd] = useState<TimeLeft | null>(null) // Время до конца акции
  const [isActive, setIsActive] = useState(false)
  const [phase, setPhase] = useState<'before' | 'during' | 'ended'>('before')
  const [typedText, setTypedText] = useState('')
  const [isModalOpen, setIsModalOpen] = useState(false)

  // Блокировка скролла при открытии модалки
  useEffect(() => {
    if (isModalOpen) {
      document.body.style.overflow = 'hidden'
    } else {
      document.body.style.overflow = 'unset'
    }
    return () => {
      document.body.style.overflow = 'unset'
    }
  }, [isModalOpen])

  useEffect(() => {
    // Даты для виджета "Для всех"
    // СТАРТ: 22 декабря 2025, 00:00
    const startDate = new Date('2025-12-22T00:00:00')
    const endDate = new Date('2025-12-31T00:00:00')

    const calculateTime = () => {
      const now = new Date()

      // Проверяем, закончилась ли акция
      if (now >= endDate) {
        setPhase('ended')
        setIsActive(false)
        return
      }

      setIsActive(true)

      // Определяем фазу
      if (now < startDate) {
        setPhase('before')

        // Вычисляем время до старта
        const diffToStart = startDate.getTime() - now.getTime()
        setTimeToStart({
          days: Math.floor(diffToStart / (1000 * 60 * 60 * 24)),
          hours: Math.floor((diffToStart / (1000 * 60 * 60)) % 24),
          minutes: Math.floor((diffToStart / 1000 / 60) % 60),
          seconds: Math.floor((diffToStart / 1000) % 60),
        })
      } else {
        setPhase('during')
        setTimeToStart(null) // Скрываем таймер до старта
      }

      // Всегда вычисляем время до конца акции
      const diffToEnd = endDate.getTime() - now.getTime()
      setTimeToEnd({
        days: Math.floor(diffToEnd / (1000 * 60 * 60 * 24)),
        hours: Math.floor((diffToEnd / (1000 * 60 * 60)) % 24),
        minutes: Math.floor((diffToEnd / 1000 / 60) % 60),
        seconds: Math.floor((diffToEnd / 1000) % 60),
      })
    }

    // Первоначальный расчет
    calculateTime()

    // Обновление каждую секунду
    const timer = setInterval(() => {
      calculateTime()
    }, 1000)

    return () => clearInterval(timer)
  }, [])

  // Эффект печатания текста
  useEffect(() => {
    const fullText = phase === 'before' ? 'до старта осталось:' : 'успей забрать!'
    let currentIndex = 0
    setTypedText('')

    const typingInterval = setInterval(() => {
      if (currentIndex <= fullText.length) {
        setTypedText(fullText.slice(0, currentIndex))
        currentIndex++
      } else {
        clearInterval(typingInterval)
      }
    }, 50) // Скорость печати: 50ms на символ

    return () => clearInterval(typingInterval)
  }, [phase])

  if (!isActive || !timeToEnd) {
    return null
  }

  return (
    <>
      <div
        className="relative w-full p-2 md:p-4 rounded-xl md:rounded-2xl overflow-hidden"
        style={{
          background: 'rgba(255, 255, 255, 0.1)',
          backdropFilter: 'blur(10px) saturate(250%)',
          WebkitBackdropFilter: 'blur(10px) saturate(250%)',
        }}
      >
        {/* Lottie анимация в левом верхнем углу */}
        <div className="absolute -top-5 -left-5 w-48 h-48 md:w-46 md:h-46 z-0 opacity-75">
          <DotLottieReact
            data={HappySnowmanAnimation as Parameters<typeof DotLottieReact>[0]['data']}
            loop={true}
            autoplay={true}
            style={{
              width: '100%',
              height: '100%',
            }}
          />
        </div>

        <div className="relative z-10">
          {/* Заголовок */}
          <h2 className="text-xs md:text-base font-bold text-white text-center mb-1 md:mb-2 font-durik">
            ОГРОМНЫЕ СКИДКИ ДЛЯ ВСЕХ! 🎉
          </h2>

          {/* Маленький таймер до старта (показывается только в фазе 'before') */}
          {phase === 'before' && timeToStart && (
            <div className="mb-2 md:mb-3">
              <p className="text-white/90 text-center mb-1 text-[10px] md:text-xs font-blauer-nue">
                {typedText}
                <span className="animate-blink">|</span>
              </p>
              <div className="grid grid-cols-4 gap-1 max-w-[200px] mx-auto">
                <div className="flex flex-col items-center">
                  <div className="w-full aspect-square flex items-center justify-center rounded-md text-xs md:text-sm font-bold bg-white/10 text-white/70">
                    {String(timeToStart.days).padStart(2, '0')}
                  </div>
                  <span className="text-white/50 text-[8px] font-medium font-blauer-nue">дн</span>
                </div>
                <div className="flex flex-col items-center">
                  <div className="w-full aspect-square flex items-center justify-center rounded-md text-xs md:text-sm font-bold bg-white/10 text-white/70">
                    {String(timeToStart.hours).padStart(2, '0')}
                  </div>
                  <span className="text-white/50 text-[8px] font-medium font-blauer-nue">ч</span>
                </div>
                <div className="flex flex-col items-center">
                  <div className="w-full aspect-square flex items-center justify-center rounded-md text-xs md:text-sm font-bold bg-white/10 text-white/70">
                    {String(timeToStart.minutes).padStart(2, '0')}
                  </div>
                  <span className="text-white/50 text-[8px] font-medium font-blauer-nue">м</span>
                </div>
                <div className="flex flex-col items-center">
                  <div className="w-full aspect-square flex items-center justify-center rounded-md text-xs md:text-sm font-bold bg-white/10 text-white/70">
                    {String(timeToStart.seconds).padStart(2, '0')}
                  </div>
                  <span className="text-white/50 text-[8px] font-medium font-blauer-nue">с</span>
                </div>
              </div>
            </div>
          )}

          {/* Текст для активной фазы */}
          {phase === 'during' && (
            <p className="text-white/90 text-center mb-2 md:mb-3 text-[10px] md:text-xs font-blauer-nue">
              {typedText}
              <span className="animate-blink">|</span>
            </p>
          )}

          {/* Большой основной таймер */}
          <div className="grid grid-cols-4 gap-1 md:gap-2">
            {/* Дни */}
            <div className="flex flex-col items-center">
              <div
                className="w-full aspect-square flex items-center justify-center rounded-lg md:rounded-xl text-base md:text-2xl font-extrabold mb-0.5 md:mb-1 relative"
                style={{
                  background: phase === 'before' ? 'rgba(255, 255, 255, 0.1)' : 'rgba(255, 255, 255, 0.2)',
                  backdropFilter: 'blur(10px)',
                  color: phase === 'before' ? 'rgba(255, 255, 255, 0.3)' : '#16ffbd',
                  opacity: phase === 'before' ? 0.5 : 1,
                }}
              >
                {phase === 'before' && (
                  <div className="absolute inset-0 flex items-center justify-center">
                    <svg className="w-4 h-4 md:w-6 md:h-6 text-white/30" fill="currentColor" viewBox="0 0 20 20">
                      <path fillRule="evenodd" d="M5 9V7a5 5 0 0110 0v2a2 2 0 012 2v5a2 2 0 01-2 2H5a2 2 0 01-2-2v-5a2 2 0 012-2zm8-2v2H7V7a3 3 0 016 0z" clipRule="evenodd" />
                    </svg>
                  </div>
                )}
                {phase === 'during' && String(timeToEnd.days).padStart(2, '0')}
              </div>
              <span className={`text-[8px] md:text-xs font-medium font-blauer-nue ${phase === 'before' ? 'text-white/30' : 'text-white'}`}>дней</span>
            </div>

            {/* Часы */}
            <div className="flex flex-col items-center">
              <div
                className="w-full aspect-square flex items-center justify-center rounded-lg md:rounded-xl text-base md:text-2xl font-extrabold mb-0.5 md:mb-1 relative"
                style={{
                  background: phase === 'before' ? 'rgba(255, 255, 255, 0.1)' : 'rgba(255, 255, 255, 0.2)',
                  backdropFilter: 'blur(10px)',
                  color: phase === 'before' ? 'rgba(255, 255, 255, 0.3)' : '#16ffbd',
                  opacity: phase === 'before' ? 0.5 : 1,
                }}
              >
                {phase === 'before' && (
                  <div className="absolute inset-0 flex items-center justify-center">
                    <svg className="w-4 h-4 md:w-6 md:h-6 text-white/30" fill="currentColor" viewBox="0 0 20 20">
                      <path fillRule="evenodd" d="M5 9V7a5 5 0 0110 0v2a2 2 0 012 2v5a2 2 0 01-2 2H5a2 2 0 01-2-2v-5a2 2 0 012-2zm8-2v2H7V7a3 3 0 016 0z" clipRule="evenodd" />
                    </svg>
                  </div>
                )}
                {phase === 'during' && String(timeToEnd.hours).padStart(2, '0')}
              </div>
              <span className={`text-[8px] md:text-xs font-medium font-blauer-nue ${phase === 'before' ? 'text-white/30' : 'text-white'}`}>часов</span>
            </div>

            {/* Минуты */}
            <div className="flex flex-col items-center">
              <div
                className="w-full aspect-square flex items-center justify-center rounded-lg md:rounded-xl text-base md:text-2xl font-extrabold mb-0.5 md:mb-1 relative"
                style={{
                  background: phase === 'before' ? 'rgba(255, 255, 255, 0.1)' : 'rgba(255, 255, 255, 0.2)',
                  backdropFilter: 'blur(10px)',
                  color: phase === 'before' ? 'rgba(255, 255, 255, 0.3)' : '#16ffbd',
                  opacity: phase === 'before' ? 0.5 : 1,
                }}
              >
                {phase === 'before' && (
                  <div className="absolute inset-0 flex items-center justify-center">
                    <svg className="w-4 h-4 md:w-6 md:h-6 text-white/30" fill="currentColor" viewBox="0 0 20 20">
                      <path fillRule="evenodd" d="M5 9V7a5 5 0 0110 0v2a2 2 0 012 2v5a2 2 0 01-2 2H5a2 2 0 01-2-2v-5a2 2 0 012-2zm8-2v2H7V7a3 3 0 016 0z" clipRule="evenodd" />
                    </svg>
                  </div>
                )}
                {phase === 'during' && String(timeToEnd.minutes).padStart(2, '0')}
              </div>
              <span className={`text-[8px] md:text-xs font-medium font-blauer-nue ${phase === 'before' ? 'text-white/30' : 'text-white'}`}>минут</span>
            </div>

            {/* Секунды */}
            <div className="flex flex-col items-center">
              <div
                className="w-full aspect-square flex items-center justify-center rounded-lg md:rounded-xl text-base md:text-2xl font-extrabold mb-0.5 md:mb-1 relative"
                style={{
                  background: phase === 'before' ? 'rgba(255, 255, 255, 0.1)' : 'rgba(255, 255, 255, 0.2)',
                  backdropFilter: 'blur(10px)',
                  color: phase === 'before' ? 'rgba(255, 255, 255, 0.3)' : '#16ffbd',
                  opacity: phase === 'before' ? 0.5 : 1,
                }}
              >
                {phase === 'before' && (
                  <div className="absolute inset-0 flex items-center justify-center">
                    <svg className="w-4 h-4 md:w-6 md:h-6 text-white/30" fill="currentColor" viewBox="0 0 20 20">
                      <path fillRule="evenodd" d="M5 9V7a5 5 0 0110 0v2a2 2 0 012 2v5a2 2 0 01-2 2H5a2 2 0 01-2-2v-5a2 2 0 012-2zm8-2v2H7V7a3 3 0 016 0z" clipRule="evenodd" />
                    </svg>
                  </div>
                )}
                {phase === 'during' && String(timeToEnd.seconds).padStart(2, '0')}
              </div>
              <span className={`text-[8px] md:text-xs font-medium font-blauer-nue ${phase === 'before' ? 'text-white/30' : 'text-white'}`}>секунд</span>
            </div>
          </div>

          {/* Дополнительный текст для активной фазы */}
          {phase === 'during' && (
            <div className="mt-1 md:mt-2 text-center">
              <p className="text-white text-[10px] md:text-sm font-bold animate-pulse font-blauer-nue">
                ⏰ Время истекает!
              </p>
            </div>
          )}

          {/* Кнопка "Подробнее" */}
          <div className="mt-3 md:mt-4 text-center">
            <button
              onClick={() => setIsModalOpen(true)}
              className="px-4 py-2 rounded-lg font-bold text-xs md:text-sm transition-all duration-200 border-2"
              style={{
                background: 'transparent',
                borderColor: '#16ffbd',
                color: '#16ffbd',
              }}
            >
              Подробнее
            </button>
          </div>
        </div>
      </div>

      {/* Модальное окно */}
      {isModalOpen && (
        <div
          className="fixed inset-0 z-[99999] flex items-center justify-center p-4"
          onClick={() => setIsModalOpen(false)}
        >
          {/* Backdrop */}
          <div className="absolute inset-0 bg-black/80 backdrop-blur-sm" />

          {/* Modal Content */}
          <div
            className="relative w-full max-w-2xl max-h-[85vh] mt-15 overflow-y-auto rounded-2xl"
            style={{
              background: 'rgba(23, 23, 23, 0.95)',
              backdropFilter: 'blur(20px)',
              WebkitBackdropFilter: 'blur(20px)',
              border: '1px solid rgba(22, 255, 189, 0.3)',
            }}
            onClick={(e) => e.stopPropagation()}
          >
            {/* Кнопка закрытия - sticky чтобы не скроллилась */}
            <div className="sticky top-0 z-10 flex justify-end p-4 pb-0">
              <button
                onClick={() => setIsModalOpen(false)}
                className="w-8 h-8 flex items-center justify-center rounded-full transition-colors"
                style={{
                  background: 'rgba(22, 255, 189, 0.1)',
                  color: '#16ffbd',
                }}
              >
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>

            {/* Контент с отступами */}
            <div className="px-6 pb-6 md:px-8 md:pb-8">
              {/* Заголовок */}
              <h2 className="text-xl md:text-2xl font-bold mb-4 font-durik" style={{ color: '#16ffbd' }}>
                Для всех! 🎉
              </h2>

              {/* Контент */}
              <div className="space-y-4 font-blauer-nue text-white">
                <div className="space-y-3">
                  <p className="text-base md:text-lg font-bold" style={{ color: '#16ffbd' }}>
                    Друзья, становитесь нашими покупателями 💗
                  </p>
                  <p className="text-sm md:text-base leading-relaxed">
                    Регистрируйтесь и авторизовывайтесь — так нам будет проще вас найти и порадовать.
                    Мы всегда помним о своих покупателях, а для любимого комьюнити стараемся ещё больше.
                    Именно вас мы готовы вознаграждать в первую очередь.
                  </p>
                  <p className="text-sm md:text-base font-bold">
                    Сейчас — отличная возможность стать частью Pink Punk.
                  </p>
                  <p className="text-base md:text-lg font-bold" style={{ color: '#16ffbd' }}>
                    Наслаждайтесь огромными новогодними скидками от Pink Punk 🎄✨<br />
                    С Новым годом!
                  </p>
                </div>

                <div>
                  <h3 className="text-lg md:text-xl font-bold mb-3" style={{ color: '#16ffbd' }}>
                    Скидки:
                  </h3>
                  <ul className="space-y-2 text-sm md:text-base">
                    <li className="flex justify-between items-center gap-4">
                      <span>Футболки: <strong>–20%</strong></span>
                      <span className="font-bold whitespace-nowrap">145 BYN <span className="line-through opacity-50">180 BYN</span></span>
                    </li>
                    <li className="flex justify-between items-center gap-4">
                      <span>Худи премиум: <strong>–15%</strong></span>
                      <span className="font-bold whitespace-nowrap">300 BYN <span className="line-through opacity-50">350 BYN</span></span>
                    </li>
                    <li className="flex justify-between items-center gap-4">
                      <span>Худи basic: <strong>–15%</strong></span>
                      <span className="font-bold whitespace-nowrap">275 BYN <span className="line-through opacity-50">320 BYN</span></span>
                    </li>
                    <li className="flex justify-between items-center gap-4">
                      <span>Свитшот basic: <strong>–10%</strong></span>
                      <span className="font-bold whitespace-nowrap">270 BYN <span className="line-through opacity-50">300 BYN</span></span>
                    </li>
                    <li className="flex justify-between items-center gap-4">
                      <span>Джоггеры: <strong>–15%</strong></span>
                      <span className="font-bold whitespace-nowrap">195 BYN <span className="line-through opacity-50">230 BYN</span></span>
                    </li>
                    <li className="flex justify-between items-center gap-4">
                      <span>Ветровки: <strong>–10%</strong></span>
                      <span className="font-bold whitespace-nowrap">290 BYN <span className="line-through opacity-50">320 BYN</span></span>
                    </li>
                  </ul>
                </div>

                <div className="p-4 rounded-lg" style={{ background: 'rgba(22, 255, 189, 0.1)' }}>
                  <h3 className="text-lg md:text-xl font-bold mb-2" style={{ color: '#16ffbd' }}>
                    🥁 И главный аккорд этого года:
                  </h3>
                  <p className="text-base md:text-lg font-bold">
                    Пальто из 100% шерсти: <strong>–10%</strong> | 830 BYN <span className="line-through opacity-50">(920 BYN)</span>
                  </p>
                </div>

                <div className="mt-6 text-center">
                  <a
                    href="https://www.instagram.com/pinkpunk_brand?igsh=MXFnc2w2MWQ1MWE2Mg=="
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-block px-6 py-3 rounded-lg font-bold text-sm md:text-base transition-all duration-200"
                    style={{
                      background: '#16ffbd',
                      color: '#171717',
                    }}
                  >
                    Написать в Pink Punk
                  </a>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </>
  )
}

