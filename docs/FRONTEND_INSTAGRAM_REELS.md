# Instagram Reels — спецификация для фронтенда (клиент + CRM)

Документ описывает продуктовую логику, контракт API (целевой), UI и **безопасность** для модуля Instagram Reels.

**Связанные документы:** [FRONTEND_LOYALTY.md](./FRONTEND_LOYALTY.md) (начисление `exp_points`), [FRONTEND_AUTH_AND_API_SPEC.md](./FRONTEND_AUTH_AND_API_SPEC.md) (`accountId`, JWT), [CRM_FRONTEND_AGENT.md](./CRM_FRONTEND_AGENT.md).

**Статус бэкенда:** реализовано (`src/instagram/`, пользователь `GET/POST/PATCH /user/instagram/...`, CRM `GET/POST /admin/crm/instagram/...`). Пути в документе соответствуют коду.

---

## 1. Суть продукта

Пользователь участвует в активности Pink Punk в Instagram:

1. Указывает **ник Instagram** и **ссылку на Reels** (только вместе, не по отдельности).
2. Админ проверяет ролик по **правилам контента** → одобряет или отклоняет (при отклонении — **обязательная причина**).
3. После **одобрения** пользователю начисляются **+10 pts**.
4. Через **14 календарных дней** с момента **отправки** ролика наступает срок **сбора просмотров** (только для **одобренных** роликов).
5. Админ открывает ролик, вводит **число просмотров**, подтверждает → начисляются **`floor(views / 1000)` pts** (999 просмотров → **0** доп. очков).

Отклонение **не останавливает** 14-дневный отсчёт от даты отправки. Отклонённый ролик админ может **одобрить позже**; просмотры собираются только когда статус **`approved`**.

---

## 2. Модель данных (логическая)

### 2.1. У пользователя

```typescript
type InstagramReelModerationStatus =
  | 'pending'    // на проверке правил
  | 'approved'   // одобрено
  | 'rejected';  // отклонено

type InstagramReelViewsStatus =
  | 'not_applicable'  // ещё не одобрено — просмотры не собираем
  | 'waiting_period'  // одобрено, 14 дней ещё не прошло
  | 'due'             // одобрено, 14+ дней, просмотры не внесены
  | 'recorded';       // админ внёс просмотры и подтвердил

interface UserInstagramReel {
  _id: string; // id строки в Mongo
  url: string; // нормализованная ссылка (https)
  moderationStatus: InstagramReelModerationStatus;
  submittedAt: string; // ISO — когда пользователь отправил
  approvedAt?: string;
  rejectedAt?: string;
  rejectionReason?: string; // обязателен при reject
  approvedBy?: string; // admin label
  rejectedBy?: string;
  /** 14 дней после submittedAt; для UI «осталось N дней» */
  viewsEligibleAt: string; // ISO = submittedAt + 14d
  viewsStatus: InstagramReelViewsStatus;
  viewCount?: number; // целое >= 0, вводит админ
  viewsRecordedAt?: string;
  viewsRecordedBy?: string;
  /** Начисления (для UI, источник истины — loyalty ledger) */
  pointsOnApprove?: number; // 10 если уже начислено
  pointsOnViews?: number;   // floor(viewCount/1000) если уже начислено
}

interface UserInstagram {
  username: string; // Instagram @username, без @, lowercase
  reels: UserInstagramReel[];
  updatedAt?: string;
}
```

Поле в профиле: **`user.instagram`** (или блок в ответе API).

### 2.2. Вычисляемые флаги (бэкенд отдаёт, фронт не считает сам)

| Поле | Правило |
|------|---------|
| `viewsEligibleAt` | `submittedAt + 14 days` |
| `viewsStatus = waiting_period` | `moderationStatus === approved` && `now < viewsEligibleAt` |
| `viewsStatus = due` | `approved` && `now >= viewsEligibleAt` && `viewCount == null` |
| `viewsStatus = recorded` | `viewCount != null` (после подтверждения админом) |
| `viewsStatus = not_applicable` | не `approved` |
| **Подсветка в CRM** | `viewsStatus === 'due'` |

---

## 3. Начисление очков (loyalty)

