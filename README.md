# Agro Jabar API

Production-ready REST API backend for the Agro Jabar platform, built with NestJS inside a Turborepo monorepo.

## Tech Stack

| Category         | Technology              |
| ---------------- | ----------------------- |
| Framework        | NestJS                  |
| Language         | TypeScript              |
| Database         | PostgreSQL + Prisma ORM |
| Cache / Queue    | Redis + BullMQ          |
| Authentication   | JWT + Passport          |
| Validation       | class-validator         |
| API Docs         | Swagger (OpenAPI)       |
| Logging          | Winston                 |
| Error Monitoring | Sentry                  |
| Metrics          | Prometheus + Grafana    |
| Testing          | Jest                    |
| Containerization | Docker                  |
| Reverse Proxy    | Nginx                   |
| CI/CD            | GitHub Actions          |

## Getting Started

### Prerequisites

- Node.js >= 18
- PostgreSQL running on port 5432
- Redis running on port 6379

### Installation

```bash
# From monorepo root
npm install

# Generate Prisma client
cd apps/api
npx prisma generate

# Run database migrations
npx prisma migrate dev

# Seed database (optional)
npm run prisma:seed
```

### Development

```bash
# From monorepo root
npm run dev:api

# Or from apps/api
npm run dev
```

The API will start at `http://localhost:4000`.

Swagger docs available at `http://localhost:4000/api/docs`.

### Testing

```bash
# Unit tests
npm run test

# Test with coverage
npm run test:cov

# E2E tests
npm run test:e2e
```

### Docker

```bash
# Start all services (PostgreSQL, Redis, API, Nginx, Prometheus, Grafana)
npm run docker:up

# Stop all services
npm run docker:down
```

## Project Structure

```
apps/api/
├── src/
│   ├── main.ts                  # Bootstrap + global settings
│   ├── app.module.ts            # Root module
│   ├── config/                  # Configuration factories
│   ├── common/                  # Decorators, guards, filters, interceptors, pipes, utils
│   ├── infrastructure/          # Database, cache, queue, logger, monitoring, error-tracking
│   ├── modules/                 # Feature modules (auth, users, etc.)
│   ├── docs/                    # Swagger configuration
│   └── tests/                   # Unit and E2E tests
├── prisma/                      # Prisma schema, migrations, seed
├── docker/                      # Dockerfile, docker-compose
├── nginx/                       # Nginx configuration
└── .env                         # Environment variables
```

## API Endpoints

| Method | Endpoint           | Description         | Auth     |
| ------ | ------------------ | ------------------- | -------- |
| POST   | /api/auth/register | Register a new user | No       |
| POST   | /api/auth/login    | Login               | No       |
| GET    | /api/auth/profile  | Get current user    | Bearer   |
| GET    | /api/users         | List all users      | Admin    |
| POST   | /api/users         | Create a user       | Admin    |
| GET    | /api/users/:id     | Get user by ID      | Bearer   |
| PATCH  | /api/users/:id     | Update user         | Admin    |
| DELETE | /api/users/:id     | Delete user         | Admin    |
| GET    | /api/health        | Health check        | No       |
| GET    | /api/metrics       | Prometheus metrics  | Internal |

## User Roles

| Role              | Description                 |
| ----------------- | --------------------------- |
| `ADMIN`           | Full system access          |
| `FARMER`          | Farmer operations           |
| `WAREHOUSE_STAFF` | Warehouse management        |
| `CUSTOMER`        | Consumer / buyer operations |

## Environment Variables

See `.env.example` for the full list of available environment variables.

## Monitoring

- **Prometheus**: `http://localhost:9090` (via Docker)
- **Grafana**: `http://localhost:3000` (via Docker, admin/admin)
- **API Health**: `GET /api/health`
- **API Metrics**: `GET /api/metrics`
