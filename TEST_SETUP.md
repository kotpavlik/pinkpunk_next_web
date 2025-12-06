# Настройка тестов для функциональности редактирования товара

## Установка зависимостей

Для запуска тестов необходимо установить тестовые библиотеки:

### Вариант 1: Jest (рекомендуется для Next.js)

```bash
npm install --save-dev jest @types/jest ts-jest @testing-library/react @testing-library/jest-dom @testing-library/user-event
```

Создайте файл `jest.config.js`:

```javascript
const nextJest = require('next/jest')

const createJestConfig = nextJest({
  dir: './',
})

const customJestConfig = {
  setupFilesAfterEnv: ['<rootDir>/jest.setup.js'],
  testEnvironment: 'jest-environment-jsdom',
  moduleNameMapper: {
    '^@/(.*)$': '<rootDir>/src/$1',
  },
}

module.exports = createJestConfig(customJestConfig)
```

Создайте файл `jest.setup.js`:

```javascript
import '@testing-library/jest-dom'
```

Добавьте в `package.json`:

```json
{
  "scripts": {
    "test": "jest",
    "test:watch": "jest --watch"
  }
}
```

### Вариант 2: Vitest (альтернатива)

```bash
npm install --save-dev vitest @testing-library/react @testing-library/jest-dom @testing-library/user-event
```

Создайте файл `vitest.config.ts`:

```typescript
import { defineConfig } from 'vitest/config'
import react from '@vitejs/plugin-react'
import path from 'path'

export default defineConfig({
  plugins: [react()],
  test: {
    environment: 'jsdom',
    setupFiles: ['./vitest.setup.ts'],
  },
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './src'),
    },
  },
})
```

Добавьте в `package.json`:

```json
{
  "scripts": {
    "test": "vitest",
    "test:ui": "vitest --ui"
  }
}
```

## Запуск тестов

После установки зависимостей запустите:

```bash
npm test
```

## Структура тестов

Тесты находятся в следующих файлах:

1. **`src/api/__tests__/ProductApi.test.ts`** - Тесты для API метода UpdateProduct
2. **`src/zustand/products_store/__tests__/ProductsStore.test.ts`** - Тесты для store метода updateProduct
3. **`src/components/ui/admin/__tests__/AdminProducts.test.tsx`** - Тесты для компонента AdminProducts

## Что тестируется

### ProductApi.UpdateProduct
- ✅ Отправка FormData при наличии новых фото
- ✅ Отправка JSON при отсутствии новых фото
- ✅ Обработка удаления фото через removePhotos
- ✅ Частичное обновление товара

### ProductsStore.updateProduct
- ✅ Обновление товара в массиве products
- ✅ Обновление currentProduct если редактируется текущий товар
- ✅ Обработка ошибок и установка статуса failed
- ✅ Вызов API с правильными параметрами

### AdminProducts компонент
- ✅ Отображение правильного заголовка в режиме редактирования
- ✅ Предзаполнение формы данными товара
- ✅ Блокировка поля productId в режиме редактирования
- ✅ Отображение текущих фотографий
- ✅ Вызов updateProduct при сохранении
- ✅ Вызов onSuccess после успешного обновления
- ✅ Отображение сообщения об успехе
- ✅ Обработка удаления фотографий

## Примечания

- Тесты используют моки для изоляции тестируемых компонентов
- Для тестирования компонентов React используется @testing-library/react
- Для тестирования пользовательских взаимодействий используется @testing-library/user-event