| Событие | Очки | Условие |
|---------|------|---------|
| Одобрение ролика | **+10** | один раз на строку `reel._id`, при переходе в `approved` |
| Подтверждение просмотров | **`floor(viewCount / 1000)`** | один раз на строку; 0–999 → **0** |
| Повторное одобрение после reject | **+10** только если ещё не начисляли за этот `_id` | идемпотентность по `sourceRef` в ledger |

**Примеры просмотров:**

| viewCount | bonus pts |
|-----------|-----------|
| 0 | 0 |
| 999 | 0 |
| 1000 | 1 |
| 2500 | 2 |
| 999999 | 999 |

Источник в журнале (для поддержки): `instagram_reel_approve`, `instagram_reel_views` (имена уточнит бэкенд).

После начисления обновлять **`GET /user/loyalty`** (или профиль с `expPoints`).

---

## 4. Жизненный цикл одного Reels

```mermaid
stateDiagram-v2
  [*] --> pending: пользователь отправил nick+url
  pending --> approved: админ одобрил (+10 pts)
  pending --> rejected: админ отклонил (причина)
  rejected --> approved: админ одобрил позже (+10 pts если не было)
  approved --> waiting_period: сразу после approve
  waiting_period --> due: прошло 14 дней от submittedAt
  due --> recorded: админ ввёл просмотры (+floor(v/1000) pts)
```

**Важно:**

- **14 дней** считаются от **`submittedAt`**, не от `approvedAt`.
- Пока ролик **не одобрен**, просмотры **не собираются** (`viewsStatus = not_applicable`).
- **Reject** не сбрасывает `submittedAt` и не «останавливает» таймер 14 дней — при позднем одобрении срок просмотров может наступить сразу, если 14 дней уже прошло.

---

## 5. API — клиент (TMA / сайт)

Базовый URL: `BASE_URL`.  
`Authorization: Bearer <accessToken>`.

### 5.1. Получить свой Instagram-блок

```http
GET /user/instagram
Authorization: Bearer <accessToken>
```

**Ответ `200`:**

```json
{
  "username": "pinkpunk.by",
  "reelsByModeration": {
    "pending": [],
    "approved": [
      {
        "_id": "674abc...",
        "username": "pinkpunk.by",
        "url": "https://www.instagram.com/reel/ABC123/",
        "moderationStatus": "approved"
      }
    ],
    "rejected": []
  },
  "reels": [
    {
      "_id": "674abc...",
      "username": "pinkpunk.by",
      "url": "https://www.instagram.com/reel/ABC123/",
      "moderationStatus": "approved",
      "submittedAt": "2026-05-01T10:00:00.000Z",
      "approvedAt": "2026-05-02T12:00:00.000Z",
      "rejectionReason": null,
      "viewsEligibleAt": "2026-05-15T10:00:00.000Z",
      "viewsStatus": "due",
      "viewCount": null,
      "pointsOnApprove": 10,
      "pointsOnViews": null
    }
  ]
}
```

### 5.2. Отправить Reels (ник + ссылка)

```http
POST /user/instagram/reels
Authorization: Bearer <accessToken>
Content-Type: application/json

{
  "username": "pinkpunk.by",
  "url": "https://www.instagram.com/reel/ABC123/"
}
```

| Поле | Правила |
|------|---------|
| `username` | Instagram-ник. Обязательно. 1–30 символов, латиница/цифры/`._` (см. §8) |
| `url` | Обязательно. Только разрешённые домены Instagram (см. §8) |

**Успех `201`:** объект созданного `reel` + обновлённый `username` (Instagram) на пользователе.

**Ошибки:**

| HTTP | Смысл |
|------|--------|
| 400 | Пустой ник/ссылка, невалидный URL, не Instagram |
| 401 | Нет токена |
| 429 | Слишком много заявок (rate limit) |

**UI:**

- Одна форма: поле **@username** + поле **ссылка на Reels** + кнопка «Отправить».
- **Нельзя** отправить только ссылку без ника (кнопка disabled + валидация).
- При первой отправке обновляется общий Instagram `username` у пользователя; при следующих заявках ник можно предзаполнить из профиля.

