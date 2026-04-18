Вот обновленный `PROJECT.md` с добавленной информацией о Discord OAuth через попап и решением проблемы с привязкой:

```markdown
# Проект: Сайт адвокатуры для GTA 5 RP

## Технологический стек
- **Frontend**: HTML, CSS, JavaScript (чистый, без фреймворков)
- **Хостинг**: GitHub Pages
- **Backend/BaaS**: Supabase (PostgreSQL, Edge Functions, Auth)
- **Аутентификация**: Supabase Auth (email/password)
- **API**: Edge Functions на Deno

## Структура проекта
```
/
├── index.html
├── assets/
│   └── logo.png          # Герб адвокатуры
├── css/
│   └── styles.css        # Основные стили (обновленный дизайн)
├── js/
│   ├── app.js            # Роутер и инициализация (с прелоадером)
│   ├── auth.js           # Аутентификация и состояние пользователя
│   ├── api.js            # Взаимодействие с Edge Functions
│   ├── utils.js          # Вспомогательные функции
│   └── pages/
│       ├── home.js       # Главная страница
│       ├── profile.js    # Профиль пользователя
│       ├── lawyers.js    # Список юристов
│       ├── appeals.js    # Обращения (требует Discord)
│       ├── senior.js     # Старший состав (роль 5+)
│       ├── admin.js      # Админ-панель (роль 6+)
│       └── lawyer-reports.js  # Отчеты адвоката (роль 4+) + Рейтинг
└── supabase/
    └── functions/        # Edge Functions
        ├── register/
        ├── login/
        ├── verify/
        ├── users/
        ├── update-role/
        ├── update-name/
        ├── profile/
        ├── discord/                  # OAuth + отвязка Discord
        ├── create-appeal/            # С поддержкой файлов
        ├── get-appeals/
        ├── update-appeal-status/
        ├── oral-exam-notification/
        ├── send-exam-result/         # Уведомление о результате экзамена
        ├── lawyer-reports/           # CRUD для отчетов + Рейтинг
        └── send-lawyer-report/       # Отправка отчета в Discord с фото
```

## Визуальное оформление

### Цветовая схема
```css
--color-dark: #0a0e17      # Темный фон
--color-darker: #050811    # Более темный фон (шапка, подвал)
--color-primary: #1a2b4c   # Основной цвет
--color-accent: #d4af37     # Золотой акцент (заголовки, кнопки)
--color-accent-dark: #b8941f # Темно-золотой
--color-light: #e6e9f0      # Светлый текст
--color-gray: #2a3142       # Серый фон карточек
--color-gray-light: #3a4357 # Светло-серый
```

### Логотип и брендинг
- **Название**: Коллегия государственных адвокатов
- **Подзаголовок**: Majestic RP | Boston (курсив, золотой цвет)
- **Герб**: `assets/logo.png` (отображается рядом с названием и в прелоадере)

### Прелоадер
- Большой вращающийся герб с анимацией
- Пульсирующее кольцо вокруг герба
- Анимированный текст с золотым свечением
- Плавное исчезновение при загрузке
- Показывается при навигации между страницами

### Анимации
- Плавное появление контента (fadeIn)
- Анимация навигационных ссылок (slideInRight)
- Эффекты при наведении на карточки
- Плавная прокрутка страницы

## Supabase настройки

### URL и ключи
```
SUPABASE_URL: https://rfjmdevsnvirrxonhsny.supabase.co
SUPABASE_ANON_KEY: eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InJmam1kZXZzbnZpcnJ4b25oc255Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3Mzg5MjM0NzAsImV4cCI6MjA1NDQ5OTQ3MH0.3ZqW9RfVh0yL7zK9xQrL8JwF5qQx9ZwP9VqL2Yp8t4A
SUPABASE_SERVICE_ROLE_KEY: (хранится в секретах, не публикуется)
```

### Таблица users
```sql
CREATE TABLE users (
    id SERIAL PRIMARY KEY,
    auth_id UUID UNIQUE REFERENCES auth.users(id) ON DELETE CASCADE,
    character_name VARCHAR(100) NOT NULL,
    static_id VARCHAR(50) UNIQUE NOT NULL,
    role_level INTEGER DEFAULT 1 CHECK (role_level >= 1 AND role_level <= 8),
    discord_id TEXT UNIQUE DEFAULT NULL,
    created_at TIMESTAMP DEFAULT NOW()
);
```

### Таблица appeals
```sql
CREATE TABLE appeals (
    id SERIAL PRIMARY KEY,
    user_id INTEGER REFERENCES users(id) ON DELETE CASCADE,
    auth_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
    discord_id TEXT,
    character_name VARCHAR(100),
    static_id VARCHAR(50),
    appeal_type VARCHAR(50) NOT NULL,
    details JSONB DEFAULT '{}',
    status VARCHAR(20) DEFAULT 'pending',
    admin_comment TEXT,
    notification_sent BOOLEAN DEFAULT FALSE,
    notification_sent_at TIMESTAMP,
    discord_thread_id TEXT,
    discord_thread_name TEXT,
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW()
);

