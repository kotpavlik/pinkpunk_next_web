# Pink Punk — design tokens для Telegram Mini App

Спека для агента / разработчика TMA: какие цвета, шрифты и поверхности использует основной сайт (`pinkpunk_next_web`) и как их применять в Mini App, чтобы UI совпадал с веб-версией.

**Источник истины в коде:** `src/app/globals.css`, `src/utils/loyaltyLevelTheme.ts`.

**Связанные документы:** loyalty API — отдельные spec-файлы в `docs/`; CRM — `docs/CRM_FRONTEND_AGENT.md` (admin, не для TMA).

---

## 1. Принципы

1. **Только dark theme** — светлая тема на сайте не используется.
2. **Не выдумывать новые accent-цвета** — брать токены из таблиц ниже.
3. **Розовый** = бренд Pink Punk + destructive + ошибки валидации.
4. **Mint bright** = деньги, confirm, primary success.
5. **Mint dark** = shopping (корзина, цены, CTA «в корзину»).
6. **Green (`--green`)** = каталог (border карточки) и gift terminal; не путать с mint.
7. **Уровни лoyalty** — только `--level-*`; пороги exp не хардкодить (данные из API).
8. **Admin CRM** (`#252525`, `#333`) — не переносить в TMA; это админка.

---

## 2. CSS-переменные (`:root`)

Скопировать в стили TMA один в один:

```css
:root {
  /* Base */
  --background: #171717;
  --foreground: #ededed;

  /* Brand — pink */
  --pink-punk: #ff2b9c;
  --pink-dark: #c34271;
  --pink-light: #f070a1;

  /* Actions — mint */
  --mint-bright: #16ffbd;
  --mint-light: #4dd4a7;
  --mint-dark: #12c998;

  /* Catalog / gift terminal */
  --green: #439f76;

  /* Loyalty levels */
  --level-bronze: #cd7f32;
  --level-silver: #c0c0c0;
  --level-gold: #ffd700;
  --level-sapphire: #0f52ba;
  --level-ruby: #e0115f;

  --glow-bronze: 0 0 4px var(--level-bronze);
  --glow-silver: 0 0 6px var(--level-silver);
  --glow-gold: 0 0 8px var(--level-gold);
  --glow-sapphire: 0 0 8px var(--level-sapphire);
  --glow-ruby: 0 0 12px var(--level-ruby);

  --loyalty-progress-track: #2a2d35;
}
```

### Tailwind v4 (`@theme inline` на сайте)

Для справки — алиасы в веб-проекте:

| Token | CSS var |
|-------|---------|
| `color-pink-original` | `--pink-punk` |
| `color-pink-dark` | `--pink-dark` |
| `color-pink-light` | `--pink-light` |
| `color-mint-bright` | `--mint-bright` |
| `color-mint-dark` | `--mint-dark` |
| `color-green` | `--green` |

---

## 3. JSON tokens (для TS / `@tma.js` / theme provider)

```json
{
  "color": {
    "background": "#171717",
    "foreground": "#ededed",
    "surface": {
      "glass": "rgba(255, 255, 255, 0.05)",
      "modal": "#0a0a0b",
      "orderCard": "#2a2f31"
    },
    "border": {
      "default": "rgba(255, 255, 255, 0.10)",
      "muted": "rgba(255, 255, 255, 0.06)",
      "focusMint": "rgba(18, 201, 152, 0.80)"
    },
    "brand": {
      "pink": "#ff2b9c",
      "pinkDark": "#c34271",
      "pinkLight": "#f070a1"
    },
    "action": {
      "primary": "#16ffbd",
      "primaryText": "#000000",
      "secondary": "#12c998",
      "secondaryHover": "rgba(18, 201, 152, 0.90)"
    },
    "commerce": {
      "price": "#12c998",
      "total": "#16ffbd",
      "catalogAccent": "#439f76"
    },
    "giftTerminal": {
      "border": "#439f76",
      "text": "#439f76",
      "success": "#5cb88a",
      "shellBg": "#050805"
    },
    "text": {
      "primary": "#ffffff",
      "secondary": "rgba(255, 255, 255, 0.70)",
      "muted": "rgba(255, 255, 255, 0.45)",
      "disabled": "rgba(255, 255, 255, 0.35)"
    },
    "status": {
      "error": "#fca5a5",
      "errorBorder": "#ff2b9c",
      "success": "#5cb88a",
      "warning": "#fbbf24"
    },
    "loyalty": {
      "explorer": "#cd7f32",
      "regular": "#c0c0c0",
      "vibeKeeper": "#ffd700",
      "insider": "#0f52ba",
      "legend": "#e0115f",
      "progressTrack": "#2a2d35"
    }
  },
  "font": {
    "display": "Durik, system-ui, sans-serif",
    "body": "Cabinet Grotesk, system-ui, sans-serif",
    "commerce": "Blauer Neue, system-ui, sans-serif",
    "mono": "Geist Mono, ui-monospace, monospace"
  },
  "radius": {
    "card": "0.75rem",
    "button": "0.5rem",
    "modal": "0.75rem",
    "pill": "9999px"
  }
}
```

