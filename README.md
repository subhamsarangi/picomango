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
4. Set **Start Command**: `python manage.py migrate --noinput && gunicorn core.wsgi:application`.
5. Add Environment Variables:
   - `DATABASE_URL`: Your Postgres URL.
   - `ENVIRONMENT`: `production`.
   - `CLOUDINARY_*`: For image storage.
   The Start Command applies database migrations automatically before launching the server.

### Frontend (Vercel)
1. Create a project on Vercel.
2. Set **Root Directory** to `frontend`.
3. Vercel will auto-detect Vite.
4. `frontend/vercel.json` rewrites direct route requests to the SPA entry point, so React Router paths work on refresh.
5. Add Environment Variable:
   - `VITE_API_URL`: Your Render backend URL (e.g., `https://api.picomango.com/api/`).

### Migrate one user to production
From `backend`, keep `ENVIRONMENT=development` so the source remains local SQLite, and configure `DATABASE_URL` or `NEON_DB_URL` with the production PostgreSQL URL. The command performs a dry run by default:

```bash
python migrate_user_to_prod.py --email user@example.com
python migrate_user_to_prod.py --email user@example.com --apply
```

The script copies the account if it is not already in production, plus that user's templates and items. It does not overwrite conflicting production records. Image and thumbnail URLs are copied; the files themselves remain in Cloudinary.

## Running Tests

```bash
cd backend
uv run python manage.py test api --keepdb
```