CREATE INDEX idx_appeals_user_id ON appeals(user_id);
CREATE INDEX idx_appeals_status ON appeals(status);
CREATE INDEX idx_appeals_created_at ON appeals(created_at);
```

### Таблица lawyer_reports
```sql
CREATE TABLE lawyer_reports (
    id SERIAL PRIMARY KEY,
    user_id INTEGER REFERENCES users(id) ON DELETE CASCADE,
    auth_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
    lawyer_name VARCHAR(100) NOT NULL,
    lawyer_static_id VARCHAR(50) NOT NULL,
    articles TEXT NOT NULL,
    call_result VARCHAR(20) NOT NULL CHECK (call_result IN ('Посадили', 'Отпустили')),
    had_jurist BOOLEAN DEFAULT FALSE,
    report_date TIMESTAMP DEFAULT NOW(),
    created_at TIMESTAMP DEFAULT NOW()
);

CREATE INDEX idx_lawyer_reports_user_id ON lawyer_reports(user_id);
CREATE INDEX idx_lawyer_reports_date ON lawyer_reports(report_date DESC);
CREATE INDEX idx_lawyer_reports_lawyer_name ON lawyer_reports(lawyer_name);
CREATE INDEX idx_lawyer_reports_created_at ON lawyer_reports(created_at DESC);
```

### Таблица discord_auth_states (для OAuth)
```sql
CREATE TABLE discord_auth_states (
    id SERIAL PRIMARY KEY,
    state TEXT UNIQUE NOT NULL,
    token TEXT NOT NULL,
    created_at TIMESTAMP DEFAULT NOW(),
    expires_at TIMESTAMP NOT NULL
);
```

### Система ролей
| Level | Роль |
|-------|------|
| 1 | Гражданин |
| 2 | Стажер адвокатуры |
| 3 | Юрист |
| 4 | Адвокат |
| 5 | Старший адвокат |
| 6 | Зам. главы коллегии |
| 7 | Глава коллегии |
| 8 | Администрация |

### Доступ к страницам по ролям
| Страница | Роль | Доп. условие |
|----------|------|---------------|
| Главная | 1+ | - |
| Профиль | 1+ | - |
| О нас | 1+ | - |
| Отчеты адвоката | 4+ | Включает рейтинг недели |
| Обращения | 1+ | **Требуется привязка Discord** |
| Старший состав | 5+ | - |
| Управление | 6+ | - |

## Discord OAuth интеграция

### Механизм работы
1. Пользователь нажимает "Привязать Discord" в профиле
2. Открывается попап окно с авторизацией Discord
3. Пользователь авторизуется и разрешает доступ
4. Discord перенаправляет обратно на Edge Function
5. Edge Function обрабатывает код, получает Discord ID
6. Обновляется `discord_id` в таблице `users`
7. Попап отправляет сообщение родительскому окну и закрывается
8. Родительское окно обновляет данные пользователя и интерфейс

### Edge Function (discord/index.ts)

**Поддерживаемые методы:**
- `GET` - OAuth flow (редирект на Discord и обработка callback)
- `DELETE` - отвязка Discord (через Authorization header)

**Параметры GET запроса:**
- `token` - JWT токен пользователя (для начала OAuth)
- `code` - код от Discord (callback)
- `state` - состояние OAuth (callback)

**DELETE запрос:**
```javascript
fetch('/functions/v1/discord', {
    method: 'DELETE',
    headers: { 'Authorization': `Bearer ${token}` }
})
```

**Возвращаемые данные (DELETE):**
```json
{ "success": true, "message": "Discord successfully unlinked" }
```

### API методы клиента (js/api.js)

```javascript
// Привязка Discord (открывает попап)
API.linkDiscord(token) // возвращает Promise