### 5.3. Обновить только ник (опционально)

```http
PATCH /user/instagram
Authorization: Bearer <accessToken>

{ "username": "new_nick" }
```

Не создаёт новый Reels. Для смены ника без нового ролика.

### 5.4. `user_profile` — выезжающая панель справа (как авторизация)

На экране **профиля пользователя** блок Instagram Reels открывается **не inline**, а в **правой slide-панели** (drawer / sheet) — **тот же UX-паттерн**, что у входа (Telegram / SMS): затемнение фона, панель `~100%` высоты, ширина `min(420px, 100vw)`, закрытие по крестику, overlay-клику и `Esc`.

**Точка входа в профиле:** строка или кнопка «Instagram Reels» / «Мои ролики» (с бейджем `pending.length`, если есть заявки на проверке).

**При открытии панели:**

```http
GET /user/instagram
Authorization: Bearer <accessToken>
```

Данные кэшировать до `POST /user/instagram/reels` / `PATCH /user/instagram` — после submit обновить ответ.

**Внутри панели — три вкладки** (источник: `reelsByModeration` или фильтр по `reels[].moderationStatus`):

| Вкладка | Ключ API | Содержимое строки |
|---------|----------|-------------------|
| На проверке | `reelsByModeration.pending` | ссылка, дата `submittedAt`, статус «На проверке» |
| Одобренные | `reelsByModeration.approved` | ссылка, `viewsStatus`, `viewCount`, +10 pts при наличии |
| Отклонённые | `reelsByModeration.rejected` | ссылка, **`rejectionReason`** |

Пустая вкладка — placeholder «Пока нет роликов в этом статусе».

**Внизу панели (фикс. блок):** форма отправки — `username` + `url` + «Отправить» → `POST /user/instagram/reels` → обновить список и переключить на вкладку «На проверке».

**Пример ответа с группировкой:**

```json
{
  "username": "pinkpunk.by",
  "reels": [ /* все, новые сверху */ ],
  "reelsByModeration": {
    "pending": [ { "_id": "...", "url": "...", "moderationStatus": "pending" } ],
    "approved": [],
    "rejected": []
  },
  "updatedAt": "2026-05-28T12:00:00.000Z"
}
```

**Не делать:** встраивать Instagram в iframe; открывать Reels только `target="_blank"` + `rel="noopener noreferrer"`.

**Референс компонентов (TMA):** переиспользовать layout авторизации (`AuthDrawer` / `SideSheet` / аналог) — те же анимация, z-index, блокировка скролла body.

### 5.5. Что видит пользователь по статусам

| moderationStatus | viewsStatus | Текст для UI |
|------------------|-------------|--------------|
| `pending` | `not_applicable` | «На проверке» |
| `rejected` | `not_applicable` | «Отклонено» + `rejectionReason` |
| `approved` | `waiting_period` | «Одобрено. Просмотры можно проверить с {date}» |
| `approved` | `due` | «Ожидаем проверку просмотров командой» |
| `approved` | `recorded` | «Просмотры учтены: {viewCount}» (+ сколько pts начислено, если API отдаёт) |

Пользователь **не вводит** просмотры и **не модерирует** — только читает статусы.

---

## 6. API — CRM (админка)

Префикс: `/admin/crm`, `Authorization: Bearer <adminToken>`.

### 6.1. Вкладка «Рилсы пользователей» (глобальный список)

```http
GET /admin/crm/instagram/reels
```

**Query (фильтры):**

| Параметр | Описание |
|----------|----------|
| `moderationStatus` | `pending` \| `approved` \| `rejected` |
| `viewsStatus` | `due` \| `waiting_period` \| `recorded` \| `not_applicable` |
| `dueOnly` | `true` — только «пора вносить просмотры» (подсветка очереди) |
| `page`, `limit` | пагинация |
| `accountId` | опционально — один пользователь |

**Ответ:** массив строк с полями ролика + **владелец**:

```json
{
  "items": [
    {
      "reel": { /* incl. username (Instagram) */ },
      "accountId": "6a032ef0fcf28891b50fb218",
      "username": "pinkpunk.by",
      "customer": {
        "personalFirstName": "Игорь",
        "personalLastName": "Ануфриев",
        "userPhoneNumber": "+375..."
      },
      "highlightDue": true
    }
  ],
  "total": 42
}
```

