# DataHub — Containerized Full-Stack App

A production-style full-stack application containerized with Docker.

## Architecture

```
Browser
  │
  ▼ :80
┌─────────────────────────────────────────┐
│          Nginx (Reverse Proxy)          │
│   /api/*  → backend:3000                │
│   /*      → frontend:80                 │
└──────────┬──────────────────┬───────────┘
           │                  │
     ┌─────▼──────┐   ┌───────▼──────┐
     │  Node.js   │   │    Static    │
     │  Backend   │   │   Frontend   │
     │  (Express) │   │   (Nginx)    │
     └─────┬──────┘   └──────────────┘
           │
     ┌─────▼──────┐
     │ PostgreSQL │
     │   :5432    │
     └────────────┘
```

## Quick Start

```bash
# Build and start all containers
docker compose up --build -d

# View logs
docker compose logs -f

# Stop all
docker compose down

# Remove volumes (wipes DB)
docker compose down -v
```

## Services

| Service    | Image              | Port (internal) | Exposed |
|------------|--------------------|-----------------|---------|
| postgres   | postgres:15-alpine | 5432            | No      |
| backend    | custom (node:20)   | 3000            | No      |
| frontend   | custom (nginx)     | 80              | No      |
| nginx      | custom (nginx)     | 80              | **:80** |

## API Endpoints

| Method | Path               | Description           |
|--------|--------------------|-----------------------|
| GET    | /api/health        | DB health check       |
| GET    | /api/stats         | Overview stats        |
| GET    | /api/employees     | All employees         |
| GET    | /api/products      | All products          |
| GET    | /api/orders        | All orders (joined)   |
| GET    | /api/departments   | Department breakdown  |

## Stack

- **Frontend**: Vanilla HTML/CSS/JS (dark glassmorphism UI)
- **Backend**: Node.js 20 + Express
- **Database**: PostgreSQL 15 with seed data
- **Proxy**: Nginx 1.25 (routes, compression, security headers)
- **Orchestration**: Docker Compose v3.9
