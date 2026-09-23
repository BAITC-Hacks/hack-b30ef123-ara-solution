# HackAlem replenishment MVP

Сервис готовит объяснимые рекомендации по пополнению запасов для IEK и Systeme Electric. Менеджер выбирает поставщика и параметры расчёта, затем видит рекомендуемое количество по SKU, срочность и расшифровку формулы.

## Что реализовано

- FastAPI endpoint `POST /api/v1/replenishment/calculate` и `GET /health`.
- React/Vite экран с параметрами расчёта, состояниями загрузки и ошибками.
- Детерминированный расчёт: фильтрация крупной синтетической покупки одного клиента, базовый спрос, сезонность, тренд, demo-stockout, остаток, товар в пути и округление до кратности.
- Синтетический demo-набор без партнёрских или клиентских данных.
- Ручная корректировка количества и CSV-экспорт только после явного подтверждения в интерфейсе.
- Backend-тесты и frontend build.

## Ограничения MVP

- Реальные Excel-файлы ещё не импортируются: они остаются read-only источниками.
- В доступных данных нет customer ID, подтверждённых stockout-периодов и единого supplier lead time. Customer-level outlier detection доказан только на синтетическом fixture, а stockout и lead time пока являются явными demo-параметрами.
- Приложение не отправляет заказы поставщикам и не сохраняет пользовательские правки. SQLite запланирован для следующего инкремента.

## Структура

```text
api/                 OpenAPI-контракт
backend/             FastAPI и тесты
frontend/            React/Vite клиент
data/demo/           синтетические fixtures
docs/data-contract.md описание реальных Excel-источников
IEK/, Systeme electric/ read-only исходные Excel-файлы без дублирующих вложенных копий
docs/reference/       исходное ТЗ и контекст планирования проекта
```

## Локальный запуск

Требуется Python 3.14+, Node.js 24+ и npm.

```powershell
Copy-Item .env.example .env
py -m venv backend/.venv
backend/.venv/Scripts/python.exe -m pip install -r backend/requirements.txt
backend/.venv/Scripts/python.exe -m uvicorn app.main:app --app-dir backend --reload --port 8000
```

Во втором терминале:

```powershell
Set-Location frontend
npm.cmd install
npm.cmd run dev
```

Откройте `http://localhost:5173`.

## Docker

```powershell
Copy-Item .env.example .env
docker compose up --build
```

После запуска: frontend — `http://localhost:5173`, API — `http://localhost:8000`, healthcheck — `http://localhost:8000/health`, Swagger UI — `http://localhost:8000/docs`.

Docker Desktop не установлен в текущем окружении разработки, поэтому этот путь нужно отдельно проверить после его установки.

## Проверки

```powershell
backend/.venv/Scripts/python.exe -m pytest backend/tests -q
Set-Location frontend
npm.cmd run build
```

Критерии проверки MVP находятся в `docs/acceptance-tests.md`, а формат API — в `api/openapi.yaml`.