**UI вкладки:**

- Табы/фильтры: Все | На проверке | Одобрено | Отклонено | **Пора внести просмотры** (`due`).
- **Колонки таблицы (компактно):** `Клиент` (глобально) | `username` | `Reels` (▶ Смотреть) | **`Отправлен`** (`submittedAt`) | `Модерация` (бейдж + ℹ при `rejectionReason`) | `Просмотры` (таймер / учтённые views) | `Действия` (иконки в одну строку).
- **`highlightDue === true`** или `viewsStatus === 'due'` — визуальная подсветка (жёлтый/оранжевый фон).
- **Telegram @username в списке не отдаётся** — только `customer` (имя/телефон) и Instagram `username`.

### 6.2. Карточка клиента — вкладка «Instagram»

```http
GET /admin/crm/users/:accountId
```

В `profile` или отдельном блоке:

```json
"instagram": {
  "username": "pinkpunk.by",
  "reels": [ ... ]
}
```

Те же действия, что в глобальном списке, но в контексте одного пользователя.

### 6.3. Одобрить ролик

```http
POST /admin/crm/users/:accountId/instagram/reels/:reelId/approve
```

Body: `{}` или пусто.

**Эффект:** `moderationStatus = approved`, `approvedAt`, `approvedBy`, **+10 pts**, пересчёт `viewsStatus`.

**Идемпотентность:** повторный approve → 200 без повторных 10 pts.

### 6.4. Отклонить ролик

```http
POST /admin/crm/users/:accountId/instagram/reels/:reelId/reject
Content-Type: application/json

{
  "reason": "Нет хештега #pinkpunk, ролик не про бренд"
}
```

| Поле | Правила |
|------|---------|
| `reason` | **Обязательно**, 10–500 символов, безопасный текст |

**Эффект:** `moderationStatus = rejected`, `rejectedAt`, `rejectionReason`, `rejectedBy`.  
**Очки за approve не начисляются** (если ролик ещё не был одобрен).  
Если ролик **уже был одобрен** (+10 pts и/или pts за просмотры) — бэкенд **списывает** начисленные очки (идемпотентно, как при удалении). С полей ролика снимаются `pointsOnApprove`, `pointsOnViews`, `viewCount`.  
14-дневный таймер от `submittedAt` **не сбрасывается**.

**Ответ `200` (опционально):**

```json
{
  "reel": { /* ... */ },
  "pointsReversed": { "reversedApprove": 10, "reversedViews": 2 }
}
```

**UI:** при отклонении уже одобренного ролика — предупреждение в модалке; после успеха показать «Списано: … pts», обновить loyalty в карточке клиента.

### 6.5. Одобрить ранее отклонённый

Тот же **`POST .../approve`**.  
UI: на отклонённых строках кнопка «Одобрить».

Если 14 дней с `submittedAt` уже прошли → после approve сразу `viewsStatus = due`.

### 6.6. Удалить заявку (битая / неликвидная ссылка)

```http
DELETE /admin/crm/users/:accountId/instagram/reels/:reelId
```

**Эффект:** запись удаляется из `instagram.reels` пользователя. Если по этому ролику уже начислялись очки (approve +10 или просмотры), бэкенд **откатывает** их в ledger (идемпотентно).

**Ответ `200`:**

```json
{
  "success": true,
  "instagram": { "username": "...", "reels": [] },
  "pointsReversed": { "reversedApprove": 10, "reversedViews": 0 }
}
```

**UI:** кнопка «Удалить» на строке (подтверждение). Подходит для нерабочих ссылок, дублей, мусорных заявок — не только для `rejected`.

### 6.7. Внести просмотры

```http
POST /admin/crm/users/:accountId/instagram/reels/:reelId/record-views
Content-Type: application/json

{
  "viewCount": 2500
}
```

| Поле | Правила |
|------|---------|
| `viewCount` | Целое **>= 0**. 999 → 0 bonus pts |

**Предусловия (бэкенд, 400 если нет):**

