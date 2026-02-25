# NetVillage ISP Management System

Система управления интернет-провайдером для NetVillage (Казахстан, ~30 клиентов).

## Стек технологий

- **Backend**: Django 4.2 + Django REST Framework + Daphne (ASGI)
- **Frontend**: React 18 + Redux Toolkit + Tailwind CSS
- **БД**: PostgreSQL 15
- **Кеш / Очереди**: Redis 7 + Celery
- **WebSocket**: Django Channels (статус оплаты в реальном времени)
- **Роутер**: MikroTik hEX S (RouterOS 6.49.11) через librouteros API
- **Оплата**: Kaspi Pay QR
- **Деплой**: Docker Compose + Nginx

## Быстрый старт

### 1. Клонировать и настроить

```bash
git clone <repo>
cd NetVillage2.0

# Скопировать и заполнить .env
cp backend/.env.example backend/.env
# Обязательно указать: MIKROTIK_PASSWORD, KASPI_MERCHANT_ID, KASPI_API_KEY
```

### 2. Запустить через Docker

```bash
docker-compose up -d

# Применить миграции и создать тестовые данные
docker-compose exec backend python manage.py seed_clients
```

### 3. Открыть в браузере

- **Личный кабинет**: http://localhost
- **Админ панель**: http://localhost/admin/dashboard
- **Django Admin**: http://localhost/django-admin/

**Тестовые аккаунты** (после seed_clients):
- Администратор: `+77770000000` / `admin123`
- Клиент (Adik): `+77771000000` / `client123`
- Клиент (Salim): `+77772000000` / `client123`
- ...и т.д. (всего 9 клиентов)

## API Эндпоинты

### Авторизация
| Метод | URL | Описание |
|-------|-----|----------|
| POST | `/api/auth/login/` | Вход (phone + password → JWT) |
| POST | `/api/auth/logout/` | Выход |
| POST | `/api/auth/token/refresh/` | Обновление токена |
| GET/PATCH | `/api/auth/profile/` | Профиль пользователя |
| POST | `/api/auth/change-password/` | Смена пароля сайта |
| POST | `/api/auth/change-pppoe-password/` | Смена PPPoE пароля |

### Платежи (клиент)
| Метод | URL | Описание |
|-------|-----|----------|
| GET | `/api/payments/history/` | История платежей |
| POST | `/api/payments/create/` | Создать платёж + получить QR |
| GET | `/api/payments/status/{id}/` | Статус платежа |
| POST | `/api/payments/calculate/` | Расчёт стоимости |

### MikroTik
| Метод | URL | Описание |
|-------|-----|----------|
| GET | `/api/mikrotik/my-status/` | Статус подключения клиента |
| GET | `/api/mikrotik/clients/` | Все PPPoE клиенты (admin) |

### Kaspi Pay
| Метод | URL | Описание |
|-------|-----|----------|
| POST | `/api/kaspi/webhook/` | Webhook подтверждения оплаты |

### Администратор
| Метод | URL | Описание |
|-------|-----|----------|
| GET | `/api/admin/clients/` | Список клиентов (с фильтрами) |
| POST | `/api/admin/clients/create/` | Создать клиента |
| GET/PATCH/DELETE | `/api/admin/clients/{id}/` | Клиент по ID |
| POST | `/api/admin/clients/{id}/tariff/` | Сменить тариф |
| POST | `/api/admin/clients/{id}/extend/` | Продлить подписку вручную |
| POST | `/api/admin/clients/{id}/toggle/` | Включить/отключить |
| GET | `/api/admin/statistics/` | Статистика (доходы, графики) |
| GET | `/api/admin/payments/` | Все платежи |

## Структура проекта

```
NetVillage2.0/
├── backend/
│   ├── netvillage/          # Django settings, urls, celery
│   ├── apps/
│   │   ├── accounts/        # User model, JWT auth, profile
│   │   ├── payments/        # Payment model, Kaspi QR, WebSocket
│   │   ├── mikrotik/        # MikroTik RouterOS API client
│   │   ├── kaspi/           # Kaspi Pay webhook
│   │   └── admin_panel/     # Admin API (clients, stats)
│   ├── Dockerfile
│   └── requirements.txt
├── frontend/
│   ├── src/
│   │   ├── pages/
│   │   │   ├── client/      # Login, Dashboard, Payment, History, Settings
│   │   │   └── admin/       # Dashboard, Clients, ClientDetail, Payments
│   │   ├── components/      # Layouts, common components
│   │   ├── store/           # Redux slices (auth, payment, admin)
│   │   └── api/             # Axios + API endpoints
│   ├── Dockerfile
│   └── package.json
├── nginx/
│   └── nginx.conf
└── docker-compose.yml
```

## Тарифы

| Профиль | Скорость | Цена/мес |
|---------|----------|----------|
| tariff-5mbps | 5 Мбит/с | 3 000 ₸ |
| tariff-10mbps | 10 Мбит/с | 4 500 ₸ |
| tariff-15mbps | 15 Мбит/с | 6 000 ₸ |
| tariff-25mbps | 25 Мбит/с | 8 500 ₸ |

**Скидки при оплате на несколько месяцев:**
- 3 месяца: −7%
- 6 месяцев: −13%

## MikroTik интеграция

Формат comment для PPPoE секретов: `expire:2026-02-28`

Скрипт `check-expiry-v2` на роутере проверяет даты каждую минуту.

При успешной оплате система автоматически:
1. Обновляет `expire:` дату в comment PPPoE секрета
2. Включает секрет если был отключён
3. Отправляет WebSocket уведомление клиенту

## Kaspi Pay

Зарегистрируйтесь как продавец на [kaspi.kz/biznes](https://kaspi.kz/biznes) и укажите в `.env`:
```
KASPI_MERCHANT_ID=ваш-merchant-id
KASPI_API_KEY=ваш-api-ключ
```

Webhook URL для настройки в Kaspi: `https://ваш-домен/api/kaspi/webhook/`

## Разработка без Docker

```bash
# Backend
cd backend
python -m venv venv
source venv/bin/activate
pip install -r requirements.txt
cp .env.example .env  # настроить DB на localhost
python manage.py migrate
python manage.py seed_clients
python manage.py runserver

# Frontend (в другом терминале)
cd frontend
npm install
npm run dev
```