// Отвязка Discord
API.unlinkDiscord(token) // возвращает { success: true }
```

### Особенности реализации
- Попап закрывается автоматически после успешной/неуспешной привязки
- Используется `postMessage` для коммуникации между окнами
- Токен передается через URL параметр при старте OAuth
- Состояние OAuth хранится в таблице `discord_auth_states` (10 минут)
- После callback состояние удаляется
- При успехе попап отправляет `discord-linked`, при ошибке - `discord-error`

### Решение проблем с привязкой Discord

**Проблема: Попап блокируется браузером**
- Решение: Пользователь должен разрешить всплывающие окна для сайта

**Проблема: При успешной привязке выдается ошибка**
- Решение: Метод `API.linkDiscord` возвращает только `{ success: true }`, без ожидания `discordId`

**Проблема: HTML отображается как текст в попапе**
- Решение: Edge Function возвращает `application/javascript` с кодом закрытия окна

**Проблема: Ничего не происходит при нажатии**
- Решение: Проверить консоль браузера, разрешить попапы, проверить наличие токена

## Страница отчетов адвоката (lawyer-reports.js)

### Вкладки страницы
1. **Создать отчет** - форма для добавления нового отчета
2. **Мои отчеты** - список своих отчетов со статистикой
3. **Рейтинг недели** - рейтинг адвокатов за текущую неделю
4. **Все отчеты** (роль 6+) - просмотр всех отчетов с фильтрацией

### Вкладка "Создать отчет"

**Обязательные поля:**
- Статьи закона (текстовое поле)
- Результат вызова: "Отпустили" или "Посадили"

**Фото (обязательные):**
1. Фото 1: Факт приезда на вызов
2. Фото 2: Результат вызова
   - Если "Отпустили" - фото на свободе с задержанным
   - Если "Посадили" - можно дублировать первое фото

**Опционально:**
- Чекбокс "Был ли на вызове юрист"
- При отметке появляется поле для фото с юристом (доказательство присутствия)

**Важно:** Файлы не сохраняются в базу данных, только отправляются в Discord через вебхук

### Вкладка "Мои отчеты"
- Список своих отчетов с пагинацией
- Статистика: всего отчетов, отпустили, посадили, с юристом
- Отображаются только отчеты текущего пользователя

### Вкладка "Рейтинг недели" 🏆

**Система начисления очков:**
- ✅ Освободил человека: **+1 очко**
- 🔒 Посадил человека: **+0.5 очка**
- 👨‍⚖️ На вызове был юрист: **+0.5 очка**

**Отображаемая информация:**
- Период: текущая неделя (понедельник - воскресенье)
- Таблица рейтинга со следующими колонками:
  - Место (🥇, 🥈, 🥉 для топ-3)
  - Имя адвоката
  - Static ID
  - Количество вызовов
  - Количество освобожденных
  - Количество посаженных
  - Количество вызовов с юристом
  - Итоговые очки

**Особенности:**
- Автоматический расчет на основе отчетов за текущую неделю
- Сортировка по убыванию очков
- Обновляется при добавлении новых отчетов
- Доступен всем авторизованным пользователям

### Вкладка "Все отчеты" (роль 6+)
- Просмотр всех отчетов системы
- Фильтрация по адвокату и датам
- Управление и анализ работы адвокатов

## Типы обращений

### 1. Запрос на устный экзамен (`oral_exam`)
- Поля: дата, время, доп. информация
- Отправка в Discord через `oral-exam-notification`

### 2. Запрос на аккредитацию юриста (`accreditation`)
- Требования: скриншот удостоверения, скриншот ролей в State
- Файлы: 2 изображения
- Отправка в Discord через `DISCORD_ACCREDITATION_WEBHOOK`

### 3. Запрос на повышение до адвоката (`lawyer_promotion`)
- Требования: присутствие на 3х вызовах в качестве юриста + сдача теоретического экзамена
- Файлы: 3 скриншота с вызовов
- Доп. поле: ссылка на сообщение о прохождении экзамена
- Отправка в Discord через `DISCORD_LAWYER_PROMOTION_WEBHOOK`

## Edge Functions

### Все функции деплоятся с флагом --no-verify-jwt
**Причина**: JWT токены используют алгоритм ES256, который не поддерживается Edge Functions gateway. Проверка прав выполняется внутри функций.

### Существующие функции
1. `register` - регистрация
2. `login` - вход
3. `verify` - проверка токена
4. `users` - получение списка пользователей
5. `update-role` - обновление роли
6. `update-name` - обновление имени
7. `profile` - управление профилем
8. `discord` - OAuth интеграция и отвязка Discord
9. `create-appeal` - создание обращений (с поддержкой файлов)
10. `get-appeals` - получение обращений
11. `update-appeal-status` - обновление статуса обращения
12. `oral-exam-notification` - уведомление об экзамене
13. `send-exam-result` - уведомление о результате экзамена
14. `lawyer-reports` - CRUD для отчетов + расчет рейтинга недели
15. `send-lawyer-report` - отправка отчета в Discord с файлами

### Функция lawyer-reports - GET параметры
| Параметр | Значение | Описание |
|----------|----------|----------|
| (без параметров) | - | Получение своих отчетов |
| `?all=true` | true/false | Получение всех отчетов (только роль 6+) |
| `?rating=true` | true/false | Получение рейтинга за текущую неделю |
| `?user_id=123` | число | Фильтр по пользователю (только роль 6+) |

## Discord интеграция

### Настройки Discord Developer Portal
1. Создайте приложение на https://discord.com/developers/applications
2. В разделе OAuth2 → General добавьте Redirect URI:
   ```
   https://rfjmdevsnvirrxonhsny.supabase.co/functions/v1/discord
   ```
3. Выберите scope: `identify`

### Переменные окружения для Discord
```bash
# OAuth
DISCORD_CLIENT_ID=ваш_client_id
DISCORD_CLIENT_SECRET=ваш_client_secret