- `moderationStatus === approved`
- `now >= viewsEligibleAt`
- `viewCount` ещё не записан (или явная политика «одно внесение»)

**Эффект:** `viewsStatus = recorded`, `viewsRecordedAt`, `viewsRecordedBy`, начисление **`floor(viewCount/1000)` pts**.

**UI:**

- Кнопка **«Просмотры»** (👁) **всегда видна** у одобренных роликов без `viewCount`; **disabled**, пока `now < viewsEligibleAt` (таймер в колонке «Просмотры»).
- Модалка: поле числа + превью «Будет начислено: N pts» (`Math.floor(viewCount/1000)`).
- Ссылка на ролик — **открыть в новой вкладке** (`target="_blank"`, `rel="noopener noreferrer"`).
- **`rejectionReason`** — иконка ℹ в колонке «Модерация» → **slide-панель справа** с текстом причины.

---

## 7. TypeScript (клиент)

```typescript
type InstagramReelModerationStatus = 'pending' | 'approved' | 'rejected';
type InstagramReelViewsStatus =
  | 'not_applicable'
  | 'waiting_period'
  | 'due'
  | 'recorded';

type UserInstagramReel = {
  _id: string;
  url: string;
  moderationStatus: InstagramReelModerationStatus;
  submittedAt: string;
  approvedAt?: string;
  rejectedAt?: string;
  rejectionReason?: string;
  viewsEligibleAt: string;
  viewsStatus: InstagramReelViewsStatus;
  viewCount?: number;
  viewsRecordedAt?: string;
  pointsOnApprove?: number;
  pointsOnViews?: number;
};

async function submitInstagramReel(
  token: string,
  body: { username: string; url: string },
) {
  const res = await fetch(`${API_BASE}/user/instagram/reels`, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${token}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(body),
  });
  if (!res.ok) throw new Error(await res.text());
  return res.json();
}
```

---

## 8. Безопасность (ссылки и пользовательский ввод)

### 8.1. Валидация URL (бэкенд — источник истины)

**Разрешённые шаблоны (после нормализации):**

- `https://www.instagram.com/reel/{code}/` (регистр `{code}` сохраняется)
- `https://instagram.com/reel/{code}/`
- `https://www.instagram.com/reels/{code}/` (если IG так отдаёт)
- Допустимые query: `igsh`, `igshid`, `utm_*` (остальные отбрасываются при сохранении)

**Запрещено:**

- Любые другие домены (`tiktok.com`, `youtube.com`, `bit.ly`, …)
- `javascript:`, `data:`, `file:`
- IP-адреса вместо домена
- URL с **username/password** (`https://user:pass@...`)
- Слишком длинные URL (> 500 символов)

**Нормализация на бэкенде:**

1. Trim, lowercase host.
2. Парсинг через WHATWG URL (не regex-only).
3. Whitelist host: `instagram.com`, `www.instagram.com`.
4. Path должен начинаться с `/reel/` или `/reels/`.
5. Сохранять **канонический https URL** (без трекинг-мусора где возможно).

Фронт дублирует проверку для UX, но **не полагается** только на клиент.

### 8.2. Ник Instagram (`username` в API)

- Длина 1–30.
- Символы: `a-z`, `0-9`, `.`, `_` (как в IG).
- Убрать ведущий `@`.
- Запретить: пробелы, кириллицу в нике (или нормализовать с ошибкой), управляющие символы.
- HTML/скрипты в строке — экранировать при отображении в CRM.

### 8.3. Причина отклонения (`rejectionReason`)

- 10–500 символов.
- Санитизация как в CRM-текстах (без HTML).
- Показ пользователю — **plain text**, не `dangerouslySetInnerHTML`.

### 8.4. Отображение ссылок в UI (XSS / фишинг)

| Правило | Зачем |
|---------|--------|
| Не встраивать URL в `<iframe>` | SSRF / малварь |
| Открывать только через `<a href={url} target="_blank" rel="noopener noreferrer">` | Изоляция вкладки |
| Показывать **обрезанный** URL + иконка «внешняя ссылка» | Подмена display URL |
| Не выполнять `fetch(url)` с фронта админки к произвольным доменам | SSRF с браузера админа |
| Превью OG-тегов — только через **бэкенд-прокси** с whitelist (опционально) | Иначе SSRF на сервере |

