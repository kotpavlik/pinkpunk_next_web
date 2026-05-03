# CRM API — руководство для фронтенда

Документ описывает контракт **админской CRM** (`/admin/crm/...`): авторизацию, типы данных, эндпоинты и примеры JSON. Идентификатор клиента в пути запросов — **Telegram `userId` (число)**, не Mongo `_id`.

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

## 2. Заказы и обогащение контактов в CRM (только JSON)

### 2.1. Поле `customerEmail` в заказе

В `pp_order` добавлено опциональное поле `customerEmail`. При `createOrderFromCart` туда пишется `dto.email` (снимок на момент заказа). Старые заказы без этого поля остаются как есть — для них email из заказа в профиль в ответе не подтянется.

### 2.2. Обогащение профиля в CRM

В `GET /admin/crm/users` (каждая строка) и в `GET /admin/crm/users/:userId` → `profile`:

- **`userPhoneNumber`** — если в профиле пусто, берётся из самого нового заказа, где телефон есть.
- **`email`** — если в профиле пусто, из `customerEmail` (или запасной ключ `email`) у заказов, по тому же принципу «с новых к старым».
- **`shippingAddress`** — берётся текущий адрес профиля и дозаполняются только пустые поля (`fullName`, `phone`, `street`, `house`, `apartment`, `city`, `postalCode`, `country`, `notes`) из заказов по убыванию даты (в каждом заказе подмешиваются только «дыры»).
- Если телефон взяли из заказа и раньше в профиле не был задан, для ответа может выставляться **`userPhoneNormalized`**, если цифр в номере достаточно.

Уже заполненные в Mongo контакты **не перезаписываются** данными из заказов. Чтобы сохранить эти данные в профиле пользователя, нужен `PATCH /admin/crm/users/:userId` с `userPhoneNumber`, `email`, `shippingAddress` и т.д.

---

## 3. Получение токена администратора

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

На фронте сохраняйте **`accessToken`** и подставляйте в `Authorization: Bearer ...`. При истечении — обновление через существующий refresh-flow админки.

---

## 4. Обзор эндпоинтов CRM

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

- `400` — неверный `userId` в пути или невалидный `lineId`.
- `401` — нет/просрочен токен или нет активной админ-сессии.
- `404` — пользователь, товар (для каталога) или строка офлайн-покупки не найдены.

---

## 5. Список клиентов — `GET /admin/crm/users`

**Ответ:** массив объектов. В каждом объекте:

- Все поля пользователя из Mongo **кроме** лишней тяжёлистики (токены и refresh-сессии **не** отдаются).
- В **`stats.orders`** приходят **полные объекты всех заказов** пользователя (с `populate` по товарам в позициях), см. п. 5.2.
- **Контакты** (`userPhoneNumber`, `userPhoneNormalized`, `email`, `shippingAddress`): при пустых полях в Mongo дозаполняются в JSON из самых свежих заказов (см. раздел 2.2).
- Полный массив **`crmOfflinePurchases` в списке не приходит** — вместо него агрегат **`offlinePurchasesSummary`**.
- Дополнительно: **`stats`** (счётчики и суммы), **`referralsCount`**, **`cart`**.

### 5.1. Пример элемента списка

См. бэкенд-док или Swagger; в списке присутствуют `stats.orders` с полными заказами.

### 5.2. Смысл `stats`

| Поле | Описание |
|------|----------|
| `ordersTotal` | Все заказы пользователя (любой статус), число |
| `ordersPaidOrCompleted` | Заказы со статусом `paid` или `completed`, число |
| `totalSpent` | Сумма **`totalAmount`** только по `paid` + `completed` |
| `totalUnitsPurchased` | Сумма **`items[].quantity`** по тем же заказам |
| `lastOrderAt` | Дата последнего заказа (любой статус) |
| **`orders`** | **Полные объекты заказов** этого пользователя; позиции с **`populate('items.product')`**; сортировка **от новых к старым** |

Статусы заказа: `pending_confirmation` | `confirmed` | `paid` | `completed` | `cancelled`.

У **новых** заказов есть поле **`customerEmail`**. Старые заказы могут без него.

### 5.3. `offlinePurchasesSummary`

- `linesCount` — число строк офлайн-покупок в карточке.
- `totalAmount` — сумма по строкам: для `catalog` — `unitPrice * quantity`, для `custom` — `customPrice * quantity`.

---

## 6. Карточка клиента — `GET /admin/crm/users/:userId`

**Ответ — объект:**

```json
{
  "profile": { },
  "orders": [ ],
  "referralsCount": 4,
  "cart": { }
}
```

### 6.1. `profile`

Тот же тип документа пользователя, что и в списке. Контакты **так же могут быть дозаполнены из `orders`**. Полный **`crmOfflinePurchases`**; для `kind: "catalog"` поле **`product`** может быть популировано.

### 6.2. `orders`

Массив заказов с **`populate('items.product')`**. Идентификация в заказах — строка `userId`.

### 6.3. `referralsCount` / `cart`

Как в исходном API-описании бэкенда.

---

## 7. Редактирование клиента — `PATCH /admin/crm/users/:userId`

Частичное обновление; тело — `CrmUpdateUserDto` (whitelist на бэкенде).

Поля: `personalFirstName`, `personalLastName`, `firstName`, `lastName`, `email`, `userPhoneNumber`, `shippingAddress` (слияние), `username`, `walletAddress`, `isAdmin`, `dateOfBirth`, мерки (`heightCm`, …), `adminNotes`.

**Ответ:** обновлённый пользователь (без `token`, `refreshSessions`).

Выбор товара для офлайн-строки из каталога: **`GET /products`**; в теле POST передаётся **`productId` = Mongo `_id`** карточки товара.

---

## 8. Офлайн-покупки

Не создают записи в публичном каталоге. Кастомные позиции только в `profile.crmOfflinePurchases`.

### 8.1. Добавить — `POST /admin/crm/users/:userId/offline-purchases`

**Каталог:** `{ "kind": "catalog", "productId": "...", "quantity": 1, "unitPriceOverride": 175 }` (override опционален).

**Кастом:** `{ "kind": "custom", "customName": "...", "customDescription": "...", "customPrice": 850, "quantity": 1 }`.

**Ответ:** `{ "success": true, "crmOfflinePurchases": [ ] }`.

### 8.2. Удалить — `DELETE .../offline-purchases/:lineId`

**Ответ:** `{ "success": true }`.

---

## 9. Отличие от публичного профиля

Эндпоинты **`/user/profile`** и токен пользователя **не** дублируют CRM. Админская CRM — **`/admin/crm/*`** и **админский JWT**.

---

**Версия:** актуально для ветки с `crmOfflinePurchases`, `customerEmail` в заказах и обогащением контактов в ответах CRM. Сверяйте со Swagger (`/v1/docs` в non-production) или исходниками `src/crm/` на бэкенде.