---

## 4. Семантика: цвет → задача

| Задача | Token / HEX | Пример на сайте |
|--------|-------------|-----------------|
| Фон приложения | `--background` `#171717` | `body`, TMA viewport |
| Ambient glow сверху | `--mint-light` @ 30% blur | `body::before` |
| Логотип, H1, бренд | `--pink-punk` | Header, profile title |
| Hover розовых кнопок | `--pink-dark` | Login, delete |
| Мягкий розовый hover | `--pink-light` | Cart modal checkout hover |
| Primary CTA (confirm) | `--mint-bright` + `text-black` | CRM apply, order total |
| Shopping CTA | `--mint-dark` | «в корзину», product page |
| Цена в каталоге | `--mint-dark` | Catalog, carousel |
| Итого / сумма заказа | `--mint-bright` | Cart, success page |
| Border хедера / каталога | `--mint-dark` | Header bottom, card slide-up |
| Gift terminal | `--green` `#439f76` | Loyalty gift popout |
| «Подарок получен» | `#5cb88a` | Gift terminal footer |
| Ошибка поля | border `--pink-punk` | ProfileIdentityEditModal |
| Текст ошибки | `text-red-300/90` | Gift/API errors |
| Glass-карточка | `bg-white/5` + `border-white/10` | Profile blocks, catalog overlay |
| Модалка / drawer | `#0a0a0b` @ 95–97% + blur | Loyalty popout, profile modal |
| Backdrop | `bg-black/55` | Loyalty drawer |
| Бейдж корзины | `bg-[var(--pink-punk)]` | Header cart count |
| Spinner | `border-[var(--mint-bright)]` | Loading states |
| Destructive (outline) | `border-[var(--pink-punk)]` text pink | CRM revoke gift |

---

## 5. Кнопки (иерархия)

### Primary filled — mint

```txt
bg: var(--mint-bright)
text: #000000
hover: opacity 0.9
```

Использовать: подтверждение, «Применить», итоговые суммы как акцент рядом с CTA.

### Primary filled — pink

```txt
bg: var(--pink-punk)
text: #ffffff
hover: var(--pink-dark) или #e02488
```

Использовать: удаление, вход, главный submit в формах профиля.

### Secondary outline — mint (loyalty / подарки)

```txt
border: #12c998 / 45%
text: #12c998
bg: transparent
hover: border #12c998/70, bg #12c998/10
```

Использовать: «Получить подарок», «В каталог».

### Secondary outline — mint (CRM-style, var)

```txt
border: var(--mint-bright)
text: var(--mint-bright)
bg: transparent
hover: bg var(--mint-bright)/10
```

### Ghost

```txt
border: white/15
bg: white/[0.06]
text: white/85
```

Использовать: «Закрыть» в drawer.

### Destructive outline — pink

```txt
border: var(--pink-punk)
text: var(--pink-punk)
bg: transparent
```

Использовать: «Отменить получение» (CRM; в TMA может не понадобиться).

### Add to cart (catalog)

```txt
bg: var(--mint-dark) / 70%
text: white
hover: var(--green) / 80% (на сайте иногда --green)
```

---

## 6. Поверхности и layout