# Вебхуки для обращений
DISCORD_ORAL_EXAM_WEBHOOK=https://discord.com/api/webhooks/...
DISCORD_ACCREDITATION_WEBHOOK=https://discord.com/api/webhooks/...
DISCORD_LAWYER_PROMOTION_WEBHOOK=https://discord.com/api/webhooks/...

# Вебхук для результатов экзамена
DISCORD_EXAM_RESULT_WEBHOOK=https://discord.com/api/webhooks/...

# Вебхук для отчетов адвоката
DISCORD_LAWYER_REPORT_WEBHOOK=https://discord.com/api/webhooks/...

# Опционально
DISCORD_STAFF_ROLE_ID=123456789012345678
```

## API Методы клиента (js/api.js)

```javascript
// Аутентификация
API.register(name, staticId, password)
API.login(staticId, password)
API.verifyToken(token)

// Управление пользователями
API.getUsers(token)
API.updateUserRole(token, userId, newRole)
API.updateUserName(token, userId, newName)

// Профиль
API.getProfile(token)
API.updateProfile(token, updates)

// Обращения
API.createAppeal(token, appealType, details)           // для JSON
API.createAppealWithFiles(token, formData)             // для файлов
API.getAppeals(token, status, userId)
API.updateAppealStatus(token, appealId, status, adminComment, newRoleLevel, discordThreadId)

