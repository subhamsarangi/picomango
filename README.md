# Picomango

A secure full-stack web application for managing LLM-generated images and their associated prompts. Features an immutable prompt template system with typed placeholders.

## Project Structure

This is a monorepo containing both the frontend and backend:
- `/frontend`: React + Vite + TypeScript
- `/backend`: Django + DRF + uv

## Local Development

### Backend
```bash
cd backend
uv run python manage.py runserver
```

### Frontend
```bash
cd frontend
npm install
npm run dev
```

## Deployment

This project is designed to be deployed separately using the **Root Directory** feature.

### Backend (Render)
1. Create a **Web Service** on Render.
2. Set **Root Directory** to `backend`.
3. Set **Build Command**: `uv export -f requirements.txt -o requirements.txt && pip install -r requirements.txt` (or just `pip install -r requirements.txt` if file exists).
4. Set **Start Command**: `gunicorn core.wsgi:application`.
5. Add Environment Variables:
   - `DATABASE_URL`: Your Postgres URL.
   - `ENVIRONMENT`: `production`.
   - `CLOUDINARY_*`: For image storage.

### Frontend (Vercel)
1. Create a project on Vercel.
2. Set **Root Directory** to `frontend`.
3. Vercel will auto-detect Vite.
4. Add Environment Variable:
   - `VITE_API_URL`: Your Render backend URL (e.g., `https://api.picomango.com/api/`).

## Running Tests

```bash
cd backend
uv run python manage.py test api --keepdb
```

