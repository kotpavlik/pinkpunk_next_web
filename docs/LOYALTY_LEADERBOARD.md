# Рейтинг лояльности (leaderboard) — руководство для фронтенда

Публичный топ участников программы лояльности для **главной сайта** и **Telegram Mini App**.

**Не путать с:**
- `GET /user/loyalty` — личный статус (скидка, подарки, прогресс до следующего уровня)
- CRM `/admin/crm/users` — не использовать для главной

---

## 1. Эндпоинт

```http
GET /loyalty/leaderboard
Authorization: Bearer <accessToken>   ← опционально
```

| Параметр | Значение |
|----------|----------|
| Базовый URL | `BASE_URL` (prod / local) |
| Query | не используются (топ всегда **10**) |
| Auth | **опциональная** — Bearer после SMS / Telegram login / TMA |

### Поведение по авторизации

| Запрос | Ответ |
|--------|--------|
| Без заголовка `Authorization` | `leaders` + `totalParticipants` |
| Валидный Bearer | `leaders` + `totalParticipants` + **`currentUser`** |
| Битый / просроченный токен | **`200`**, только `leaders` (без `currentUser`) — **не 401** |

Гостям блок «Вы на N-м месте» не показываем.

---

## 2. Формат ответа `200`

```json
{
  "leaders": [
    {
      "rank": 1,
      "displayName": "Анна К.",
      "level": {
        "id": "legend",
        "label": "Legend"
      },
      "expPoints": 18420
    }
  ],
  "totalParticipants": 1247,
  "currentUser": {
    "rank": 47,
    "displayName": "Иван П.",
    "level": {
      "id": "regular",
      "label": "Regular"
    },
    "expPoints": 1240,
    "inTop": false
  }
}
```

### 2.1. `leaders`

Массив **до 10** записей (меньше, если участников < 10).

| Поле | Тип | Описание |
|------|-----|----------|
| `rank` | `number` | Место в рейтинге, **1-based**, без пропусков |
| `displayName` | `string` | Публичное имя для UI |
| `level.id` | `string` | `explorer` \| `regular` \| `vibe_keeper` \| `insider` \| `legend` |
| `level.label` | `string` | Человекочитаемое имя уровня (`Regular`, `Legend`, …) |
| `expPoints` | `number` | Баланс exp (pts), целое ≥ 0 |

### 2.2. `totalParticipants`

Общее число пользователей, попадающих в рейтинг (см. §4).

### 2.3. `currentUser` (только при валидном токене)

| Поле | Тип | Описание |
|------|-----|----------|
| `rank` | `number` | Место в общем рейтинге |
| `displayName` | `string` | Как пользователь видит себя |
| `level` | объект | Текущий уровень (`id`, `label`) |
| `expPoints` | `number` | Его pts |
| `inTop` | `boolean` | `true`, если `rank ≤ 10` |

**Если пользователь не участвует в рейтинге** (`expPoints = 0`, admin/owner, merged) — поле **`currentUser` отсутствует** в ответе.  
Фронт: не показывать «Вы на … месте»; можно текст «Начните копить pts, чтобы попасть в рейтинг».

**Если пользователь в топ-10:** он есть в `leaders` с тем же `rank` / `expPoints`, плюс отдельно `currentUser` с `inTop: true`. Подсветите строку в таблице топа.

---

## 3. Что **не** приходит в ответе

Бэкенд **не отдаёт** (и фронт **не должен ожидать**):

- `accountId`, Mongo `_id`
- email, телефон, адрес доставки
- Telegram `userId`
- claim-коды подарков, история ledger
- фото профиля

Используйте только поля из §2.

---

## 4. Правила рейтинга (для UI-копирайта)

### Кто участвует

- `expPoints > 0`

### Кто исключён

- `isAdmin: true`
- `owner: true` (владельцы / служебные аккаунты)
- аккаунты после merge (`mergedIntoAccountId`)

### Сортировка

1. `expPoints` **по убыванию**
2. При равных pts — детерминированный tie-break по `_id` (места **не делятся**: у двух пользователей с одинаковыми pts разные `rank`)

### Уровень

`level.id` и `level.label` считаются на бэкенде той же логикой, что `GET /user/loyalty`. **Пороги на фронте не пересчитывать.**

Справка по уровням — в [TMA_LOYALTY_LEVEL_CARDS.md](./TMA_LOYALTY_LEVEL_CARDS.md).

### Публичное имя (`displayName`)

Приоритет (бэкенд):

1. `personalFirstName` + первая буква `personalLastName` → `"Анна К."`
2. только `personalFirstName`
3. `firstName` + первая буква `lastName` → `"Иван П."`
4. только `firstName`
5. `@username` (Telegram)
6. `"Игрок #XXXXXX"` — стабильный псевдоним от id аккаунта (не меняется между запросами)

---

## 5. Рекомендуемый UI

