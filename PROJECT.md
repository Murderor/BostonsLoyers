Вот обновленный `PROJECT.md` с добавленной информацией о повышении до старшего адвоката:

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
│       ├── appeals.js    # Обращения + Письменный экзамен + Повышение до старшего адвоката
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
        ├── create-appeal/            # С поддержкой файлов + все типы обращений
        ├── get-appeals/
        ├── update-appeal-status/
        ├── oral-exam-notification/
        ├── send-exam-result/         # Уведомление о результате экзамена
        ├── lawyer-reports/           # CRUD для отчетов + Рейтинг
        ├── send-lawyer-report/       # Отправка отчета в Discord с фото
        ├── exam-questions/           # Получение вопросов для письменного экзамена
        ├── submit-exam/              # Отправка результатов письменного экзамена
        ├── get-exam-history/         # История попыток экзамена
        └── senior-promotion-notification/  # Уведомление о заявке на повышение до старшего адвоката
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
```

### Таблица exam_questions (письменный экзамен)
```sql
CREATE TABLE exam_questions (
    id SERIAL PRIMARY KEY,
    question_text TEXT NOT NULL,
    options JSONB NOT NULL,
    correct_answer INTEGER NOT NULL,
    category VARCHAR(50),
    points INTEGER DEFAULT 1,
    created_at TIMESTAMP DEFAULT NOW()
);
```

### Таблица exam_attempts (попытки экзамена)
```sql
CREATE TABLE exam_attempts (
    id SERIAL PRIMARY KEY,
    user_id INTEGER REFERENCES users(id) ON DELETE CASCADE,
    auth_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
    score_percent DECIMAL(5,2),
    correct_answers INTEGER,
    total_questions INTEGER,
    passed BOOLEAN DEFAULT FALSE,
    answers JSONB DEFAULT '[]',
    time_spent INTEGER,
    completed_at TIMESTAMP DEFAULT NOW()
);
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
| Обращения | 1+ | **Требуется привязка Discord** + Письменный экзамен |
| Старший состав | 5+ | - |
| Управление | 6+ | - |

## Типы обращений

### 1. Запрос на устный экзамен (`oral_exam`)
- Поля: дата, время, доп. информация
- Отправка в Discord через `oral-exam-notification`

### 2. Письменный экзамен (`written_exam`)
- 20 вопросов по законодательной базе
- Время: 30 минут
- Проходной балл: 70%
- Периодичность: раз в 3 часа
- Автоматическое одобрение при успешной сдаче
- Отправка уведомления в Discord через `DISCORD_ORAL_EXAM_WEBHOOK`

### 3. Запрос на аккредитацию юриста (`accreditation`)
- Требования: скриншот удостоверения, скриншот ролей в State
- Файлы: 2 изображения
- Отправка в Discord через `DISCORD_ACCREDITATION_WEBHOOK`

### 4. Запрос на повышение до адвоката (`lawyer_promotion`)
- Требования: присутствие на 3х вызовах в качестве юриста + сдача теоретического экзамена
- Файлы: 3 скриншота с вызовов
- Доп. поле: ссылка на сообщение о прохождении экзамена

### 5. Запрос на повышение до старшего адвоката (`senior_promotion`) ⭐ НОВОЕ
- **Требования**:
  - Действующая роль "Адвокат" (уровень 4)
  - Стаж работы в должности адвоката не менее 2 недель
  - Положительная репутация и отсутствие дисциплинарных взысканий
  - Активная работа в коллегии и высокие показатели рейтинга

- **Поля формы**:
  - Текстовое поле "Опишите, как вы видите себя в роли старшего адвоката" (минимум 500 символов)
  - Поле для вставки ссылок на доказательства проделанной работы (динамическое добавление)
  - Чекбокс "Готовы ли вы пройти собеседование у старшего состава адвокатуры?" (обязательный)
  - Дополнительный комментарий (опционально)

- **Процесс подачи**:
  1. Пользователь заполняет форму с видением роли и прикладывает ссылки на доказательства
  2. Подтверждает готовность к собеседованию
  3. Отправляет заявку на рассмотрение
  4. Обращение создается в БД со статусом `pending`
  5. В Discord отправляется уведомление старшему составу через вебхук `DISCORD_SENIOR_PROMOTION_WEBHOOK`

- **Уведомление в Discord**:
  - Embed сообщение с золотым цветом
  - Содержит информацию о заявителе (имя, static ID, текущая роль, Discord)
  - Видение роли старшего адвоката
  - Ссылки на доказательства работы
  - Статус готовности к собеседованию
  - Упоминание ролей старшего состава

