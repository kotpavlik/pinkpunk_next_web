# CRM API — руководство для фронтенда

Документ описывает контракт **админской CRM** (`/admin/crm/...`): авторизацию, типы данных, эндпоинты и примеры JSON. Идентификатор клиента в пути запросов — **Telegram `userId` (число)**, не Mongo `_id`.

**Кратко про корзину для фронта:** текущая корзина клиента в CRM — поле **`cart` в корне** ответа `GET /admin/crm/users/:userId` и в элементах **`GET /admin/crm/users`**: сводка `totalItems`, `totalPrice`, `lastUpdated` и при расширенном ответе — массив **`items`** позиций (см. **§5.4**). Поле **`orders[].cart`** — Mongo `_id` корзины **на момент заказа**, не дубликат корневого `cart`. Отдельного поля корзины внутри `profile` в этом API нет.

---

## 1. Базовый URL и заголовки

- **Пример:** `https://api.example.com` или `http://localhost:5858`
- Все методы CRM требуют заголовок:

```http
Authorization: Bearer <accessToken>
Content-Type: application/json
```

`<accessToken>` — JWT администратора (см. раздел 2).

---

## 2. Получение токена администратора

**`POST /auth/admin-login`**

Тело (обязательные поля: `password`, `userData`, `deviceId`):

```json
{
  "password": "ВАШ_ПАРОЛЬ_АДМИНА",
  "userData": {
    "userId": 6399340874,
    "username": "admin_username",
    "_id": "6880dfb9c6490ce6e423bde2"
  },
  "deviceId": "crm-web-unique-device-id",
  "deviceInfo": "Chrome / CRM"
}
```

- Пароль проверяется против **`ADMIN_PASSWORD_HASH`** в конфигурации бэкенда.
- После логина в БД создаётся/обновляется refresh-сессия; **без этого** последующие запросы с токеном могут получить `401` (нет активных сессий).
- **`userId` в `userData`** — число, совпадающее с пользователем в Mongo (как правило тот же Telegram id).

**Ответ** (фрагмент):

```json
{
  "accessToken": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
  "refreshToken": "...",
  "expiresIn": 3600
}
```

На фронте сохраняйте **`accessToken`** и подставляйте в `Authorization: Bearer ...`. При истечении — обновление через ваш существующий refresh-flow админки (если соответствующий endpoint настроен отдельно).

---

## 3. Обзор эндпоинтов CRM

| Метод | Путь | Назначение |
|--------|------|------------|
| `GET` | `/admin/crm/users` | Список клиентов + сводные метрики |
| `GET` | `/admin/crm/users/:userId` | Полная карточка клиента |
| `PATCH` | `/admin/crm/users/:userId` | Редактирование полей профиля / CRM |
| `POST` | `/admin/crm/users/:userId/offline-purchases` | Добавить офлайн-покупку (каталог или кастом) |
| `DELETE` | `/admin/crm/users/:userId/offline-purchases/:lineId` | Удалить строку офлайн-покупки |

`:userId` — **целое число > 0** (Telegram id клиента), строка в URL: `6399340874`.

`:lineId` — **Mongo `_id`** поддокумента в массиве `crmOfflinePurchases` (строка 24 hex), приходит в карточке клиента.

**Ошибки:**

- `400` — неверный `userId` в пути, невалидный `lineId`, ошибки валидации тела (`class-validator`).
- `401` — нет/просрочен токен или нет активной админ-сессии.
- `404` — пользователь, товар (для каталога / возврата) или строка офлайн-покупки не найдены (см. поле `code` в JSON).
- `409` — **недостаточно остатка на складе** при добавлении каталожной офлайн-строки (параллельные запросы тоже могут привести сюда). В теле: `code: "INSUFFICIENT_STOCK"`, `requestedQty`, `availableQty`, `productName`, `productId`.

**Валидация полей тел запросов** (лимиты, форматы, безопасный текст): **`PATCH` клиента — § 6.1.1**; **`POST` офлайн-покупки — § 7.1**.