| Элемент | Стиль |
|---------|--------|
| Страница | `#171717`, без белого фона |
| Карточка товара (overlay) | border-top `var(--mint-dark)`, bg `var(--background)` |
| Карточка заказа | `#2a2f31`, `border-white/10`, hover border `mint-bright` |
| Input | `bg-white/[0.06]`, `border-white/15`, focus `border #12c998/80`, ring `#12c998/40` |
| Input error | `border-[var(--pink-punk)]/80` |
| Scrollbar (admin only) | thumb `pink-punk` — в TMA можно не повторять |

---

## 7. Лояльность — цвета уровней

| `level.id` | Label | Color var | HEX |
|------------|-------|-----------|-----|
| `explorer` | Explorer | `--level-bronze` | `#cd7f32` |
| `regular` | Regular | `--level-silver` | `#c0c0c0` |
| `vibe_keeper` | Vibe Keeper | `--level-gold` | `#ffd700` |
| `insider` | Insider | `--level-sapphire` | `#0f52ba` |
| `legend` | Legend | `--level-ruby` | `#e0115f` |

**Применение:**

- Заголовок popout уровня — `labelColor` уровня.
- Top border drawer — `theme.labelColor` (3px).
- Glow карточки текущего уровня — `--glow-*`.
- Прогресс-бар track — `--loyalty-progress-track`.
- Fill прогресса — mix текущего level color + track.

**Не использовать** level colors для обычных кнопок магазина — только контекст loyalty.

---

## 8. Gift terminal (Regular)

Отдельная «retro terminal» палитра внутри loyalty popout:

| Элемент | Значение |
|---------|----------|
| Border / monospace text | `#439f76` (`--green`) |
| Shell background | `#050805` + radial green glow |
| Cursor / blink | `#439f76` |
| Status «ожидает» | blink animation, `#439f76` |
| Status «получен» | `#5cb88a` |
| Confirm button | border `#439f76/55`, bg `#439f76/10`, text `#5cb88a` |
| Rabbit strip bg | `#439f76` @ 6% |

Explorer **не имеет** gift terminal. Vibe Keeper / Insider / Legend — terminal без кролика (flow позже).

---

## 9. Шрифты (типографика)

### 9.1. Общая иерархия

| Роль | Шрифт | CSS class | CSS variable | Когда использовать |
|------|-------|-----------|--------------|-------------------|
| **Display / brand** | **ДУРИК** (Durik) | `font-durik` | `--font-durik` | Логотип PINK PUNK, H1 страниц, заголовки лояльности, level popout, countdown, admin H1, toast level-up |
| **Body default** | **Cabinet Grotesk** | `font-cabinet-grotesk` | `--font-cabinet-grotesk` | Весь сайт по умолчанию (`body`), параграфы, формы, карты, вторичный UI |
| **Commerce / UI** | **Blauer Nue** | `font-blauer-nue` | `--font-blauer-nue` | Каталог, карточка товара, корзина, checkout, цены, кнопки «в корзину», итоги заказа |
| **Monospace** | **Geist Mono** (Google) | `font-mono` | `--font-geist-mono` | Gift terminal, коды `PP-XXXX`, технические строки |

**Geist Sans** (`--font-geist-sans`) подключён в Next.js, но **не используется** как основной — body = Cabinet Grotesk.

### 9.2. Файлы шрифтов (репозиторий)

Папка: `src/fonts/` (локальные `.otf`, подключаются через `next/font/local` в `src/fonts/fonts.ts`).

| Шрифт | Файлы | Веса |
|-------|-------|------|
| **ДУРИК** | `ДУРИК.otf` | 400 (единственный) |
| **Cabinet Grotesk** | `CabinetGrotesk-Thin.otf` … `CabinetGrotesk-Black.otf` | 100, 200, 300, 400, 500, 700, 800, 900 |
| **Blauer Nue** | `Blauer-Nue-*.otf` (Thin → Heavy, normal + italic) | 100–900 |

Для TMA: **скопировать `.otf` из `src/fonts/`** в assets Mini App и подключить через `@font-face` или bundler.

### 9.3. Подключение на сайте (reference)