## Письменный экзамен 📚

### Общая информация
- Доступен на вкладке "Обращения" → "Новое обращение" → "Письменный экзамен"
- **20 вопросов** по законодательной базе Majestic RP
- **Время на прохождение**: 30 минут
- **Проходной балл**: 70% (14 из 20)
- **Периодичность**: можно сдавать **раз в 3 часа**
- При успешной сдаче создается автоматическое обращение со статусом "Одобрено"

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
9. `create-appeal` - создание обращений (с поддержкой файлов и всех типов)
10. `get-appeals` - получение обращений
11. `update-appeal-status` - обновление статуса обращения
12. `oral-exam-notification` - уведомление об экзамене
13. `send-exam-result` - уведомление о результате экзамена
14. `lawyer-reports` - CRUD для отчетов + расчет рейтинга недели
15. `send-lawyer-report` - отправка отчета в Discord с файлами
16. `exam-questions` - получение вопросов для письменного экзамена
17. `submit-exam` - сохранение результатов + отправка в Discord
18. `get-exam-history` - история попыток экзамена
19. **`senior-promotion-notification`** - уведомление о заявке на повышение до старшего адвоката ⭐ НОВОЕ

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

## Секреты для Discord вебхуков

```bash
# Установка всех необходимых секретов
supabase secrets set DISCORD_CLIENT_ID="client_id"
supabase secrets set DISCORD_CLIENT_SECRET="client_secret"
supabase secrets set DISCORD_ORAL_EXAM_WEBHOOK="url"
supabase secrets set DISCORD_ACCREDITATION_WEBHOOK="url"
supabase secrets set DISCORD_LAWYER_PROMOTION_WEBHOOK="url"
supabase secrets set DISCORD_EXAM_RESULT_WEBHOOK="url"
supabase secrets set DISCORD_LAWYER_REPORT_WEBHOOK="url"
supabase secrets set DISCORD_SENIOR_PROMOTION_WEBHOOK="url"  # ⭐ НОВЫЙ
supabase secrets set SUPABASE_SERVICE_ROLE_KEY="service_role_key"
```

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
supabase functions deploy exam-questions --no-verify-jwt
supabase functions deploy submit-exam --no-verify-jwt
supabase functions deploy get-exam-history --no-verify-jwt
supabase functions deploy senior-promotion-notification --no-verify-jwt  # ⭐ НОВЫЙ

# Просмотр логов
supabase functions logs senior-promotion-notification --tail
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
8. **Письменный экзамен** можно сдавать раз в 3 часа
9. **Страница "Обращения"** доступна только при привязанном Discord
10. **Экзамен содержит 20 вопросов**, проходной балл 70%

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

### Проблема 7: RLS ошибки при сохранении экзамена
**Решение**: Использование admin клиента с SERVICE_ROLE_KEY для обхода RLS

### Проблема 8: Ошибка вебхука для форумного канала
**Решение**: Добавление параметра `thread_name` в запрос к Discord API

### Проблема 9: HTML отображался как текст в попапе при привязке Discord
**Решение**: Edge Function возвращает `application/javascript` с кодом закрытия окна

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
18. ~~Письменный экзамен на знание законов~~ ✅
19. ~~Экзамен раз в 3 часа~~ ✅
20. ~~Отправка результатов экзамена в Discord~~ ✅
21. ~~Запрос на повышение до старшего адвоката~~ ✅ ⭐ НОВОЕ
22. ~~Отправка уведомлений о повышении в Discord~~ ✅ ⭐ НОВОЕ
23. Администрирование обращений (изменение статуса, комментарии)
24. Синхронизация ролей с Discord сервером
25. Логирование действий администраторов
26. Календарь консультаций
27. Экспорт отчетов в CSV/Excel
28. Детальная статистика по каждому адвокату
29. Еженедельные отчеты в Discord о топе адвокатов
30. Система достижений и наград за успешную сдачу экзаменов
31. Рассмотрение заявок на повышение до старшего адвоката через админ-панель
32. Автоматическое повышение роли при одобрении заявки
```

**Основные обновления документа:**

1. ✅ Добавлен новый тип обращения `senior_promotion` (запрос на повышение до старшего адвоката)
2. ✅ Добавлена новая Edge Function `senior-promotion-notification`
3. ✅ Добавлен новый секрет `DISCORD_SENIOR_PROMOTION_WEBHOOK`
4. ✅ Обновлена структура проекта
5. ✅ Обновлены требования и процесс подачи заявки
6. ✅ Обновлен список будущих улучшений