---

## 4. Список клиентов — `GET /admin/crm/users`

**Ответ:** массив объектов. В каждом объекте:

- Все поля пользователя из Mongo **кроме** лишней тяжёлистики (токены и refresh-сессии **не** отдаются).
- В **`stats.orders`** приходят **полные объекты всех заказов** пользователя (с `populate` по товарам в позициях), см. п. 4.2.
- **Контакты в строке списка и в `profile` карточки** (`userPhoneNumber`, `userPhoneNormalized`, `email`, `shippingAddress`):  
  - **`shippingAddress`:** подмешивание из заказов в JSON выполняется **только пока в Mongo нет ни одного непустого поля адреса**. Если в профиле уже есть сохранённый адрес (после чекаута или после `PATCH`), ответ CRM **не изменяет** его данными из заказов — иначе пустые поля (например `apartment: ""`) ошибочно заполнялись бы старыми заказами.  
  - **Телефон и email:** если в Mongo пусто, дозаполняются из заказов (сначала из более новых).  
  Изменения только в теле ответа; **в БД не пишутся**, пока не вызван `PATCH /admin/crm/users/:userId`.
- Полный массив **`crmOfflinePurchases` в списке не приходит** — вместо него агрегат **`offlinePurchasesSummary`**.
- Дополнительно считаются **агрегаты в `stats`** (счётчики и суммы), **`referralsCount`**, **`cart`** (сводка и при расширенном ответе — массив **`items`**, см. **§5.4**).

### 4.1. Пример элемента списка

```json
{
  "_id": "6880dfb9c6490ce6e423bde2",
  "userId": 6399340874,
  "username": "pozdnee_utro",
  "firstName": "Алина",
  "lastName": "К.",
  "personalFirstName": "Алина",
  "personalLastName": "Королёва",
  "email": "user@example.com",
  "userPhoneNumber": "+375291234567",
  "shippingAddress": {
    "fullName": "Королёва Алина",
    "phone": "+375291234567",
    "city": "Минск",
    "postalCode": "220000",
    "country": "Belarus",
    "street": "пр-т Независимости",
    "house": "1",
    "apartment": "1",
    "notes": ""
  },
  "dateOfBirth": "1995-11-08T00:00:00.000Z",
  "heightCm": 168,
  "hipsCircumferenceCm": 96,
  "armLengthCm": 59,
  "chestCircumferenceCm": 88,
  "waistCircumferenceCm": 70,
  "trousersLengthCm": 101,
  "adminNotes": "VIP, держать в курсе дропов",
  "owner": true,
  "isAdmin": true,
  "lastActivity": "2026-05-02T18:44:12.000Z",
  "hasStartedBot": true,
  "languageCode": "ru",
  "isPremium": true,
  "createdAt": "2025-02-14T09:21:00.000Z",
  "updatedAt": "2026-05-02T18:44:12.000Z",

  "stats": {
    "ordersTotal": 12,
    "ordersPaidOrCompleted": 8,
    "totalSpent": 4200,
    "totalUnitsPurchased": 15,
    "lastOrderAt": "2026-04-28T10:00:00.000Z",
    "orders": [
      {
        "_id": "681f2a8e4c2a1b0012abcd01",
        "orderNumber": "PP-2026-04189",
        "userId": "6399340874",
        "status": "completed",
        "items": [],
        "subtotal": 347,
        "totalAmount": 359,
        "createdAt": "2026-04-18T11:05:30.000Z",
        "updatedAt": "2026-04-22T14:20:00.000Z"
      }
    ]
  },
  "referralsCount": 3,
  "cart": {
    "totalItems": 2,
    "totalPrice": 340,
    "lastUpdated": "2026-05-02T17:00:00.000Z",
    "items": [
      {
        "quantity": 1,
        "productId": "66aa11bb22cc33dd44ee0101",
        "listingProductId": "hoodie-urban-black-m",
        "name": "Худи Urban Black",
        "photo": "https://example.com/photo.jpg",
        "size": "m",
        "unitPrice": 189
      }
    ]
  },
  "offlinePurchasesSummary": {
    "linesCount": 2,
    "totalAmount": 560
  }
}
```

