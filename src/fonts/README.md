# Fonts Directory

Эта папка содержит кастомные шрифты для проекта Pink Punk.

## Поддерживаемые форматы

- `.woff2` - рекомендуемый формат (лучшее сжатие)
- `.woff` - альтернативный формат
- `.ttf` - TrueType шрифты
- `.otf` - OpenType шрифты

## Как добавить новый шрифт

1. Поместите файлы шрифтов в эту папку
2. Откройте `fonts.ts` и добавьте конфигурацию:

```typescript
export const myCustomFont = localFont({
  src: [
    {
      path: "./my-font-regular.woff2",
      weight: "400",
      style: "normal",
    },
    {
      path: "./my-font-bold.woff2",
      weight: "700",
      style: "normal",
    },
  ],
  variable: "--font-my-custom",
  display: "swap",
});
```

3. Импортируйте шрифт в `layout.tsx`:

```typescript
import { myCustomFont } from '@/fonts/fonts'

// Добавьте в className:
className={`${myCustomFont.variable} ${geistSans.variable} ${geistMono.variable} antialiased`}
```

4. Используйте в CSS:

```css
.my-custom-text {
  font-family: var(--font-my-custom);
}
```

## Доступные шрифты

### ДУРИК

- **Файл:** `ДУРИК.otf`
- **Вес:** 400 (Regular)
- **CSS переменная:** `--font-durik`
- **Tailwind класс:** `font-durik`

### CabinetGrotesk (ОСНОВНОЙ ШРИФТ)

- **Файлы:** CabinetGrotesk-Thin.otf, CabinetGrotesk-Extralight.otf, CabinetGrotesk-Light.otf, CabinetGrotesk-Regular.otf, CabinetGrotesk-Medium.otf, CabinetGrotesk-Bold.otf, CabinetGrotesk-Extrabold.otf, CabinetGrotesk-Black.otf
- **Веса:** 100, 200, 300, 400, 500, 700, 800, 900
- **CSS переменная:** `--font-cabinet-grotesk`
- **Tailwind класс:** `font-cabinet-grotesk`
- **Статус:** Используется как основной шрифт для латиницы по умолчанию

## Рекомендации

- Используйте `display: 'swap'` для лучшей производительности
- Предоставляйте несколько весов шрифта (400, 500, 600, 700)
- Оптимизируйте файлы шрифтов перед добавлением