// Discord
API.linkDiscord(token)                                 // открывает попап, возвращает Promise
API.unlinkDiscord(token)                               // отвязка, возвращает { success: true }
API.getDiscordInfo(discordId)

// Отчеты адвоката
API.createLawyerReport(token, articles, callResult, hadJurist)  // только текст
API.getLawyerReports(token, filters)                            // получение с фильтрацией
API.getLawyerRating(token)                                      // получение рейтинга недели
```

## Страница старшего состава (senior.js)

### Вкладка "Рассмотреть обращения":
1. Загрузка всех обращений со статусом `pending`
2. Отображение карточек для всех типов обращений
3. Кнопки "Одобрить" и "Отклонить"
4. Модальное окно с Discord Thread ID и комментарием
5. Отправка уведомления в Discord

### Вкладка "Результат проведения экзамена":
1. Поиск пользователя по Static ID или имени
2. Выбор результата (сдал/не сдал)
3. Отправка уведомления в Discord через `send-exam-result`

## Команды для деплоя

```bash
# Деплой всех функций
supabase functions deploy register --no-verify-jwt
supabase functions deploy login --no-verify-jwt
supabase functions deploy verify --no-verify-jwt
supabase functions deploy users --no-verify-jwt
supabase functions deploy update-role --no-verify-jwt
supabase functions deploy update-name --no-verify-jwt
supabase functions deploy profile --no-verify-jwt
supabase functions deploy discord --no-verify-jwt
supabase functions deploy create-appeal --no-verify-jwt
supabase functions deploy get-appeals --no-verify-jwt
supabase functions deploy update-appeal-status --no-verify-jwt
supabase functions deploy oral-exam-notification --no-verify-jwt
supabase functions deploy send-exam-result --no-verify-jwt
supabase functions deploy lawyer-reports --no-verify-jwt
supabase functions deploy send-lawyer-report --no-verify-jwt

# Установка секретов
supabase secrets set DISCORD_CLIENT_ID="client_id"
supabase secrets set DISCORD_CLIENT_SECRET="client_secret"
supabase secrets set DISCORD_ORAL_EXAM_WEBHOOK="url"
supabase secrets set DISCORD_ACCREDITATION_WEBHOOK="url"
supabase secrets set DISCORD_LAWYER_PROMOTION_WEBHOOK="url"
supabase secrets set DISCORD_EXAM_RESULT_WEBHOOK="url"
supabase secrets set DISCORD_LAWYER_REPORT_WEBHOOK="url"