```
🏆 Топ-10
 1  Анна К.     Legend       18 420 pts
 2  ...
10  ...
─────────────────────────────
Вы на 47-м месте · Regular · 1 240 pts
```

| Состояние | UI |
|-----------|-----|
| Гость | только блок топ-10 + опционально «В рейтинге N участников» |
| Авторизован, `currentUser.inTop === true` | топ-10 + подсветка своей строки + «Вы на N-м месте» |
| Авторизован, `inTop === false` | топ-10 + отдельная строка «Вы на N-м месте» |
| Авторизован, нет `currentUser` | топ-10 + «Начните копить pts…» |
| Ошибка сети / 5xx | заглушка «Рейтинг временно недоступен» |

Форматирование pts на фронте — по локали (пробелы в тысячах: `18 420`).

---

## 6. Примеры

### Гость

```http
GET /loyalty/leaderboard
```

```json
{
  "leaders": [ "/* до 10 записей */" ],
  "totalParticipants": 1247
}
```

### Пользователь на 47-м месте

```json
{
  "leaders": [ "/* топ-10 */" ],
  "totalParticipants": 1247,
  "currentUser": {
    "rank": 47,
    "displayName": "Иван П.",
    "level": { "id": "regular", "label": "Regular" },
    "expPoints": 1240,
    "inTop": false
  }
}
```

### Пользователь на 3-м месте

```json
{
  "leaders": [
    { "rank": 1, "displayName": "…", "level": { "id": "legend", "label": "Legend" }, "expPoints": 18420 },
    { "rank": 2, "displayName": "…", "level": { "id": "legend", "label": "Legend" }, "expPoints": 15200 },
    { "rank": 3, "displayName": "Иван П.", "level": { "id": "vibe_keeper", "label": "Vibe Keeper" }, "expPoints": 9200 }
  ],
  "totalParticipants": 1247,
  "currentUser": {
    "rank": 3,
    "displayName": "Иван П.",
    "level": { "id": "vibe_keeper", "label": "Vibe Keeper" },
    "expPoints": 9200,
    "inTop": true
  }
}
```

---

## 7. Ошибки

| HTTP | Когда | Действие фронта |
|------|--------|-----------------|
| **200** | Успех (в т.ч. битый токен → без `currentUser`) | Рендер топа |
| **503** | Временная недоступность | Заглушка, retry |

**401 на этом эндпоинте не используется** — невалидный токен не блокирует просмотр топа.

---

## 8. Кэш и актуальность

- Топ-10 и `totalParticipants` кэшируются на бэкенде **~2 минуты**
- После начисления pts (заказ, Instagram, реферал) место в рейтинге может обновиться с задержкой до TTL кэша
- Для главной достаточно **одного запроса при открытии страницы**; polling не обязателен
- Личный баланс для детальной карточки — по-прежнему `GET /user/loyalty`

---

## 9. TypeScript

```typescript
export type LoyaltyLevelId =
  | 'explorer'
  | 'regular'
  | 'vibe_keeper'
  | 'insider'
  | 'legend';

export interface LeaderboardLevel {
  id: LoyaltyLevelId;
  label: string;
}

export interface LeaderboardEntry {
  rank: number;
  displayName: string;
  level: LeaderboardLevel;
  expPoints: number;
}

export interface LeaderboardCurrentUser extends LeaderboardEntry {
  inTop: boolean;
}

export interface LeaderboardResponse {
  leaders: LeaderboardEntry[];
  totalParticipants: number;
  currentUser?: LeaderboardCurrentUser;
}
```

### Пример запроса (fetch)

```typescript
async function fetchLeaderboard(accessToken?: string): Promise<LeaderboardResponse> {
  const headers: HeadersInit = {};
  if (accessToken) {
    headers.Authorization = `Bearer ${accessToken}`;
  }

  const res = await fetch(`${BASE_URL}/loyalty/leaderboard`, { headers });
  if (!res.ok) {
    throw new Error(`Leaderboard ${res.status}`);
  }
  return res.json();
}
```

---

## 10. Чеклист интеграции

- [x] Главная / TMA: `GET /loyalty/leaderboard` без токена для гостей
- [x] С токеном — показывать `currentUser`, если поле есть
- [x] Подсветка строки в топе при `currentUser.inTop === true` (сравнить `rank`)
- [x] Нет `currentUser` → CTA «копить pts»
- [x] Не использовать CRM API для рейтинга
- [x] Не показывать и не логировать PII из других эндпоинтов
- [x] Уровень и pts брать из ответа leaderboard, пороги не хардкодить
- [x] Обработка 5xx — заглушка

---

## 11. Связанные документы

- [TMA_LOYALTY_LEVEL_CARDS.md](./TMA_LOYALTY_LEVEL_CARDS.md) — уровни, подарки, UI карточек
- [TOKEN_MANAGEMENT.md](./TOKEN_MANAGEMENT.md) — Bearer / refresh