```tsx
// src/app/layout.tsx — CSS variables на <html>
className={`${cabinetGroteskFont.variable} ${durikFont.variable} ${blauerNueFont.variable} ${geistMono.variable} antialiased`}
```

```css
/* src/app/globals.css */
body {
  font-family: var(--font-cabinet-grotesk), system-ui, sans-serif;
}

.font-durik { font-family: var(--font-durik); }
.font-cabinet-grotesk { font-family: var(--font-cabinet-grotesk); }
.font-blauer-nue { font-family: var(--font-blauer-nue); }
```

Все кастомные шрифты: `display: swap`, `preload: true`.

### 9.4. Семантика по экранам

| Экран / блок | Шрифт | Типичные классы |
|--------------|-------|-----------------|
| Header «PINK PUNK» | Durik | `font-durik font-extrabold uppercase` |
| Профиль H1 | Durik | `font-durik text-3xl uppercase` |
| Лояльность — имя уровня | Durik | `font-durik font-bold` |
| Лояльность — popout title | Durik | `font-durik text-lg font-bold` |
| Каталог H1, название товара | Blauer Nue | `font-blauer-nue font-bold` |
| Цена + BYN | Blauer Nue | `font-blauer-nue font-bold tabular-nums` |
| «в корзину» | Blauer Nue | `font-blauer-nue` |
| Корзина / checkout итого | Blauer Nue | `font-blauer-nue font-bold` |
| Описание, подписи, body text | Cabinet (default) | без класса или `font-cabinet-grotesk` |
| Gift terminal | Geist Mono | `font-mono` |
| Claim code `PP-A7K3` | mono внутри terminal | `font-semibold tracking-wide` |

### 9.5. Веса (font-weight)

| Шрифт | Частые weight в UI |
|-------|-------------------|
| Durik | `400` (bold через class часто `font-bold`, но файл один — 400) |
| Cabinet Grotesk | `400` body, `500` medium, `600` semibold, `700` bold |
| Blauer Nue | `400`–`700` для текста, `700`–`800` для цен и заголовков commerce |

### 9.6. TMA — `@font-face` (минимальный пример)

```css
@font-face {
  font-family: 'Durik';
  src: url('/fonts/DURIK.otf') format('opentype');
  font-weight: 400;
  font-style: normal;
  font-display: swap;
}

@font-face {
  font-family: 'Cabinet Grotesk';
  src: url('/fonts/CabinetGrotesk-Regular.otf') format('opentype');
  font-weight: 400;
  font-display: swap;
}
@font-face {
  font-family: 'Cabinet Grotesk';
  src: url('/fonts/CabinetGrotesk-Bold.otf') format('opentype');
  font-weight: 700;
  font-display: swap;
}

@font-face {
  font-family: 'Blauer Nue';
  src: url('/fonts/Blauer-Nue-Regular-*.otf') format('opentype');
  font-weight: 400;
  font-display: swap;
}
@font-face {
  font-family: 'Blauer Nue';
  src: url('/fonts/Blauer-Nue-Bold-*.otf') format('opentype');
  font-weight: 700;
  font-display: swap;
}

:root {
  --font-durik: 'Durik', system-ui, sans-serif;
  --font-cabinet-grotesk: 'Cabinet Grotesk', system-ui, sans-serif;
  --font-blauer-nue: 'Blauer Nue', system-ui, sans-serif;
  --font-geist-mono: ui-monospace, 'Geist Mono', monospace;
}

body {
  font-family: var(--font-cabinet-grotesk);
}
```

Для production TMA достаточно подмножества: **Durik (1 файл) + Cabinet Regular/Bold + Blauer Regular/Bold/Semibold**.

### 9.7. Fallback (если нет файлов)

Сохранить **роли**, не обязательно exact match:

| Роль | Fallback |
|------|----------|
| Display | `system-ui, -apple-system, sans-serif` + `uppercase` + `font-bold` |
| Body | `system-ui, sans-serif` |
| Commerce | `system-ui, sans-serif` + `tabular-nums` на ценах |
| Mono | `ui-monospace, monospace` |

### 9.8. JSON tokens

