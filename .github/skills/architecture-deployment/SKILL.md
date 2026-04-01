---
name: architecture-deployment
description: >-
  Docker containerization, multi-stage builds, standalone output, docker-compose with
  Postgres, deployment checklist. Use when containerizing the app, setting up Docker,
  or preparing for deployment.
---

# Architecture — Docker & Deployment Patterns

**Compiled from**: ADR-0001 §Deployment
**Last synced**: 2026-02-28

---

## Approach Options

| Option              | When To Use                                                |
| ------------------- | ---------------------------------------------------------- |
| Vercel              | Default / new project, edge computing, preview PRs         |
| Docker (standalone) | Self-hosted, specific cloud, compliance, cost optimization |

## Vercel

```bash
pnpm dlx vercel
```

## Docker

### next.config.js

```javascript
const nextConfig = { output: 'standalone' }
module.exports = nextConfig
```

### Dockerfile

```dockerfile
FROM node:20-alpine AS base
FROM base AS deps
WORKDIR /app
COPY package.json pnpm-lock.yaml ./
RUN corepack enable && pnpm install --frozen-lockfile
FROM base AS builder
WORKDIR /app
COPY --from=deps /app/node_modules ./node_modules
COPY . .
RUN corepack enable && pnpm build
FROM base AS runner
WORKDIR /app
ENV NODE_ENV=production
RUN addgroup --system --gid 1001 nodejs
RUN adduser --system --uid 1001 nextjs
COPY --from=builder /app/.next/standalone ./
COPY --from=builder /app/.next/static ./.next/static
COPY --from=builder /app/public ./public
USER nextjs
EXPOSE 3000
ENV PORT=3000 HOSTNAME="0.0.0.0"
CMD ["node", "server.js"]
```

### Docker Compose (with Database)

```yaml
services:
  db:
    image: postgres:16-alpine
    environment:
      POSTGRES_USER: postgres
      POSTGRES_PASSWORD: postgres
      POSTGRES_DB: myapp
    ports: ['5432:5432']
    volumes: [postgres_data:/var/lib/postgresql/data]
    healthcheck:
      test: ['CMD-SHELL', 'pg_isready -U postgres']
      interval: 5s
      timeout: 5s
      retries: 5
  app:
    build: { context: ., dockerfile: Dockerfile }
    ports: ['3000:3000']
    environment:
      DATABASE_URL: postgresql://postgres:postgres@db:5432/myapp
      AUTH_SECRET: local-dev-secret-minimum-32-chars-long
      NODE_ENV: production
    depends_on: { db: { condition: service_healthy } }
volumes:
  postgres_data:
```

### .dockerignore

```
node_modules
.next
.git
.github
docs
tests
*.md
.env*.local
.husky
.eslintcache
```

## Deployment Checklist

- [ ] `output: 'standalone'` in `next.config.js`
- [ ] `.dockerignore` excludes heavy folders
- [ ] Dockerfile runs as non-root user (`nextjs`)
- [ ] Env vars injected at runtime (not baked in)
- [ ] `NEXT_PUBLIC_*` vars baked at build time
- [ ] Database migrations run before deploy
- [ ] Health check endpoint at `/api/health`
- [ ] Container resource limits set