### 4.2. Смысл `stats`

| Поле | Описание |
|------|----------|
| `ordersTotal` | Все заказы пользователя (любой статус), число |
| `ordersPaidOrCompleted` | Заказы со статусом `paid` или `completed`, число |
| `totalSpent` | Сумма **`totalAmount`** только по `paid` + `completed` |
| `totalUnitsPurchased` | Сумма **`items[].quantity`** по тем же заказам |
| `lastOrderAt` | Дата последнего заказа (любой статус) |
| **`orders`** | **Полные объекты заказов** этого пользователя: те же поля, что в БД / в карточке клиента; позиции с **`populate('items.product')`**; сортировка **от новых к старым**; если в заказах встречались и Telegram `userId`, и legacy Mongo `_id`, дубликаты по `_id` заказа схлопываются |

Статусы заказа в каждом объекте: `pending_confirmation` | `confirmed` | `paid` | `completed` | `cancelled`.

Объём ответа списка растёт с количеством заказов у всех клиентов — это осознанный trade-off для админки.

У **новых** заказов в объекте заказа есть поле **`customerEmail`** (копия email с чекаута). Старые заказы могут без него — тогда email из заказов в обогащение профиля не подставится.

### 4.3. `offlinePurchasesSummary`

- `linesCount` — число строк офлайн-покупок в карточке.
- `totalAmount` — сумма по строкам: для `catalog` — `unitPrice * quantity`, для `custom` — `customPrice * quantity`.

---

## 5. Карточка клиента — `GET /admin/crm/users/:userId`

**Ответ — объект:**

```json
{
  "profile": { },
  "orders": [ ],
  "referralsCount": 4,
  "cart": {
    "totalItems": 2,
    "totalPrice": 340,
    "lastUpdated": "2026-05-02T17:00:00.000Z",
    "items": [
      {
        "quantity": 1,
        "productId": "66aa11bb22cc33dd44ee0101",
        "listingProductId": "hoodie-urban-black-m",
        "name": "Худи Urban Black",
        "photo": "https://example.com/photo.jpg",
        "size": "m",
        "unitPrice": 189
      }
    ]
  }
}
```

### 5.1. `profile`

Тот же тип документа пользователя, что и в списке. Контакты **так же могут быть дозаполнены из `orders`** по правилам п. 4 (для **адреса** — только если в Mongo ещё нет ни одного непустого поля `shippingAddress`).

- **`crmOfflinePurchases`** — полный массив (см. раздел 7).
- Для строк с `kind: "catalog"` поле **`product`** **популируется** из коллекции товаров (карточка `PinkPunkProductCard`), если ref валиден.
- **`_id`** профиля — строка (Mongo id документа пользователя).

Даты (`dateOfBirth`, `createdAt`, …) в JSON обычно приходят как ISO-строки.

### 5.2. `orders`

Массив заказов пользователя (как в сервисе заказов): позиции с **`populate('items.product')`**. Идентификация пользователя в заказах — строка `userId` (часто совпадает с Telegram id в виде строки); бэкенд при необходимости учитывает legacy-связку по Mongo id.

Структура заказа ориентировочно:

```json
{
  "_id": "681f2a8e4c2a1b0012abcd01",
  "orderNumber": "PP-2026-04189",
  "userId": "6399340874",
  "items": [
    {
      "product": {
        "_id": "66aa11bb22cc33dd44ee0101",
        "productId": "hoodie-urban-black-m",
        "name": "Худи Urban Black",
        "price": 189,
        "size": "m"
      },
      "quantity": 1,
      "price": 189,
      "size": "m"
    }
  ],
  "status": "completed",
  "subtotal": 347,
  "shippingCost": 12,
  "totalAmount": 359,
  "userPhoneNumber": "+375291234567",
  "shippingAddress": { },
  "paymentMethod": "card_online",
  "createdAt": "2026-04-18T11:05:30.000Z",
  "updatedAt": "2026-04-22T14:20:00.000Z"
}
```

