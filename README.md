# Picomango

A secure local full-stack web application for managing LLM-generated images and their associated prompts. It features a unique, immutable prompt template system with typed placeholders to organize image metadata and generation templates reliably.

## Running the Application

### Backend (Django + DRF)
```bash
cd backend
# UV will automatically use the virtual environment
uv run python manage.py test api --keepdb

uv run python manage.py runserver
```

### Frontend (React + TypeScript) - *Coming Soon*
```bash
cd frontend
npm run dev
```

## Running Tests

```bash
cd backend
# Use --keepdb to reuse the Neon test database and skip slow migrations
uv run python manage.py test api --keepdb
```

> **Note:** The first run (or after schema changes) you must omit `--keepdb` so Django recreates the test database. Type `yes` when prompted to drop the old one.
