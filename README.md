# Jarvis Dashboard

Personal AI command center — PWA built with Next.js 14, Prisma, and Claude.

## Features

- 🤖 AI chat powered by Claude (Anthropic)
- 📁 Project-based chat isolation
- 📱 Installable PWA (add to home screen)
- 🔐 Single-user password auth
- 🌙 Dark command-center UI

## Quick Start (Local Dev)

```bash
# Install dependencies
npm install

# Set up environment
cp .env.example .env
# Edit .env with your values

# Run DB migrations
psql $DATABASE_URL -f prisma/migrations/20240101_init/migration.sql

# Start dev server
npm run dev
```

## Deployment (Docker / Dokploy)

### Environment Variables

| Variable | Description |
|---|---|
| `DATABASE_URL` | PostgreSQL connection string |
| `ANTHROPIC_API_KEY` | Your Anthropic API key |
| `DASHBOARD_PASSWORD` | Login password |
| `SESSION_SECRET` | Random 32+ char string for cookie encryption |

### Docker

```bash
docker build -t jarvis-dashboard .
docker run -p 3000:3000 \
  -e DATABASE_URL=postgresql://jarvis:pass@db:5432/jarvis \
  -e ANTHROPIC_API_KEY=sk-ant-... \
  -e DASHBOARD_PASSWORD=yourpassword \
  -e SESSION_SECRET=your-very-long-random-secret \
  jarvis-dashboard
```

### Dokploy

1. Create a new app in Dokploy pointing to this repo
2. Set the environment variables above
3. Make sure your PostgreSQL service hostname is used in DATABASE_URL (e.g. `jarvis-db` if that's the service name)
4. Deploy — the container runs migrations automatically on startup

### Database Setup

The container runs `scripts/migrate.mjs` on startup which applies `prisma/migrations/20240101_init/migration.sql`.

For a fresh PostgreSQL instance, just ensure the database and user exist:

```sql
CREATE USER jarvis WITH PASSWORD 'JarvisDB2026x';
CREATE DATABASE jarvis OWNER jarvis;
```

## PWA Installation

Visit the dashboard on mobile → "Add to Home Screen" from the browser menu.