`status`: `pending_confirmation` | `confirmed` | `paid` | `completed` | `cancelled`.

### 5.3. `referralsCount`

Число пользователей, у которых **`my_ref_invite_id`** равен `userId` открытой карточки.

### 5.4. `cart`

Либо **`null`**, либо объект **текущей активной** корзины (`isActive: true` по логике бэкенда). Поле только **в корне** ответа карточки (и в строке списка — то же `cart`), внутри `profile` отдельной корзины **нет**.

| Поле | Описание |
|------|----------|
| `totalItems`, `totalPrice`, `lastUpdated` | Сводка (как в документе корзины) |
| **`items`** | Опционально: массив позиций в порядке из Mongo. В каждой: `quantity`; **`productId`** — Mongo `_id` карточки; **`listingProductId`** — поле `productId` карточки (артикул с витрины), если товар подтянулся; **`name`** — название; **`photo`** — первый URL из `photos` карточки или `null`; опционально **`size`**, **`unitPrice`** (как в карточке на момент ответа) |

Если позиция ссылается на удалённый товар и `populate` не дал карточку: `name` будет `"—"`, `photo: null`, **`productId`** — id из позиции корзины (если удалось прочитать).

**`cart: null`** означает: нет активной корзины, сопоставимой с клиентом (пустая, неактивная, нет матча в БД и т.д.).

**Почему раньше могло быть `cart: null` при живых заказах:** `userId` в корзине мог быть Mongo id, а поиск — только по Telegram. **Исправлено:** корзина ищется по Telegram `userId` клиента **или** по Mongo `_id` профиля (`$in`).

В Mongo у документа корзины `userId` иногда строка Telegram id, иногда строка Mongo `_id` пользователя. CRM подставляет корзину при совпадении с **любым** из этих значений вместе с `:userId` карточки (Telegram).

Поле **`orders[].cart`** — **другое**: Mongo `_id` документа корзины **на момент создания заказа**, не «текущая корзина» из корня.

---

## 6. Редактирование клиента — `PATCH /admin/crm/users/:userId`

Частичное обновление: в теле только те поля, которые нужно изменить.

### 6.1. Доступные поля тела (`CrmUpdateUserDto`)

Краткая таблица; **точные правила и ошибки `400`** — в п. **6.1.1**.

| Поле | Тип | Примечание |
|------|-----|------------|
| `personalFirstName`, `personalLastName`, `firstName`, `lastName` | string | до 120 симв., безопасный текст (см. 6.1.1) |
| `email` | string | `@IsEmail`, до 320 символов |
| `userPhoneNumber` | string | если непустой — формат как у `IsPhoneNumber` (`+`, цифры и т.д.) |
| `shippingAddress` | объект | см. **6.1.1** и **6.3** |
| `username` | string | латиница, цифры, `_`, до 64 симв. |
| `walletAddress` | string | только латиница и цифры, до 128 |
| `isAdmin` | boolean | **`owner` с клиента не задаётся** |
| `dateOfBirth` | string | ISO date; возраст **≥ 16 лет** (UTC) |
| `heightCm` | number | целое **см**; диапазон **env `CRM_MIN_HEIGHT_CM`…`CRM_MAX_HEIGHT_CM`** (по умолчанию **80…250**) |
| `hipsCircumferenceCm`, `chestCircumferenceCm`, `waistCircumferenceCm` | number | целые **0…300** |
| `armLengthCm`, `trousersLengthCm` | number | целые **0…200** |
| `adminNotes` | string | до 10000, многострочный безопасный текст |