# Просмотр логов
supabase functions logs discord --tail
supabase functions logs lawyer-reports --tail
```

## Тестовые данные

**Администратор**:
- Static ID: `202027`
- Пароль: `123456`
- Роль: 8
- Discord ID: `336864135906197505` (привязан)

**Обычный пользователь**:
- Static ID: `test123`
- Пароль: `123456`
- Роль: 1

## Важные заметки

1. **Email confirmation должен быть ОТКЛЮЧЕН** в настройках Supabase Auth
2. **CORS настройки** включены в каждой Edge Function
3. **Токен хранится** в sessionStorage (ключ `auth_token`, очищается при закрытии вкладки)
4. **RLS отключен** для таблиц (безопасность на уровне Edge Functions)
5. **Пароли хранятся** только в Supabase Auth (не в таблице users)
6. **Все функции публичные** (`--no-verify-jwt`), но имеют внутреннюю проверку прав
7. **Файлы обращений не хранятся в БД** — отправляются напрямую в Discord
8. **Отчеты адвоката**: текст хранится в БД, файлы только в Discord
9. **Страница "Отчеты адвоката"** доступна для роли 4+
10. **Страница "Обращения"** доступна только при привязанном Discord
11. **Прелоадер** показывается при загрузке страницы и при навигации
12. **Рейтинг недели** автоматически рассчитывается на основе отчетов за текущую неделю
13. **Discord OAuth** использует попап, который автоматически закрывается после привязки

## Решенные проблемы

### Проблема 1: Роль сбрасывалась на 1 после обновления страницы
**Решение**: Функция `verify` получает актуальные данные из таблицы `users`

### Проблема 2: Ошибка ES256 алгоритма при проверке JWT
**Решение**: Все функции деплоятся с флагом `--no-verify-jwt`

### Проблема 3: Discord ID не отображался в профиле
**Решение**: Функция `verify` возвращает поле `discord_id`

### Проблема 4: Ошибка Maximum call stack size exceeded при отправке файлов
**Решение**: Отправка файлов через FormData без преобразования в base64

### Проблема 5: Токен не находился в lawyer-reports
**Решение**: Использование правильного ключа `auth_token` вместо `access_token`

### Проблема 6: CORS ошибки при отправке отчетов
**Решение**: Правильная настройка CORS заголовков во всех Edge Functions

### Проблема 7: HTML отображался как текст в попапе при привязке Discord
**Решение**: Edge Function возвращает `application/javascript` с кодом закрытия окна

### Проблема 8: Ошибка при успешной привязке Discord
**Решение**: Метод `API.linkDiscord` возвращает только `{ success: true }`, без ожидания `discordId`

### Проблема 9: Попап блокируется браузером
**Решение**: Добавлена проверка и уведомление пользователя о необходимости разрешить попапы

## Что можно добавить в будущем

1. ~~Привязка Discord к профилю~~ ✅
2. ~~Система обращений с проверкой Discord~~ ✅
3. ~~Автоматическое создание веток форума в Discord~~ ✅
4. ~~Страница для старшего состава (роль 5+)~~ ✅
5. ~~Рассмотрение обращений старшим составом~~ ✅
6. ~~Отправка ответов в Discord через вебхук~~ ✅
7. ~~Ввод результатов экзаменов~~ ✅
8. ~~Отправка уведомлений о результате экзамена в Discord~~ ✅
9. ~~Запрос на аккредитацию юриста с файлами~~ ✅
10. ~~Запрос на повышение до адвоката с 3 скриншотами~~ ✅
11. ~~Страница отчетов адвоката (роль 4+)~~ ✅
12. ~~Отправка отчетов в Discord с фото~~ ✅
13. ~~Обновление визуального оформления~~ ✅
14. ~~Прелоадер с гербом~~ ✅
15. ~~Новый брендинг "Коллегия государственных адвокатов"~~ ✅
16. ~~Рейтинг адвокатов недели~~ ✅
17. ~~Discord OAuth через попап с автоматическим закрытием~~ ✅
18. Администрирование обращений (изменение статуса, комментарии)
19. Синхронизация ролей с Discord сервером
20. Логирование действий администраторов
21. Календарь консультаций
22. Экспорт отчетов в CSV/Excel
23. Детальная статистика по каждому адвокату
24. Еженедельные отчеты в Discord о топе адвокатов
```

**Основные обновления документа:**
1. Добавлен подробный раздел о Discord OAuth интеграции
2. Описан механизм работы с попапом и `postMessage`
3. Добавлены решения проблем с привязкой Discord
4. Обновлен список решенных проблем (добавлены проблемы 7-9)
5. Обновлен список API методов с описанием Discord функций
6. Добавлены заметки о работе с попапами и браузерными ограничениями