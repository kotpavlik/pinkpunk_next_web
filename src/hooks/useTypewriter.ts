'use client'

import { useEffect, useState } from 'react'

export function useTypewriter(text: string, enabled = true) {
  const [displayedText, setDisplayedText] = useState('')
  const [currentIndex, setCurrentIndex] = useState(0)

  useEffect(() => {
    if (!enabled) {
      setDisplayedText('')
      setCurrentIndex(0)
      return
    }

    if (currentIndex >= text.length) return

    const currentChar = text[currentIndex]
    let delay: number

    if (currentChar === ' ') {
      delay = 50 + Math.random() * 30
    } else if (currentChar === '.' || currentChar === ',' || currentChar === '!' || currentChar === '?') {
      delay = 200 + Math.random() * 150
    } else {
      delay = 30 + Math.random() * 70
    }

    const timeout = window.setTimeout(() => {
      setDisplayedText((prev) => prev + currentChar)
      setCurrentIndex((prev) => prev + 1)
    }, delay)

    return () => window.clearTimeout(timeout)
  }, [currentIndex, enabled, text])

  useEffect(() => {
    setDisplayedText('')
    setCurrentIndex(0)
  }, [text, enabled])

  return displayedText
}