`ValidationPipe`: **`whitelist`**, **`forbidNonWhitelisted`** — лишние ключи в корне тела → **400**.

### 6.1.1. Валидация `PATCH` (подробно)

**Текст и XSS-подобные вставки** (имена, `username`, адресные строки кроме чисто цифрового дома/кв., `adminNotes` и т.д.):

- запрещены управляющие символы и zero-width;
- в однострочных полях **нет** символов `<` `>` и переводов строк;
- в многострочных (`adminNotes`, `shippingAddress.notes`) **нет** `<` `>`;
- отклоняются типичные шаблоны вроде `<script`, `javascript:`, `on…=` и др. (см. бэкенд `IsSafeCrmText`).

**Телефон:** `userPhoneNumber` и `shippingAddress.phone` (если поле передано и не пустое после trim) — тот же контракт, что **`IsPhoneNumber`**: начало с `+`, в хвосте цифры, 7–15 цифр и т.д.

**Адрес (`shippingAddress`, все ключи опциональны, частичный PATCH):**

- `country`: после нормализации **ISO 3166-1 alpha-2** (две латинские буквы); часть названий стран маппится в код (напр. `Belarus` → `BY`), см. бэкенд;
- `postalCode`: если `country === "BY"` — ровно **6 цифр**; иначе буквы/цифры/пробел/дефис, **2–16** символов (если `country` в том же теле не передан — правило BY не применяется);
- `house`: если значение **только цифры** — число **0…1000**; иначе произвольная строка до 40 симв. (например `34А`); не начинается с `-`;
- `apartment`: если только цифры — **≥ 0**; иначе строка до 40; не с `-` в начале;
- длины: `fullName` до 200, `street` 200, `city` 120, `phone` до 32, `notes` до 2000.

**Мерки (целые числа):** дробные значения в JSON → **400**. Дополнительно на бэкенде **согласованность** (мягкие анти-опечатки, не блок врача): например талия не больше груди **+ 80 см**, длина брюк не больше роста **+ 35 см**, длина руки не больше приблизительно **0,62 × рост + 8 см** — иначе **400** с пояснением в `message`.

При сохранении строки дополнительно санитизируются на сервисе (повторная защита после DTO).

### 6.2. Пример тела (мерки + заметки)

```json
{
  "dateOfBirth": "1995-11-08",
  "heightCm": 168,
  "hipsCircumferenceCm": 96,
  "armLengthCm": 59,
  "chestCircumferenceCm": 88,
  "waistCircumferenceCm": 70,
  "trousersLengthCm": 101,
  "adminNotes": "Предпочитает oversize; уведомлять о рестоке чёрных брюк."
}
```

### 6.3. Пример: патч адреса (частично)

Ключи из списка `fullName`, `phone`, `street`, `house`, `apartment`, `city`, `postalCode`, `country`, `notes` обновляются **только если поле явно присутствует в теле** (проверка `hasOwnProperty` по ключу). Пустая строка `""` передаётся и сохраняется. Ключ, **не переданный** в JSON, остаётся прежним в Mongo.

```json
{
  "shippingAddress": {
    "city": "Минск",
    "postalCode": "220043",
    "notes": "Звонить за час"
  }
}
```

### 6.4. Ответ

Объект **обновлённого пользователя** (безопасная проекция: без `token` и `refreshSessions`), с полем **`_id`** строкой.

### 6.5. Выбор товара из каталога для офлайн-строки

Список товара для UI: **`GET /products`**. В теле `POST …/offline-purchases` передаётся **`productId` = Mongo `_id` карточки** (`PinkPunkProductCard`), не строковый `productId` с витрины (если отличается).

**Склад:** для `kind: "catalog"` бэкенд **атомарно** уменьшает `stockQuantity` карточки и создаёт строку в `crmOfflinePurchases` (при ошибке записи в профиль склад откатывается). Фронту **не нужно** отдельно вызывать Product API для списания остатка перед CRM POST — достаточно одного `POST …/offline-purchases`. Контроль «запрошено > остатка» и защита от простых гонок выполняются на бэкенде одним условным обновлением.