```json
{
  "font": {
    "display": {
      "family": "Durik",
      "variable": "--font-durik",
      "class": "font-durik",
      "weights": [400],
      "use": ["logo", "h1", "loyalty-levels", "countdown"]
    },
    "body": {
      "family": "Cabinet Grotesk",
      "variable": "--font-cabinet-grotesk",
      "class": "font-cabinet-grotesk",
      "weights": [100, 200, 300, 400, 500, 700, 800, 900],
      "use": ["default", "paragraphs", "forms"]
    },
    "commerce": {
      "family": "Blauer Nue",
      "variable": "--font-blauer-nue",
      "class": "font-blauer-nue",
      "weights": [100, 200, 300, 400, 500, 600, 700, 800, 900],
      "use": ["catalog", "product", "cart", "prices", "checkout"]
    },
    "mono": {
      "family": "Geist Mono",
      "variable": "--font-geist-mono",
      "class": "font-mono",
      "use": ["gift-terminal", "claim-codes"]
    }
  }
}
```

### 9.9. Чеклист TMA

- [ ] Body = Cabinet Grotesk (не Inter/Roboto по умолчанию)
- [ ] Логотип и H1 = Durik
- [ ] Каталог, цены, корзина = Blauer Nue
- [ ] Цены: `tabular-nums`, `whitespace-nowrap` на блоке с BYN
- [ ] Gift terminal = monospace
- [ ] `font-display: swap` на всех `@font-face`

---

## 10. Telegram WebApp — синхронизация chrome

```typescript
const tg = window.Telegram?.WebApp;
if (tg) {
  tg.setHeaderColor('#171717');
  tg.setBackgroundColor('#171717');
  // Bottom bar — тот же фон или #0a0a0b для модальных сценариев
  tg.setBottomBarColor?.('#171717');
  tg.ready();
  tg.expand();
}
```

**Рекомендация:** не использовать `themeParams` Telegram для primary accent — они ломают бренд. Pink Punk всегда `--pink-punk` / `--mint-*`.

---

## 11. TypeScript types (optional)

```typescript
export type PinkPunkColorToken =
  | 'background'
  | 'foreground'
  | 'pinkPunk'
  | 'pinkDark'
  | 'pinkLight'
  | 'mintBright'
  | 'mintLight'
  | 'mintDark'
  | 'green'
  | 'levelBronze'
  | 'levelSilver'
  | 'levelGold'
  | 'levelSapphire'
  | 'levelRuby'
  | 'loyaltyProgressTrack'
  | 'surfaceModal'
  | 'giftTerminalSuccess';

export const PINK_PUNK_COLORS: Record<PinkPunkColorToken, string> = {
  background: '#171717',
  foreground: '#ededed',
  pinkPunk: '#ff2b9c',
  pinkDark: '#c34271',
  pinkLight: '#f070a1',
  mintBright: '#16ffbd',
  mintLight: '#4dd4a7',
  mintDark: '#12c998',
  green: '#439f76',
  levelBronze: '#cd7f32',
  levelSilver: '#c0c0c0',
  levelGold: '#ffd700',
  levelSapphire: '#0f52ba',
  levelRuby: '#e0115f',
  loyaltyProgressTrack: '#2a2d35',
  surfaceModal: '#0a0a0b',
  giftTerminalSuccess: '#5cb88a',
};
```

---

## 12. Чеклист для агента TMA

- [ ] Фон viewport и header TG = `#171717`
- [ ] Primary brand accent = `#ff2b9c`, не Telegram blue
- [ ] CTA покупки = `#12c998`, итоги = `#16ffbd`
- [ ] Цена + `BYN` в одну строку (`white-space: nowrap` на блоке цены)
- [ ] Карточки: glass `white/5`, не solid white
- [ ] Loyalty level colors из API + `--level-*`, не по expPoints
- [ ] Gift terminal: green palette, не mint
- [ ] Ошибки: pink border на полях, red-300 текст
- [ ] Admin-серые (`#252525`) не использовать в клиентском TMA
- [ ] Dark only

---

## 13. Changelog

| Дата | Изменение |
|------|-----------|
| 2026-05-22 | Первая версия spec для TMA agent |