**Фишинг:** админ видит домен `instagram.com` в каноническом URL после нормализации бэкенда. Подозрительные punycode-домены (`instagrаm.com`) отсекаются whitelist + ASCII host.

### 8.5. Rate limiting и злоупотребления

| Лимит | Рекомендация |
|-------|----------------|
| Заявок Reels на пользователя | например 3 / сутки |
| Всего pending на пользователя | например 5 |
| Длина списка `reels` | архив старых или пагинация |

### 8.6. Просмотры (`viewCount`)

- Только **целое >= 0**, max например 50_000_000 (защита от опечаток).
- Только **админ** через CRM API.
- Одно внесение на ролик (повтор → 409 или идемпотентный 200).

### 8.7. Авторизация

- Клиентские маршруты — `TokenGuard`, `accountId` из JWT, не из body.
- CRM — `AdminGuard`; в path только Mongo `accountId`.
- Пользователь **не может** approve/reject/record-views чужих роликов.

### 8.8. Логирование

- В логах не писать полные токены; URL можно (без query secrets).
- Действия админа: `approvedBy`, `rejectedBy`, `viewsRecordedBy` = `admin:username`.

---

## 9. Чеклист UI

### Клиент (`user_profile`)

- [x] Кнопка в профиле → **правая slide-панель** (как авторизация)
- [x] Вкладки: **На проверке** / **Одобренные** / **Отклонённые** (`reelsByModeration`)
- [x] Форма внизу панели: **username + ссылка** (оба обязательны)
- [x] `GET /user/instagram` при открытии; после submit — refresh
- [ ] После submit — обновить loyalty/профиль при начислении (после approve админом)
- [x] Не открывать ссылки во встроенном WebView без `noopener`

### CRM — вкладка «Рилсы пользователей»

- [x] Фильтры по модерации и `due`
- [x] Подсветка `due` без `viewCount`
- [x] Колонка **`Отправлен`** (`submittedAt`)
- [x] Действия: одобрить / отклонить (модалка с reason + предупреждение о списании pts) / внести просмотры / **удалить**
- [x] Причина отклонения — ℹ → slide-панель справа
- [x] Ссылка на карточку владельца
- [x] Превью «+N pts» при вводе просмотров

### CRM — карточка клиента, вкладка Instagram

- [x] `username` (Instagram) + таблица Reels
- [x] Те же действия, что в глобальном списке

---

## 10. Уведомления в Telegram

При **одобрении** и **отклонении** Reels бэкенд отправляет сообщение пользователю в личку бота (`telegramUserId` в профиле). Повторное одобрение уже одобренного ролика уведомление не дублирует.

- **Approve:** текст с ссылкой на Reels, ником Instagram и строкой о начисленных очках (+10 при первом approve).
- **Reject:** текст с причиной отклонения (как в CRM).

Аккаунты без `telegramUserId` (только телефон) уведомления не получают — статус виден в TMA/CRM.

---

## 11. FAQ

**Можно ли отправить только ссылку?**  
Нет. API вернёт 400 без `username`.

**Начисляются ли pts при отклонении?**  
Нет новых pts. Если до reject был **approve** (+10) или внесены **просмотры** — очки **откатываются** при reject.

**Отклонили на 3-й день — когда вносить просмотры?**  
Когда админ одобрит **и** пройдёт 14 дней с **первой** `submittedAt`. Если одобрили на 20-й день — `due` сразу.

**999 просмотров — сколько pts?**  
0 дополнительных (floor(999/1000)=0). +10 за approve уже были отдельно.

**Можно ли изменить viewCount после сохранения?**  
По умолчанию нет (одно внесение). Иначе риск двойного начисления — только через суперадмина/ручную правку ledger.

---

## 12. Связанные документы

- [FRONTEND_LOYALTY.md](./FRONTEND_LOYALTY.md) — отображение `expPoints` после начислений
- [CRM_FRONTEND_AGENT.md](./CRM_FRONTEND_AGENT.md) — общий CRM