---

## 7. Офлайн-покупки

Не создают записи в коллекции заказов. Кастомные позиции **только** в массиве `profile.crmOfflinePurchases`.

### 7.0. Поведение склада (кратко)

| Действие | Склад `stockQuantity` |
|----------|------------------------|
| `POST` с `kind: "catalog"` | Уменьшается на `quantity` **только если** `ifNull(stockQuantity,0) ≥ quantity`. Иначе `409` `INSUFFICIENT_STOCK`. |
| `POST` с `kind: "custom"` | **Не меняется.** |
| `DELETE` строки с `kind: "catalog"` | Увеличивается на `quantity` этой строки (тот же Mongo `product`). |
| `DELETE` строки `kind: "custom"` | **Не меняется.** |

Требуется Mongo с корректным полем остатка у карточки; отсутствие поля трактуется как **0**.

### 7.1. Валидация тела `POST`

Общие правила:

- **`quantity`:** целое, **1…100000** (если не передано — на бэкенде **1**).
- **`unitPriceOverride` / `customPrice`:** число **≥ 0**, не больше **1e9** (защита от мусора).
- **Текст кастома:** `customName` (до 500 символов), `customDescription` (до 4000) — те же ограничения безопасности, что и CRM-текст: без управляющих символов, `<`/`>` в однострочных, без типичных векторов вроде `<script`, `javascript:`, `on…=` и т.д.

**`kind: "catalog"`**

- Обязательны: `kind`, `productId` (Mongo id карточки).
- Опционально: `quantity`, `unitPriceOverride`.

**`kind: "custom"`**

- Обязательны: `kind`, `customName`, `customPrice`.
- Опционально: `quantity`, `customDescription`.

### 7.2. Строка в `crmOfflinePurchases` (ответ API)

**Вариант каталога:**

```json
{
  "_id": "674a1b2c3d4e5f6789abcdef",
  "kind": "catalog",
  "quantity": 2,
  "createdAt": "2026-05-03T12:00:00.000Z",
  "addedByUserId": 412971440,
  "product": "66aa11bb22cc33dd44ee0101",
  "unitPrice": 189,
  "productNameSnapshot": "Худи Urban Black",
  "sizeSnapshot": "m"
}
```

После `populate` поле **`product`** может быть развёрнутым объектом товара.

**Вариант кастома:**

```json
{
  "_id": "674a1b2c3d4e5f6789abcd99",
  "kind": "custom",
  "quantity": 1,
  "createdAt": "2026-05-03T12:30:00.000Z",
  "addedByUserId": 412971440,
  "customName": "Пальто индивидуальный пошив",
  "customDescription": "Шерсть 100%, подклад вискоза, срок 4 недели",
  "customPrice": 1200
}
```

### 7.3. Добавить — `POST /admin/crm/users/:userId/offline-purchases`

**Каталог:**

```json
{
  "kind": "catalog",
  "productId": "66aa11bb22cc33dd44ee0101",
  "quantity": 1,
  "unitPriceOverride": 175
}
```

**Кастом:**

```json
{
  "kind": "custom",
  "customName": "Костюм triple stitch",
  "customDescription": "По меркам клиента",
  "customPrice": 850,
  "quantity": 1
}
```

**Успешный ответ `200` (каталог):**

```json
{
  "success": true,
  "crmOfflinePurchases": [],
  "productStock": {
    "productId": "66aa11bb22cc33dd44ee0101",
    "stockQuantity": 4
  }
}
```

- **`crmOfflinePurchases`** — полный актуальный массив с `populate` по `product` для каталожных строк (в JSON `_id` и вложенные id сериализованы как строки).
- **`productStock`** — только для **`kind: "catalog"`**: актуальный остаток после списания; можно обновить UI без отдельного `GET` товара.

**Успешный ответ (кастом):** те же `success` и `crmOfflinePurchases`, поля **`productStock` нет**.

**Ошибка недостатка склада — `409`**, пример тела:

```json
{
  "statusCode": 409,
  "message": "Недостаточно товара «Худи Urban Black»: запрошено 3, в наличии 1",
  "code": "INSUFFICIENT_STOCK",
  "requestedQty": 3,
  "availableQty": 1,
  "productId": "66aa11bb22cc33dd44ee0101",
  "productName": "Худи Urban Black"
}
```

**Товар не найден — `404`**, `code: "PRODUCT_NOT_FOUND"`.

### 7.4. Удалить — `DELETE /admin/crm/users/:userId/offline-purchases/:lineId`

`lineId` — **`_id`** строки из `crmOfflinePurchases`.

Для строки **`kind: "catalog"`** бэкенд **увеличивает** `stockQuantity` у связанной карточки на `quantity` строки, затем удаляет строку из массива. Для **`custom`** — только удаление строки.

**Успешный ответ `200`:**

```json
{
  "success": true,
  "crmOfflinePurchases": [],
  "productStock": {
    "productId": "66aa11bb22cc33dd44ee0101",
    "stockQuantity": 7
  }
}
```

- **`productStock`** присутствует **только** если удалённая строка была каталожной и товар найден; иначе поле можно не ждать.

**Ошибки:** `400` `INVALID_LINE_ID`, `404` `USER_NOT_FOUND` | `OFFLINE_LINE_NOT_FOUND` | `PRODUCT_NOT_FOUND` (если карточка для возврата не существует).

### 7.5. Что упростить на фронтенде

1. **Добавление каталожной офлайн-покупки:** один вызов `POST …/offline-purchases` с нужным `quantity`. Не нужен отдельный шаг «CHECK остаток → PATCH товар → POST CRM»: проверка и списание на бэкенде.
2. **После успешного POST:** подставить в стейт `crmOfflinePurchases` из ответа; при наличии `productStock` обновить отображаемый остаток товара / список без обязательного `GET /products/:id`.
3. **Удаление каталожной строки:** один `DELETE`; при ответе с `productStock` обновить остаток в UI. Отдельный «возврат на склад» через Product API не обязателен.
4. **Конфликт остатка:** обработать `409`, показать пользователю `message` / `availableQty` / `requestedQty` / `productName`.

---

## 8. Рекомендуемый поток UI

1. Логин админа → сохранить `accessToken`.
2. Таблица: `GET /admin/crm/users` → отрисовка `stats`, `offlinePurchasesSummary`, контактов, превью корзины (`totalItems` / сумма; при наличии на бэкенде — и `items`).
3. Детальная страница: `GET /admin/crm/users/:userId` → вкладки: профиль (включая мерки и `crmOfflinePurchases`), заказы, корзина (сводка + список позиций при наличии `items`), рефералы.
4. Сохранение формы профиля / мерок: `PATCH` с только изменёнными полями.
5. Офлайн: выбор товара из `GET /products` → **один** `POST …/offline-purchases` с `kind: "catalog"` (склад обновляет бэкенд); кастом — форма с `kind: "custom"`.
6. Удаление строки: `DELETE` с `lineId`; обновить профиль из `crmOfflinePurchases` в ответе и при необходимости остаток из `productStock`.

---

## 9. Отличие от публичного профиля пользователя

Эндпоинты **`/user/profile`** и токен обычного пользователя **не** дублируют CRM: у клиентов своё API обновления контактов (`/user/update-contact-info` и т.д.). Админская CRM всегда идёт через **`/admin/crm/*`** и **админский JWT**.

---

**Версия:** актуально для ветки с `crmOfflinePurchases` и доп. полями мерок в `pp_users`. При изменении бэкенда сверяйте с Swagger (`/v1/docs` в non-production) или исходниками `src/crm/`.
